/**
 * Chase camera: spring-follow behind the car with speed FOV and obstruction
 * checks.
 *
 * The camera aims ahead of the car rather than at its centre, so the car sits
 * comfortably low in frame while the next corner stays readable. A single ray
 * from the car to the desired camera position pulls the rig in front of walls,
 * the bed, and other large furniture instead of clipping through them.
 */
import { Matrix4, Raycaster, Vector3 } from 'three';
import { damp } from '../../utils/math.js';

export class ChaseCamera {
  constructor(definition, { blockers = [] } = {}) {
    this.definition = definition;
    this.id = definition.id;
    this.name = definition.name;
    this.blockers = blockers;

    this.position = new Vector3();
    this.desired = new Vector3();
    this.lookTarget = new Vector3();
    this.lookCurrent = new Vector3();
    this.rayOrigin = new Vector3();
    this.rayDirection = new Vector3();
    this.up = new Vector3(0, 1, 0);
    this.lookMatrix = new Matrix4();
    this.raycaster = new Raycaster();

    this.initialized = false;
    this.fov = definition.fov;
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
    const speedRatio = Math.min(carState.speedRatio, 1.6);

    this.desired
      .copy(carState.position)
      .addScaledVector(carState.forward, -d.distance);
    this.desired.y += d.height;

    this.lookTarget
      .copy(carState.position)
      .addScaledVector(carState.forward, d.lookAhead);
    this.lookTarget.y += d.lookHeight;

    const targetFov = Math.min(d.fov + speedRatio * d.fovSpeed, d.maxFov);

    if (!this.initialized) {
      this.position.copy(this.desired);
      this.lookCurrent.copy(this.lookTarget);
      this.fov = targetFov;
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
      this.fov = damp(this.fov, targetFov, d.fovDamping, dt);
    }

    this.resolveObstruction(carState.position, this.position);

    this.lookMatrix.lookAt(this.position, this.lookCurrent, this.up);
    outPose.position.copy(this.position);
    outPose.quaternion.setFromRotationMatrix(this.lookMatrix);
    outPose.fov = this.fov;
  }

  resolveObstruction(carPosition, cameraPosition) {
    const d = this.definition;

    this.rayOrigin.copy(carPosition);
    this.rayOrigin.y += d.collisionOriginHeight;
    this.rayDirection.subVectors(cameraPosition, this.rayOrigin);
    const distance = this.rayDirection.length();
    if (distance < 0.0001) return;

    this.rayDirection.divideScalar(distance);
    this.raycaster.set(this.rayOrigin, this.rayDirection);
    this.raycaster.far = distance;

    const hits = this.raycaster.intersectObjects(this.blockers, true);
    if (hits.length === 0) return;

    const allowed = Math.min(
      distance,
      Math.max(d.collisionMinDistance, hits[0].distance - d.collisionMargin),
    );
    cameraPosition
      .copy(this.rayOrigin)
      .addScaledVector(this.rayDirection, allowed);
  }
}
