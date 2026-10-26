/**
 * Camera-facing snapshot of the car.
 *
 * Camera modes should not reach into ToyF1Car or CarPhysics directly. This
 * adapter exposes one stable shape each frame: world position, a horizontal
 * forward/right basis, speed, and the dynamic inputs used by cockpit head
 * movement and chase FOV. It updates in place, so the camera loop allocates
 * nothing.
 */
import { Vector3 } from 'three';
import { CAR } from '../config/car.config.js';

export class CameraCarState {
  constructor(car) {
    this.group = car.group;
    this.model = car.model;
    this.physics = car.physics;
    this.mounts = car.mounts;

    this.position = new Vector3();
    this.forward = new Vector3(0, 0, -1);
    this.right = new Vector3(1, 0, 0);
    this.up = new Vector3(0, 1, 0);

    this.heading = 0;
    this.speed = 0;
    this.speedRatio = 0;
    this.lateralSpeed = 0;
    this.steering = 0;
    this.boostActive = false;
    this.braking = false;
    this.longitudinalAcceleration = 0;
    this.lateralAcceleration = 0;
  }

  update() {
    const group = this.group;
    const physics = this.physics;
    // group.rotation.y is the render-interpolated heading (YXZ order), which is
    // what the camera must follow rather than the slightly older physics value.
    const heading = group.rotation.y;

    this.position.copy(group.position);
    this.heading = heading;
    this.forward.set(-Math.sin(heading), 0, -Math.cos(heading));
    this.right.set(Math.cos(heading), 0, -Math.sin(heading));
    this.speed = physics.speed;
    this.speedRatio = Math.abs(physics.speed) / CAR.physics.maxSpeed;
    this.lateralSpeed = physics.lateralSpeed;
    this.steering = physics.steering;
    this.boostActive = physics.boostActive;
    this.braking = physics.braking;
    this.longitudinalAcceleration = physics.longitudinalAcceleration;
    this.lateralAcceleration = physics.lateralAcceleration;
  }
}
