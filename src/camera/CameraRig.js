/**
 * Owns the one real PerspectiveCamera and every camera mode.
 *
 * A switch captures the current camera pose, asks the new mode for its target
 * pose each frame, and eases position, quaternion, and FOV over
 * CAMERA_BLEND_SECONDS. Keys come from controls.config.js through the input
 * action event, so the bindings panel and camera rig can never disagree.
 */
import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import {
  CAMERA_BLEND_SECONDS,
  CAMERA_BY_ID,
  CAMERA_LIMITS,
  CAMERA_MODES,
  CAMERA_SHAKE,
  DEFAULT_CAMERA_ID,
  MENU_CAMERA,
} from '../config/cameras.config.js';
import { BINDING_BY_ACTION } from '../config/controls.config.js';
import { smoothstep } from '../utils/math.js';
import { CameraCarState } from './CameraCarState.js';
import { CameraShake } from './CameraShake.js';
import { AerialCamera } from './modes/AerialCamera.js';
import { BroadcastCamera } from './modes/BroadcastCamera.js';
import { ChaseCamera } from './modes/ChaseCamera.js';
import { CockpitCamera } from './modes/CockpitCamera.js';
import { NoseCamera } from './modes/NoseCamera.js';
import { TCamCamera } from './modes/TCamCamera.js';
import { WheelCamera } from './modes/WheelCamera.js';

function createPose() {
  return {
    position: new Vector3(),
    quaternion: new Quaternion(),
    fov: 60,
  };
}

export class CameraRig {
  constructor({ car, bus, blockers = [], room = null }) {
    if (!car) throw new Error('CameraRig needs a car.');

    this.car = car;
    this.bus = bus ?? null;
    this.room = room;
    this.ceilingRestoreDelay = 0;

    this.camera = new PerspectiveCamera(
      CAMERA_BY_ID[DEFAULT_CAMERA_ID].fov,
      1,
      CAMERA_LIMITS.near,
      CAMERA_LIMITS.far,
    );
    this.camera.name = 'YYVOLT camera';

    this.modes = {
      cockpit: new CockpitCamera(CAMERA_BY_ID.cockpit, { car }),
      tcam: new TCamCamera(CAMERA_BY_ID.tcam),
      nose: new NoseCamera(CAMERA_BY_ID.nose),
      chase: new ChaseCamera(CAMERA_BY_ID.chase, { blockers }),
      wheel: new WheelCamera(CAMERA_BY_ID.wheel),
      broadcast: new BroadcastCamera(CAMERA_BY_ID.broadcast, { blockers }),
      aerial: new AerialCamera(CAMERA_BY_ID.aerial),
    };
    this.order = CAMERA_MODES.map((mode) => mode.id).filter(
      (id) => this.modes[id],
    );

    this.carState = new CameraCarState(car);
    this.shake = new CameraShake(CAMERA_SHAKE);

    // Shadow camera: follows the car with a small frustum for tight shadow
    // mapping. The key light's shadow camera is a child of the car.
    this.shadowCamera = new PerspectiveCamera(
      CAMERA_BY_ID.chase.fov,
      1,
      0.03,
      30,
    );
    this.shadowCamera.name = 'Shadow camera';
    this.shadowCamera.position.set(0, 0.3, 0);
    this.shadowCamera.target = new Vector3(0, 0, 0);

    this.fromPose = createPose();
    this.targetPose = createPose();
    this.outputPose = createPose();

    this.currentMode = null;
    this.currentId = null;
    this.activeMode = null;
    this.targetMode = null;
    this.blending = false;
    this.blendElapsed = 0;

    // The menu uses a slow orbit instead of a gameplay mode. It is a separate
    // path so race cameras never need to know that a menu exists.
    this.menuDriftActive = false;
    this.menuElapsed = 0;
    this.menuLookTarget = new Vector3();
    this.menuLookMatrix = new Matrix4();
    this.menuPosition = new Vector3();
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

    this.unsubscribeAction = this.bus?.on(
      'input:action',
      this.handleAction,
    );
    this.unsubscribeCollision = this.bus?.on(
      'car:collide',
      this.handleCollision,
    );
    this.unsubscribeCycle = this.bus?.on('camera:cycle', () => this.cycle());

    this.select(DEFAULT_CAMERA_ID, { instant: true, announce: false });
  }

  /** Blend to a registered camera id. Re-selecting the current one is a no-op. */
  select(id, { instant = false, announce = true } = {}) {
    const mode = this.modes[id];
    if (!mode || id === this.currentId) return false;

    const leavingAerial = this.currentId === 'aerial' && id !== 'aerial';
    this.currentMode?.exit();

    // The aerial camera lives above the ceiling. Hide it before the wide shot
    // starts, and only restore it after the exit blend has brought the lens
    // back inside the room.
    if (id === 'aerial') {
      this.room?.setCeilingVisible(false);
      this.ceilingRestoreDelay = 0;
    } else if (leavingAerial) {
      this.ceilingRestoreDelay = instant ? 0 : CAMERA_BLEND_SECONDS;
      if (instant) this.room?.setCeilingVisible(true);
    }

    if (!instant) {
      this.fromPose.position.copy(this.camera.position);
      this.fromPose.quaternion.copy(this.camera.quaternion);
      this.fromPose.fov = this.camera.fov;
      this.blendElapsed = 0;
    }

    this.currentMode = mode;
    this.currentId = id;
    mode.enter();

    if (instant) {
      this.car.group.updateMatrixWorld(true);
      this.carState.update();
      mode.update(0, this.carState, this.targetPose);
      this.targetPose.fov += this.portraitFovBoost();
      this.copyPose(this.outputPose, this.targetPose);
      this.activeMode = mode;
      this.targetMode = null;
      this.blending = false;
      this.applyPose(this.outputPose);
    } else {
      this.activeMode = null;
      this.targetMode = mode;
      this.blending = true;
    }

    this.emitChange(mode, announce);
    return true;
  }

  cycle() {
    if (this.order.length === 0) return;
    const index = this.order.indexOf(this.currentId);
    const next = this.order[(index + 1) % this.order.length];
    this.select(next);
  }

  /**
   * Enter or leave the slow menu orbit. Leaving eases back into the selected
   * race camera, so the start countdown does not cut from a wide room shot to a
   * low chase view.
   */
  setMenuDrift(active) {
    if (active === this.menuDriftActive) return;

    if (active) {
      this.menuDriftActive = true;
      this.menuElapsed = 0;
      this.blending = false;
      this.activeMode = null;
      this.targetMode = null;
      return;
    }

    this.menuDriftActive = false;
    if (!this.currentMode) return;

    this.fromPose.position.copy(this.camera.position);
    this.fromPose.quaternion.copy(this.camera.quaternion);
    this.fromPose.fov = this.camera.fov;
    this.blendElapsed = 0;
    this.activeMode = null;
    this.targetMode = this.currentMode;
    this.blending = true;
  }

  updateMenuDrift(dt) {
    if (!this.reducedMotion) this.menuElapsed += dt;

    const angle = MENU_CAMERA.startAngle + this.menuElapsed * MENU_CAMERA.speed;
    this.menuPosition.set(
      MENU_CAMERA.centerX + Math.cos(angle) * MENU_CAMERA.radiusX,
      MENU_CAMERA.height,
      MENU_CAMERA.centerZ + Math.sin(angle) * MENU_CAMERA.radiusZ,
    );
    this.menuLookTarget.set(
      MENU_CAMERA.centerX,
      MENU_CAMERA.lookHeight,
      MENU_CAMERA.centerZ,
    );
    this.menuLookMatrix.lookAt(
      this.menuPosition,
      this.menuLookTarget,
      this.camera.up,
    );

    this.targetPose.position.copy(this.menuPosition);
    this.targetPose.quaternion.setFromRotationMatrix(this.menuLookMatrix);
    this.targetPose.fov = MENU_CAMERA.fov + this.portraitFovBoost();
    this.copyPose(this.outputPose, this.targetPose);
    this.applyPose(this.outputPose);
  }

  update(dt) {
    if (this.ceilingRestoreDelay > 0) {
      this.ceilingRestoreDelay -= dt;
      if (this.ceilingRestoreDelay <= 0) {
        this.ceilingRestoreDelay = 0;
        this.room?.setCeilingVisible(true);
      }
    }

    if (this.menuDriftActive) {
      this.updateMenuDrift(dt);
      return;
    }

    if (!this.car) return;

    this.car.group.updateMatrixWorld(true);
    this.carState.update();

    // Shadow camera follows the car with a small frustum.
    const carPos = this.car.group.position;
    this.shadowCamera.position.set(carPos.x, 0.3 + carPos.y, carPos.z + 0.3);
    this.shadowCamera.target.copy(carPos);
    this.shadowCamera.updateProjectionMatrix();

    const mode = this.targetMode ?? this.activeMode;
    if (!mode) return;

    mode.update(dt, this.carState, this.targetPose);
    this.targetPose.fov += this.portraitFovBoost();

    if (this.blending) {
      this.blendElapsed += dt;
      const t = smoothstep(0, 1, this.blendElapsed / CAMERA_BLEND_SECONDS);

      this.outputPose.position.lerpVectors(
        this.fromPose.position,
        this.targetPose.position,
        t,
      );
      this.outputPose.quaternion
        .copy(this.fromPose.quaternion)
        .slerp(this.targetPose.quaternion, t);
      this.outputPose.fov =
        this.fromPose.fov + (this.targetPose.fov - this.fromPose.fov) * t;

      if (this.blendElapsed >= CAMERA_BLEND_SECONDS) {
        this.blending = false;
        this.activeMode = this.currentMode;
        this.targetMode = null;
      }
    } else {
      this.copyPose(this.outputPose, this.targetPose);
    }

    this.shake.apply(dt, mode, this.carState, this.outputPose);
    this.applyPose(this.outputPose);
  }

  /** Jump the active mode to its target, used when R teleports the car. */
  snap() {
    if (!this.car || !this.currentMode) return;

    this.car.group.updateMatrixWorld(true);
    this.carState.update();
    this.currentMode.snap?.();
    this.currentMode.update(0, this.carState, this.targetPose);
    this.targetPose.fov += this.portraitFovBoost();

    this.blending = false;
    this.activeMode = this.currentMode;
    this.targetMode = null;
    this.copyPose(this.outputPose, this.targetPose);
    this.applyPose(this.outputPose);
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  portraitFovBoost() {
    return (
      Math.max(0, 1 - this.camera.aspect) *
      CAMERA_LIMITS.portraitFovBoost
    );
  }

  applyPose(pose) {
    this.camera.position.copy(pose.position);
    this.camera.quaternion.copy(pose.quaternion);

    if (Math.abs(this.camera.fov - pose.fov) > 0.001) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  copyPose(target, source) {
    target.position.copy(source.position);
    target.quaternion.copy(source.quaternion);
    target.fov = source.fov;
  }

  emitChange(mode, announce) {
    this.bus?.emit('camera:changed', {
      id: mode.id,
      name: mode.name,
      index: this.order.indexOf(mode.id),
      total: this.order.length,
    });

    if (announce) {
      this.bus?.emit('ui:toast', {
        message: `Camera: ${mode.name.toLowerCase()}`,
      });
    }
  }

  handleAction = ({ action }) => {
    if (action === 'camera.next') {
      this.cycle();
      return;
    }

    const binding = BINDING_BY_ACTION.get(action);
    if (!binding?.cameraId) return;
    this.select(binding.cameraId);
  };

  handleCollision = (payload) => {
    this.shake.impulse(payload?.strength);
  };

  dispose() {
    this.currentMode?.exit();
    this.currentMode = null;
    this.activeMode = null;
    this.targetMode = null;
    this.ceilingRestoreDelay = 0;
    this.menuDriftActive = false;
    this.room?.setCeilingVisible(true);
    this.unsubscribeAction?.();
    this.unsubscribeCollision?.();
    this.unsubscribeCycle?.();
    this.unsubscribeAction = null;
    this.unsubscribeCollision = null;
    this.unsubscribeCycle = null;
    this.shadowCamera = null;
  }
}
