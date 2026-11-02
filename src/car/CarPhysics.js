/**
 * Arcade car simulation on a 2D plane.
 *
 * There is no rigid-body engine here. The car keeps a world velocity, a yaw
 * heading, and a lateral slip speed. Engine and brake forces act along the old
 * heading; the new heading then defines a fresh forward/lateral split, and
 * lateral grip pulls the velocity back in line. That single idea produces
 * stable cornering normally, and a controllable slide when Space lowers grip.
 *
 * The simulation is render-rate independent because Game calls update() at a
 * fixed 60 Hz. All vectors are pre-allocated; the update loop creates nothing.
 */
import { Vector3 } from 'three';
import { CAR } from '../config/car.config.js';
import { clamp, damp } from '../utils/math.js';

export class CarPhysics {
  constructor({ bus, physics = CAR.physics } = {}) {
    this.bus = bus ?? null;
    this.physics = physics;

    this.position = new Vector3();
    this.previousPosition = new Vector3();
    this.velocity = new Vector3();

    this.heading = 0;
    this.previousHeading = 0;
    this.speed = 0;
    this.lateralSpeed = 0;
    this.steering = 0;
    this.previousSteering = 0;

    this.throttle = 0;
    this.brake = 0;
    this.handbrake = 0;
    this.boostEnergy = 1;
    this.boostActive = false;

    this.wheelSpin = 0;
    this.previousWheelSpin = 0;
    this.groundPitch = 0;
    this.previousGroundPitch = 0;

    this.longitudinalAcceleration = 0;
    this.lateralAcceleration = 0;
    this.yawRate = 0;
    this.braking = false;
  }

  reset(position, heading) {
    this.position.copy(position);
    this.previousPosition.copy(position);
    this.velocity.set(0, 0, 0);
    this.heading = heading;
    this.previousHeading = heading;
    this.speed = 0;
    this.lateralSpeed = 0;
    this.steering = 0;
    this.previousSteering = 0;
    this.throttle = 0;
    this.brake = 0;
    this.handbrake = 0;
    this.boostEnergy = 1;
    this.setBoost(false);
    this.wheelSpin = 0;
    this.previousWheelSpin = 0;
    this.groundPitch = 0;
    this.previousGroundPitch = 0;
    this.longitudinalAcceleration = 0;
    this.lateralAcceleration = 0;
    this.yawRate = 0;
    this.braking = false;
  }

  /**
   * Advance one fixed step.
   * @param {number} dt Fixed step in seconds.
   * @param {{
   *   getThrottle: () => number,
   *   getBrake: () => number,
   *   getSteer: () => number,
   *   getHandbrake: () => number,
   *   isBoostDown: () => boolean,
   * }} input Merged keyboard and touch values from InputManager.
   */
  update(dt, input) {
    if (!(dt > 0)) return;

    const p = this.physics;
    this.previousPosition.copy(this.position);
    this.previousHeading = this.heading;
    this.previousSteering = this.steering;
    this.previousWheelSpin = this.wheelSpin;
    this.previousGroundPitch = this.groundPitch;

    const speedBefore = this.speed;
    const accelerate = input.getThrottle();
    const brake = input.getBrake();
    const handbrake = input.getHandbrake();
    const boostHeld = input.isBoostDown();

    // Analog pedal and wheel smoothing. Keys and touch pads arrive as 0 or 1;
    // tilt is already analog. These ramps are what make every source feel like a
    // controller, and they are the only place the car learns about input speed.
    this.throttle = damp(this.throttle, accelerate, p.throttleLambda, dt);
    this.brake = damp(this.brake, brake, p.brakeLambda, dt);
    this.handbrake = damp(this.handbrake, handbrake, p.handbrakeLambda, dt);

    const steerInput = input.getSteer();
    const speedRatio = Math.min(Math.abs(this.speed) / p.maxSpeed, 1);
    const steerLimit = p.steerMax * (1 - p.speedSteerReduction * speedRatio);
    const steerTarget = steerInput * steerLimit;
    const steerLambda = steerInput !== 0 ? p.steerInLambda : p.steerOutLambda;
    this.steering = damp(this.steering, steerTarget, steerLambda, dt);

    // Boost is a limited resource. Releasing the key refills it; holding an
    // empty tank does not, so the player has to lift to recharge.
    this.setBoost(boostHeld && this.boostEnergy > p.boostMinEnergy);
    if (this.boostActive) {
      this.boostEnergy = Math.max(0, this.boostEnergy - p.boostDrain * dt);
      if (this.boostEnergy <= 0) this.setBoost(false);
    } else if (!boostHeld) {
      this.boostEnergy = Math.min(1, this.boostEnergy + p.boostRefill * dt);
    }

    // The car is always on the toy track, so grip and drag are single values.
    let grip = p.grip;
    if (this.handbrake > 0.01) grip *= p.handbrakeGripScale;

    const rollingDrag = p.rollingDrag;

    let forward = this.speed;
    let lateral = this.lateralSpeed;

    if (this.throttle > 0.001) {
      const speedFraction = Math.max(forward, 0) / p.maxSpeed;
      const falloff = clamp(
        1 - Math.pow(speedFraction, p.engineFalloffPower),
        0,
        1,
      );
      forward += this.throttle * p.engineAcceleration * falloff * dt;
    }
    if (this.boostActive) forward += p.boostAcceleration * dt;

    if (this.brake > 0.001) {
      if (forward > 0.15) {
        forward = Math.max(0, forward - this.brake * p.brakeDeceleration * dt);
      } else {
        forward = Math.max(
          -p.maxReverseSpeed,
          forward - this.brake * p.reverseAcceleration * dt,
        );
      }
    }

    if (this.handbrake > 0.001) {
      const deceleration = this.handbrake * p.handbrakeDeceleration * dt;
      if (forward > 0) forward = Math.max(0, forward - deceleration);
      else if (forward < 0) forward = Math.min(0, forward + deceleration);
    }

    forward -= forward * rollingDrag * dt;
    forward -= Math.sign(forward) * p.aeroDrag * forward * forward * dt;
    forward = clamp(forward, -p.maxReverseSpeed, p.boostMaxSpeed);
    if (
      Math.abs(forward) < 0.02 &&
      this.throttle < 0.01 &&
      this.brake < 0.01
    ) {
      forward = 0;
    }

    const steerRatio = this.steering / p.steerMax;
    let yaw = (forward / p.turnRadius) * steerRatio;
    if (this.handbrake > 0.1) yaw *= p.handbrakeYawBoost;
    this.yawRate = clamp(yaw, -p.maxYawRate, p.maxYawRate);
    const newHeading = this.heading + this.yawRate * dt;

    // Keep the old world velocity, rotate the car, then decompose the velocity
    // onto the new axes. The lateral component is the slip the tyres scrub off.
    const oldForwardX = -Math.sin(this.heading);
    const oldForwardZ = -Math.cos(this.heading);
    const oldRightX = Math.cos(this.heading);
    const oldRightZ = -Math.sin(this.heading);
    const worldX = oldForwardX * forward + oldRightX * lateral;
    const worldZ = oldForwardZ * forward + oldRightZ * lateral;

    const forwardX = -Math.sin(newHeading);
    const forwardZ = -Math.cos(newHeading);
    const rightX = Math.cos(newHeading);
    const rightZ = -Math.sin(newHeading);

    let newForward = worldX * forwardX + worldZ * forwardZ;
    let newLateral = worldX * rightX + worldZ * rightZ;
    newLateral *= Math.exp(-grip * dt);
    newLateral = clamp(newLateral, -p.maxLateralSpeed, p.maxLateralSpeed);

    this.velocity.set(
      forwardX * newForward + rightX * newLateral,
      0,
      forwardZ * newForward + rightZ * newLateral,
    );
    this.heading = newHeading;
    this.speed = newForward;
    this.lateralSpeed = newLateral;
    this.longitudinalAcceleration = (newForward - speedBefore) / dt;
    this.lateralAcceleration = this.yawRate * newForward;
    this.braking = this.brake > 0.2 && newForward > 0.1;

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.wheelSpin += (newForward * dt) / CAR.dimensions.wheelRadius;
  }

  /**
   * Rebuild the scalar speed values after a collision has rewritten the world
   * velocity. Heading is untouched, so the car scrapes along a wall instead of
   * snapping to a new direction.
   */
  applyContact() {
    const forwardX = -Math.sin(this.heading);
    const forwardZ = -Math.cos(this.heading);
    const rightX = Math.cos(this.heading);
    const rightZ = -Math.sin(this.heading);

    this.speed =
      this.velocity.x * forwardX + this.velocity.z * forwardZ;
    this.lateralSpeed =
      this.velocity.x * rightX + this.velocity.z * rightZ;
  }

  setBoost(active) {
    if (active === this.boostActive) return;
    this.boostActive = active;
    this.bus?.emit(active ? 'boost:start' : 'boost:end', {
      energy: this.boostEnergy,
    });
  }
}
