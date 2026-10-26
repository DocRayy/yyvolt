/**
 * Drift skid marks as a recycled InstancedMesh ring buffer.
 *
 * A mark is a small dark quad laid flat on the track, aligned with the car's
 * heading and spawned at both rear wheels every few centimetres of travel. The
 * oldest instance is overwritten once the pool is full, so marks cost one draw
 * call and no allocations.
 */
import {
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
} from 'three';
import { CAR } from '../config/car.config.js';

export class SkidMarks {
  constructor({ car, parent, spacingScale = 1 } = {}) {
    if (!car) throw new Error('SkidMarks needs the car.');

    this.car = car;
    this.config = CAR.effects.skid;
    this.spacing = this.config.spacing * spacingScale;
    this.cursor = 0;
    this.count = 0;
    this.distance = 0;

    const geometry = new PlaneGeometry(this.config.width, this.config.length);
    geometry.rotateX(-Math.PI / 2);

    this.geometry = geometry;
    this.material = new MeshBasicMaterial({
      color: this.config.color,
      transparent: true,
      opacity: this.config.alpha,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      side: DoubleSide,
    });
    this.mesh = new InstancedMesh(
      geometry,
      this.material,
      this.config.maxMarks,
    );
    this.mesh.name = 'Skid marks';
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.dummy = new Object3D();
    parent?.add(this.mesh);
  }

  fixedUpdate(dt) {
    const config = this.config;
    const physics = this.car.physics;
    const surface = this.car.surfaceResult;
    const speed = Math.abs(physics.speed);
    const drifting =
      surface.onTrack &&
      speed > config.speed &&
      (physics.handbrake > 0.25 || Math.abs(physics.lateralSpeed) > config.slip);

    if (!drifting) {
      this.distance = 0;
      return;
    }

    this.distance += speed * dt;
    if (this.distance < this.spacing) return;
    this.distance = 0;

    const heading = physics.heading;
    const forwardX = -Math.sin(heading);
    const forwardZ = -Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);
    const y = surface.height + config.lift;

    for (const side of [-1, 1]) {
      this.dummy.position.set(
        physics.position.x + rightX * side * 0.145 - forwardX * 0.19,
        y,
        physics.position.z + rightZ * side * 0.145 - forwardZ * 0.19,
      );
      this.dummy.rotation.set(0, heading, 0);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(this.cursor, this.dummy.matrix);

      this.cursor = (this.cursor + 1) % config.maxMarks;
      this.count = Math.min(this.count + 1, config.maxMarks);
    }

    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** Clear the ring buffer when a new race starts. */
  reset() {
    this.cursor = 0;
    this.count = 0;
    this.distance = 0;
    this.mesh.count = 0;
  }

  dispose() {
    this.mesh.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
