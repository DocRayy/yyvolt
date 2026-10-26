/**
 * The boost exhaust flame: two additive cones attached to the suspension body.
 *
 * The body group already carries pitch and roll, so the flame leans with the
 * chassis for free. Flicker is two summed sines rather than random values, which
 * keeps the motion smooth and allocation-free.
 */
import {
  AdditiveBlending,
  ConeGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
} from 'three';
import { CAR } from '../config/car.config.js';
import { clamp } from '../utils/math.js';

export class BoostFlame {
  constructor({ car } = {}) {
    if (!car) throw new Error('BoostFlame needs the car.');

    this.car = car;
    this.config = CAR.effects.flame;
    this.time = 0;

    this.group = new Group();
    this.group.name = 'Boost flame';
    this.group.position.set(0, this.config.y, this.config.z);
    this.group.rotation.x = Math.PI / 2;
    this.group.visible = false;

    const outerGeometry = new ConeGeometry(
      this.config.outerRadius,
      this.config.outerLength,
      10,
      1,
      true,
    );
    const innerGeometry = new ConeGeometry(
      this.config.innerRadius,
      this.config.innerLength,
      8,
      1,
      true,
    );
    this.outerGeometry = outerGeometry;
    this.innerGeometry = innerGeometry;

    this.outerMaterial = new MeshBasicMaterial({
      color: this.config.outerColor,
      transparent: true,
      opacity: 0.65,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });
    this.innerMaterial = new MeshBasicMaterial({
      color: this.config.innerColor,
      transparent: true,
      opacity: 0.9,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
      toneMapped: false,
    });

    this.outer = new Mesh(outerGeometry, this.outerMaterial);
    this.outer.position.y = this.config.outerLength / 2;
    this.inner = new Mesh(innerGeometry, this.innerMaterial);
    this.inner.position.y = this.config.innerLength / 2;
    this.group.add(this.outer, this.inner);
    car.model.body.add(this.group);
  }

  update(dt) {
    this.time += dt;

    if (!this.car.physics.boostActive) {
      if (this.group.visible) this.group.visible = false;
      return;
    }

    this.group.visible = true;
    const flicker =
      0.88 +
      Math.sin(this.time * this.config.flicker) * 0.1 +
      Math.sin(this.time * this.config.flicker * 1.7 + 1.3) * 0.06;
    const pulse = clamp(flicker, 0.65, 1.1);

    this.outer.scale.set(1, pulse, 1);
    this.inner.scale.set(0.9, pulse * 1.12, 0.9);
    this.outerMaterial.opacity = 0.5 + pulse * 0.22;
    this.innerMaterial.opacity = 0.75 + pulse * 0.2;
  }

  dispose() {
    this.group.removeFromParent();
    this.outerGeometry.dispose();
    this.innerGeometry.dispose();
    this.outerMaterial.dispose();
    this.innerMaterial.dispose();
  }
}
