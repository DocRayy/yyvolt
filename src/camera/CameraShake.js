/**
 * Deterministic camera shake.
 *
 * No random per-frame noise: sine layers stay coherent at any refresh rate and
 * never allocate. Speed adds a gentle baseline, boost adds a punch on the chase
 * camera, and collisions queue a decaying impulse through car:collide.
 */
import { Euler, Quaternion } from 'three';
import { damp } from '../utils/math.js';

export class CameraShake {
  constructor(config) {
    this.config = config;
    this.time = 0;
    this.collision = 0;
    this.euler = new Euler(0, 0, 0, 'YXZ');
    this.quaternion = new Quaternion();
  }

  impulse(strength = 0.8) {
    this.collision = Math.min(this.config.max, this.collision + strength);
  }

  apply(dt, mode, carState, pose) {
    const config = this.config;
    const definition = mode.definition;
    const speedAmount =
      config.speedFloor +
      Math.min(carState.speedRatio, 1.4) * config.speedRange;
    let amount = (definition.shake ?? 0) * speedAmount;

    if (definition.boostShake && carState.boostActive) {
      amount += definition.boostShake;
    }
    amount += this.collision;
    this.collision = damp(this.collision, 0, config.decay, dt);

    if (amount < 0.001) return;

    this.time += dt;
    const time = this.time * config.frequency;
    const positionAmount = config.position * amount;

    pose.position.x += Math.sin(time) * positionAmount;
    pose.position.y +=
      Math.sin(time * 1.7 + 1.3) * positionAmount * 0.6;
    pose.position.z +=
      Math.sin(time * 1.3 + 2.1) * positionAmount * 0.4;

    this.euler.set(
      Math.sin(time * 0.9 + 0.4) * config.rotation * amount,
      Math.sin(time * 1.1 + 1.6) * config.rotation * amount,
      Math.sin(time * 1.4 + 0.7) * config.rotation * amount * 0.6,
    );
    this.quaternion.setFromEuler(this.euler);
    pose.quaternion.multiply(this.quaternion);
  }
}
