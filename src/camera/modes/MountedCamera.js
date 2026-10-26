/**
 * Shared behaviour for cameras that are physically attached to the car.
 *
 * The mount's world transform already includes the car's heading, ramp pitch,
 * and suspension roll, so every attached camera inherits the same body motion.
 * A small local pitch/yaw offset aims the lens; a short orientation low-pass
 * keeps the toy's springy body from making the view jitter. The wheel camera
 * uses yaw to look back along the flank from its front-wheel mount.
 */
import { Euler, Quaternion } from 'three';

export class MountedCamera {
  constructor(definition) {
    this.definition = definition;
    this.id = definition.id;
    this.name = definition.name;
    this.initialized = false;
    this.orientation = new Quaternion();
    this.targetOrientation = new Quaternion();
    this.mountQuaternion = new Quaternion();
    this.localRotation = new Quaternion();
    this.localEuler = new Euler(0, 0, 0, 'YXZ');
    this.pitchOffset = 0;
    this.yawOffset = 0;
  }

  enter() {
    this.initialized = false;
  }

  exit() {}

  /** Force the next update to snap to the mount instead of easing toward it. */
  snap() {
    this.initialized = false;
  }

  update(dt, carState, outPose) {
    const mount = carState.mounts[this.definition.mount];
    if (!mount) return;

    this.applyLocalOffsets(dt, carState);

    mount.getWorldPosition(outPose.position);
    mount.getWorldQuaternion(this.mountQuaternion);

    this.localEuler.set(
      this.definition.lookPitch + this.pitchOffset,
      (this.definition.lookYaw ?? 0) + this.yawOffset,
      0,
    );
    this.localRotation.setFromEuler(this.localEuler);
    this.targetOrientation
      .copy(this.mountQuaternion)
      .multiply(this.localRotation);

    if (!this.initialized) {
      this.orientation.copy(this.targetOrientation);
      this.initialized = true;
    } else {
      const blend = 1 - Math.exp(-this.definition.damping * dt);
      this.orientation.slerp(this.targetOrientation, blend);
    }

    outPose.quaternion.copy(this.orientation);
    outPose.fov = this.definition.fov;
  }

  /** Attached cameras are rigid unless a subclass adds head movement. */
  applyLocalOffsets() {
    this.pitchOffset = 0;
    this.yawOffset = 0;
  }
}
