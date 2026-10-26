/**
 * Gameplay-facing car object: model, arcade simulation, surface sampling, and
 * checkpoint crossing in one small orchestration layer.
 *
 * Game calls fixedUpdate() at 60 Hz and updateRender(alpha) once per frame.
 * The split is what makes motion independent of monitor refresh rate: physics
 * only ever sees identical steps, and the model is drawn between the last two
 * simulation states.
 */
import { Vector3 } from 'three';
import { CAR } from '../config/car.config.js';
import { COLLISION } from '../config/collision.config.js';
import { TrackSurface } from '../track/TrackSurface.js';
import { clamp, damp, lerp, lerpAngle } from '../utils/math.js';
import { CollisionWorld } from '../world/CollisionWorld.js';
import { CarModel } from './CarModel.js';
import { CarPhysics } from './CarPhysics.js';

export class ToyF1Car {
  constructor({
    trackPath,
    textures,
    checkpoints,
    bus,
    maxDynamicLights = null,
  }) {
    this.trackPath = trackPath;
    this.checkpoints = checkpoints ?? null;
    this.bus = bus ?? null;

    // Reserve one of the mobile light slots for the desk lamp, then spend the
    // rest on headlights. Desktop leaves the count alone.
    const headlightCount =
      maxDynamicLights === null
        ? undefined
        : Math.max(1, maxDynamicLights - 1);
    this.model = new CarModel(textures, { headlightCount });
    this.group = this.model.group;
    this.mounts = this.model.mounts;
    this.helmet = this.model.helmet;
    this.visor = this.model.visor;

    this.physics = new CarPhysics({ bus });
    this.collision = new CollisionWorld();
    this.collisionCooldown = 0;
    this.collisionEvent = {
      strength: 0,
      impact: 0,
      normalX: 0,
      normalZ: 0,
      x: 0,
      y: 0,
      z: 0,
    };
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

  fixedUpdate(dt, input) {
    if (!(dt > 0)) return;

    // Use the surface under the car at the start of the step for grip/drag,
    // then resample at the new position for height and the ramp pitch.
    this.surface.sample(
      this.physics.position.x,
      this.physics.position.z,
      this.surfaceResult,
    );
    this.physics.update(dt, input, this.surfaceResult);

    // Resolve after integration: walls clamp the centre and furniture pushes
    // along its nearest face, then the reflected world velocity is decomposed
    // back into forward and lateral speed for the next physics step.
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);
    const hit = this.collision.resolve(
      this.physics.position,
      this.physics.velocity,
      this.physics.heading,
    );
    if (hit) {
      this.physics.applyContact();

      if (
        hit.impact >= COLLISION.impactThreshold &&
        this.collisionCooldown <= 0
      ) {
        this.collisionCooldown = COLLISION.eventCooldown;
        const event = this.collisionEvent;
        event.strength = clamp(hit.impact / CAR.physics.maxSpeed, 0, 1.4);
        event.impact = hit.impact;
        event.normalX = hit.normalX;
        event.normalZ = hit.normalZ;
        event.x = this.physics.position.x;
        event.y = this.physics.position.y;
        event.z = this.physics.position.z;
        this.bus?.emit('car:collide', event);
      }
    }

    this.surface.sample(
      this.physics.position.x,
      this.physics.position.z,
      this.surfaceResult,
    );
    this.physics.position.y = this.surfaceResult.height;

    const probe = CAR.dimensions.groundProbe;
    const forwardX = -Math.sin(this.physics.heading);
    const forwardZ = -Math.cos(this.physics.heading);
    this.surface.sample(
      this.physics.position.x + forwardX * probe,
      this.physics.position.z + forwardZ * probe,
      this.surfaceAhead,
    );
    this.surface.sample(
      this.physics.position.x - forwardX * probe,
      this.physics.position.z - forwardZ * probe,
      this.surfaceBehind,
    );

    const targetPitch =
      this.surfaceResult.onTrack &&
      this.surfaceAhead.onTrack &&
      this.surfaceBehind.onTrack
        ? Math.atan2(
            this.surfaceAhead.height - this.surfaceBehind.height,
            probe * 2,
          )
        : 0;
    this.physics.groundPitch = damp(
      this.physics.groundPitch,
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
    this.collisionCooldown = 0;
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
