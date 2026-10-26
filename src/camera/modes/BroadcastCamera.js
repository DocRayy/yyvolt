/**
 * Trackside broadcast camera.
 *
 * Five fixed positions sit around the room. Each frame the camera pans from its
 * fixed tripod, and every scan it scores the shots by distance and line of
 * sight. A cut is a short internal blend using the same duration as the rig's
 * camera blend, so it feels like a TV cut rather than a hard teleport.
 *
 * Keeping the shots fixed is deliberate: the camera never chases the car into
 * furniture, and a blocker between tripod and car simply loses the score.
 */
import { Matrix4, Quaternion, Raycaster, Vector3 } from 'three';
import { CAMERA_BLEND_SECONDS } from '../../config/cameras.config.js';
import { clamp, damp, smoothstep } from '../../utils/math.js';

export class BroadcastCamera {
  constructor(definition, { blockers = [] } = {}) {
    this.definition = definition;
    this.id = definition.id;
    this.name = definition.name;
    this.blockers = blockers;

    // Shot positions are fixed for the lifetime of the mode; only the output
    // pose changes during a cut.
    this.shots = definition.shots.map((shot) => ({
      id: shot.id,
      position: new Vector3().fromArray(shot.position),
    }));

    this.lookTarget = new Vector3();
    this.lookCurrent = new Vector3();
    this.rayTarget = new Vector3();
    this.rayOrigin = new Vector3();
    this.rayDirection = new Vector3();
    this.cutFromPosition = new Vector3();
    this.lastPosition = new Vector3();
    this.up = new Vector3(0, 1, 0);
    this.lookMatrix = new Matrix4();
    this.targetQuaternion = new Quaternion();
    this.cutFromQuaternion = new Quaternion();
    this.lastQuaternion = new Quaternion();
    this.raycaster = new Raycaster();

    this.shotIndex = -1;
    this.initialized = false;
    this.cutting = false;
    this.cutElapsed = 0;
    this.holdTimer = 0;
    this.scanTimer = 0;
    this.fov = definition.fov;
    this.cutFromFov = definition.fov;
    this.lastFov = definition.fov;
  }

  enter() {
    this.resetTracking();
  }

  exit() {}

  snap() {
    this.resetTracking();
  }

  resetTracking() {
    this.shotIndex = -1;
    this.initialized = false;
    this.cutting = false;
    this.cutElapsed = 0;
    this.holdTimer = 0;
    this.scanTimer = 0;
    this.fov = this.definition.fov;
  }

  update(dt, carState, outPose) {
    const d = this.definition;
    const carPosition = carState.position;

    this.lookTarget
      .copy(carPosition)
      .addScaledVector(carState.forward, d.lookAhead);
    this.lookTarget.y += d.lookHeight;

    if (!this.initialized) {
      this.shotIndex = this.findBestShot(carPosition);
      this.lookCurrent.copy(this.lookTarget);
      this.fov = this.computeFov(this.shots[this.shotIndex], carPosition);
      this.holdTimer = 0;
      this.scanTimer = d.scanInterval;
      this.cutting = false;
      this.initialized = true;
    } else {
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

      this.scanTimer -= dt;
      this.holdTimer += dt;
      if (this.scanTimer <= 0) {
        this.scanTimer = d.scanInterval;
        this.maybeCut(carPosition);
      }
    }

    const shot = this.shots[this.shotIndex];
    const targetFov = this.computeFov(shot, carPosition);
    this.fov = damp(this.fov, targetFov, d.fovDamping, dt);

    this.lookMatrix.lookAt(shot.position, this.lookCurrent, this.up);
    this.targetQuaternion.setFromRotationMatrix(this.lookMatrix);

    if (this.cutting) {
      this.cutElapsed += dt;
      const t = smoothstep(
        0,
        1,
        this.cutElapsed / CAMERA_BLEND_SECONDS,
      );

      outPose.position.lerpVectors(
        this.cutFromPosition,
        shot.position,
        t,
      );
      outPose.quaternion
        .copy(this.cutFromQuaternion)
        .slerp(this.targetQuaternion, t);
      outPose.fov =
        this.cutFromFov + (this.fov - this.cutFromFov) * t;
      if (this.cutElapsed >= CAMERA_BLEND_SECONDS) this.cutting = false;
    } else {
      outPose.position.copy(shot.position);
      outPose.quaternion.copy(this.targetQuaternion);
      outPose.fov = this.fov;
    }

    this.lastPosition.copy(outPose.position);
    this.lastQuaternion.copy(outPose.quaternion);
    this.lastFov = outPose.fov;
  }

  /** Scan the tripods and start a cut only when the change is worthwhile. */
  maybeCut(carPosition) {
    const d = this.definition;
    const currentIndex = this.shotIndex;
    const current = this.shots[currentIndex];
    const currentDistance = this.shotDistance(current, carPosition);
    const currentBlocked = this.isBlocked(current, carPosition);
    const currentScore =
      Math.abs(currentDistance - d.idealDistance) +
      (currentBlocked ? d.blockedPenalty : 0);

    let bestIndex = currentIndex;
    let bestScore = currentScore;

    for (let i = 0; i < this.shots.length; i += 1) {
      if (i === currentIndex) continue;
      const score = this.scoreShot(this.shots[i], carPosition);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex === currentIndex) return;

    if (currentBlocked) {
      this.cutTo(bestIndex);
      return;
    }

    if (
      this.holdTimer >= d.minHold &&
      bestScore + d.switchMargin < currentScore
    ) {
      this.cutTo(bestIndex);
    }
  }

  cutTo(index) {
    this.cutFromPosition.copy(this.lastPosition);
    this.cutFromQuaternion.copy(this.lastQuaternion);
    this.cutFromFov = this.lastFov;
    this.shotIndex = index;
    this.cutElapsed = 0;
    this.cutting = true;
    this.holdTimer = 0;
  }

  findBestShot(carPosition) {
    let bestIndex = 0;
    let bestScore = Infinity;
    for (let i = 0; i < this.shots.length; i += 1) {
      const score = this.scoreShot(this.shots[i], carPosition);
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }
    return bestIndex;
  }

  scoreShot(shot, carPosition) {
    const distance = this.shotDistance(shot, carPosition);
    const blocked = this.isBlocked(shot, carPosition);
    return (
      Math.abs(distance - this.definition.idealDistance) +
      (blocked ? this.definition.blockedPenalty : 0)
    );
  }

  shotDistance(shot, carPosition) {
    return shot.position.distanceTo(carPosition);
  }

  computeFov(shot, carPosition) {
    const d = this.definition;
    const distance = Math.max(this.shotDistance(shot, carPosition), 0.001);
    const zoomed = d.fov * (d.referenceDistance / distance);
    return clamp(zoomed, d.minFov, d.maxFov);
  }

  /** A short ray from the tripod to the car; furniture wins over the shot. */
  isBlocked(shot, carPosition) {
    const d = this.definition;
    this.rayOrigin.copy(shot.position);
    this.rayTarget.set(
      carPosition.x,
      carPosition.y + d.lookHeight,
      carPosition.z,
    );
    this.rayDirection.subVectors(this.rayTarget, this.rayOrigin);
    const distance = this.rayDirection.length();
    if (distance <= 0.0001) return false;

    this.rayDirection.divideScalar(distance);
    this.raycaster.set(this.rayOrigin, this.rayDirection);
    this.raycaster.far = Math.max(0, distance - d.visibilityMargin);
    return this.raycaster.intersectObjects(this.blockers, true).length > 0;
  }
}
