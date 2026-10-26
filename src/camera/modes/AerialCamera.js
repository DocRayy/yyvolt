/**
 * Aerial / top-down camera.
 *
 * The camera floats above the room and follows the car's floor position with
 * damping, aiming slightly ahead so the track reads. It uses a world-space up
 * vector instead of Y-up because a lens pointed straight down is degenerate for
 * lookAt; the room therefore stays north-up while the car turns underneath.
 *
 * CameraRig hides the ceiling when this mode is selected and restores it only
 * after the exit blend, so the camera never looks through a visible ceiling
 * while descending back into the room.
 */
import { Matrix4, Vector3 } from 'three';
import { damp } from '../../utils/math.js';

export class AerialCamera {
  constructor(definition) {
    this.definition = definition;
    this.id = definition.id;
    this.name = definition.name;

    this.position = new Vector3();
    this.desired = new Vector3();
    this.lookTarget = new Vector3();
    this.lookCurrent = new Vector3();
    this.up = new Vector3(0, 0, -1);
    this.lookMatrix = new Matrix4();

    this.initialized = false;
  }

  enter() {
    this.initialized = false;
  }

  exit() {}

  snap() {
    this.initialized = false;
  }

  update(dt, carState, outPose) {
    const d = this.definition;

    this.desired.copy(carState.position);
    this.desired.y += d.height;

    this.lookTarget
      .copy(carState.position)
      .addScaledVector(carState.forward, d.lookAhead);
    this.lookTarget.y += d.lookHeight;

    if (!this.initialized) {
      this.position.copy(this.desired);
      this.lookCurrent.copy(this.lookTarget);
      this.initialized = true;
    } else {
      this.position.x = damp(
        this.position.x,
        this.desired.x,
        d.damping,
        dt,
      );
      this.position.y = damp(
        this.position.y,
        this.desired.y,
        d.damping,
        dt,
      );
      this.position.z = damp(
        this.position.z,
        this.desired.z,
        d.damping,
        dt,
      );
      this.lookCurrent.x = damp(
        this.lookCurrent.x,
        this.lookTarget.x,
        d.lookDamping,
        dt,
      );
      this.lookCurrent.y = damp(
        this.lookCurrent.y,
        this.lookTarget.y,
        d.lookDamping,
        dt,
      );
      this.lookCurrent.z = damp(
        this.lookCurrent.z,
        this.lookTarget.z,
        d.lookDamping,
        dt,
      );
    }

    this.lookMatrix.lookAt(this.position, this.lookCurrent, this.up);
    outPose.position.copy(this.position);
    outPose.quaternion.setFromRotationMatrix(this.lookMatrix);
    outPose.fov = d.fov;
  }
}
