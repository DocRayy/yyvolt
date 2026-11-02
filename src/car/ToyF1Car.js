/**
 * Gameplay-facing car object: model, arcade simulation, surface sampling, wall
 * collision, and checkpoint crossing in one small orchestration layer.
 *
 * Game calls fixedUpdate() at 60 Hz and updateRender(alpha) once per frame.
 * The split is what makes motion independent of monitor refresh rate: physics
 * only ever sees identical steps, and the model is drawn between the last two
 * simulation states.
 *
 * Since V2 the car can never leave the track. TrackCollider clamps it inside
 * the ribbon every substep and owns the 'car:collide' event; this class only
 * has to keep the model, the surface height, and the checkpoint sweep in sync.
 */
import { Vector3 } from 'three';
import { CAR, CAR_WIDTH } from '../config/car.config.js';
import { CARS } from '../config/cars.config.js';
import { TrackSurface } from '../track/TrackSurface.js';
import { damp, lerp, lerpAngle } from '../utils/math.js';
import { CarFactory, loadCarConfig, saveCarConfig } from './CarFactory.js';
import { CarPhysics } from './CarPhysics.js';

export class ToyF1Car {
  constructor({
    trackPath,
    textures,
    checkpoints,
    collider,
    bus,
    maxDynamicLights = null,
    typeId = null,
    colorId = null,
  }) {
    this.trackPath = trackPath;
    this.checkpoints = checkpoints ?? null;
    this.collider = collider ?? null;
    this.bus = bus ?? null;

    // Reserve one of the mobile light slots for the desk lamp, then spend the
    // rest on headlights. Desktop leaves the count alone.
    const headlightCount =
      maxDynamicLights === null
        ? undefined
        : Math.max(1, maxDynamicLights - 1);

    // The saved {type, color} picks the model and the multipliers. The
    // defaults are F1 + yellow; the read is wrapped in try/catch so a missing
    // or corrupt save still leaves the game running.
    const saved = loadCarConfig();
    this.typeId = typeId ?? saved.type;
    this.colorId = colorId ?? saved.color;
    this.model = new CarFactory(textures).create(this.typeId, this.colorId);
    this.group = this.model.group;
    this.mounts = this.model.mounts;
    this.helmet = this.model.helmet;
    this.visor = this.model.visor;

    const base = CAR.physics;
    const car = CARS[this.typeId] ?? CARS.F1;
    const physics = {
      ...base,
      maxSpeed: base.maxSpeed * car.maxSpeed,
      engineAcceleration: base.engineAcceleration * car.accel,
      steerMax: base.steerMax * car.steer,
      grip: base.grip * car.grip,
      boostAcceleration: base.boostAcceleration * car.boost,
    };
    this.physics = new CarPhysics({ bus, physics });
    this.surface = new TrackSurface(trackPath);
    this.surfaceResult = this.surface.createResult();
    this.surfaceAhead = this.surface.createResult();
    this.surfaceBehind = this.surface.createResult();

    this.frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };
    this.wrongWay = false;

    trackPath.getFrameAt(0, this.frame);
    this.respawn(this.frame.position, this.frame.tangent);
  }

  /**
   * Split the fixed step so the collider never resolves more than half a car
   * width of travel at once. At the current top speed one substep is enough;
   * the guard is what keeps the wall unjumpable if the tuning gets faster.
   */
  substepCount(dt) {
    const speed = Math.hypot(this.physics.velocity.x, this.physics.velocity.z);
    const budget = CAR_WIDTH / 2;
    const travel = speed * dt;
    return travel <= budget ? 1 : Math.min(3, Math.ceil(travel / budget));
  }

  fixedUpdate(dt, input) {
    if (!(dt > 0)) return;

    const physics = this.physics;
    const steps = this.substepCount(dt);
    const step = dt / steps;

    // Remember the state at the start of the fixed step. With more than one
    // substep, physics.update() would otherwise leave previous* pointing at the
    // last substep, and render interpolation plus the checkpoint sweep would
    // lose the start of the step.
    const startX = physics.position.x;
    const startY = physics.position.y;
    const startZ = physics.position.z;
    const startHeading = physics.heading;
    const startSteering = physics.steering;
    const startWheelSpin = physics.wheelSpin;
    const startGroundPitch = physics.groundPitch;

    for (let i = 0; i < steps; i += 1) {
      physics.update(step, input);
      const hit = this.collider?.resolve(
        physics.position,
        physics.velocity,
        step,
      );
      if (hit) physics.applyContact();
    }

    physics.previousPosition.set(startX, startY, startZ);
    physics.previousHeading = startHeading;
    physics.previousSteering = startSteering;
    physics.previousWheelSpin = startWheelSpin;
    physics.previousGroundPitch = startGroundPitch;

    this.surface.sample(
      physics.position.x,
      physics.position.z,
      this.surfaceResult,
    );
    physics.position.y = this.surfaceResult.height;

    const probe = CAR.dimensions.groundProbe;
    const forwardX = -Math.sin(physics.heading);
    const forwardZ = -Math.cos(physics.heading);
    this.surface.sample(
      physics.position.x + forwardX * probe,
      physics.position.z + forwardZ * probe,
      this.surfaceAhead,
    );
    this.surface.sample(
      physics.position.x - forwardX * probe,
      physics.position.z - forwardZ * probe,
      this.surfaceBehind,
    );

    const targetPitch = Math.atan2(
      this.surfaceAhead.height - this.surfaceBehind.height,
      probe * 2,
    );
    physics.groundPitch = damp(
      physics.groundPitch,
      targetPitch,
      CAR.physics.groundPitchLambda,
      dt,
    );

    this.updateCheckpoints();
  }

  updateRender(alpha, dt) {
    const p = this.physics;
    const groundPitch = lerp(
      p.previousGroundPitch,
      p.groundPitch,
      alpha,
    );

    this.group.position.set(
      lerp(p.previousPosition.x, p.position.x, alpha),
      lerp(p.previousPosition.y, p.position.y, alpha),
      lerp(p.previousPosition.z, p.position.z, alpha),
    );
    this.group.rotation.set(
      groundPitch,
      lerpAngle(p.previousHeading, p.heading, alpha),
      0,
    );

    this.model.setSteering(lerp(p.previousSteering, p.steering, alpha));
    this.model.setWheelSpin(lerp(p.previousWheelSpin, p.wheelSpin, alpha));
    this.model.updateBody(dt, p);
    this.model.setBraking(p.braking);
  }

  /** Put the car back on a checkpoint gate, pointing down the racing line. */
  respawn(position, tangent) {
    const heading = Math.atan2(-tangent.x, -tangent.z);
    this.physics.reset(position, heading);
    this.collider?.reset();
    this.surface.sample(position.x, position.z, this.surfaceResult);
    this.physics.position.y = this.surfaceResult.height;
    this.physics.previousPosition.copy(this.physics.position);
    this.physics.groundPitch = 0;
    this.physics.previousGroundPitch = 0;
    this.model.resetBody();

    if (this.wrongWay) {
      this.wrongWay = false;
      this.bus?.emit('wrongway:changed', { wrongWay: false });
    }

    this.updateRender(0, 0);
  }

  setNightFactor(mix) {
    this.model.setNightFactor(mix);
  }

  updateCheckpoints() {
    if (!this.checkpoints) return;

    const result = this.checkpoints.update(
      this.physics.previousPosition,
      this.physics.position,
    );

    if (result.checkpoint >= 0) {
      this.bus?.emit('checkpoint:passed', {
        checkpoint: result.checkpoint,
        nextIndex: result.nextIndex,
        passed: this.checkpoints.passed,
      });
    }
    if (result.lapComplete) {
      this.bus?.emit('lap:complete', {
        lap: result.lap,
        nextIndex: result.nextIndex,
      });
    }

    const wrongWay = this.checkpoints.isWrongWay(this.physics.velocity);
    if (wrongWay !== this.wrongWay) {
      this.wrongWay = wrongWay;
      this.bus?.emit('wrongway:changed', { wrongWay });
      if (wrongWay) {
        this.bus?.emit('ui:toast', {
          message: 'Wrong way. Turn around.',
          tone: 'warning',
        });
      }
    }
  }
}
