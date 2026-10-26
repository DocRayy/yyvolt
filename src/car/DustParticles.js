/**
 * Pooled tyre dust rendered as one Points draw call.
 *
 * Each particle has its own alpha and size, which PointsMaterial cannot express,
 * so a tiny shader draws a soft circular puff and fades it by life. All buffers
 * are allocated once and written in place; spawn/update loops create nothing.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Points,
  ShaderMaterial,
} from 'three';
import { CAR } from '../config/car.config.js';

const DUST_VERTEX = `
  attribute float aAlpha;
  attribute float aSize;
  varying float vAlpha;
  void main() {
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (320.0 / max(0.001, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const DUST_FRAGMENT = `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 offset = gl_PointCoord - vec2(0.5);
    float distanceToCentre = length(offset);
    if (distanceToCentre > 0.5) discard;
    float fade = smoothstep(0.5, 0.12, distanceToCentre) * vAlpha;
    gl_FragColor = vec4(uColor, fade);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class DustParticles {
  constructor({ car, parent, rateScale = 1 } = {}) {
    if (!car) throw new Error('DustParticles needs the car.');

    this.car = car;
    this.config = CAR.effects.dust;
    this.rateScale = rateScale;
    this.accumulator = 0;
    this.cursor = 0;
    this.randomState = 0x9e3779b9;

    const count = this.config.maxParticles;
    this.positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.alphas = new Float32Array(count);
    this.sizes = new Float32Array(count);
    this.life = new Float32Array(count);
    this.maxLife = new Float32Array(count);

    const geometry = new BufferGeometry();
    const position = new BufferAttribute(this.positions, 3);
    const alpha = new BufferAttribute(this.alphas, 1);
    const size = new BufferAttribute(this.sizes, 1);
    position.setUsage(DynamicDrawUsage);
    alpha.setUsage(DynamicDrawUsage);
    size.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', position);
    geometry.setAttribute('aAlpha', alpha);
    geometry.setAttribute('aSize', size);

    this.geometry = geometry;
    this.material = new ShaderMaterial({
      uniforms: { uColor: { value: new Color(this.config.color) } },
      vertexShader: DUST_VERTEX,
      fragmentShader: DUST_FRAGMENT,
      transparent: true,
      depthWrite: false,
    });
    this.points = new Points(geometry, this.material);
    this.points.name = 'Tyre dust';
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;
    parent?.add(this.points);
  }

  random() {
    this.randomState = (this.randomState * 1664525 + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  /** Emission follows slide, handbrake lock-up, and off-track scrubbing. */
  fixedUpdate(dt) {
    if (!(dt > 0)) return;

    const physics = this.car.physics;
    const surface = this.car.surfaceResult;
    const config = this.config;
    const speed = Math.abs(physics.speed);
    const slip = Math.abs(physics.lateralSpeed);

    let rate = 0;
    if (speed > 0.4) {
      if (slip > config.slipThreshold) {
        rate += config.sprayRate + (slip / config.slipThreshold) * config.slipRate;
      }
      if (physics.handbrake > 0.2) rate += config.slipRate * 0.5;
      if (!surface.onTrack && speed > config.offTrackSpeed) {
        rate += config.offTrackRate;
      }
    }

    if (rate <= 0) {
      this.accumulator = 0;
      return;
    }

    this.accumulator += rate * this.rateScale * dt;
    let spawned = 0;
    while (this.accumulator >= 1 && spawned < 8) {
      this.spawn();
      this.accumulator -= 1;
      spawned += 1;
    }
  }

  spawn() {
    const config = this.config;
    const physics = this.car.physics;
    const index = this.cursor;
    const offset = index * 3;
    this.cursor = (index + 1) % config.maxParticles;

    const heading = physics.heading;
    const forwardX = -Math.sin(heading);
    const forwardZ = -Math.cos(heading);
    const rightX = Math.cos(heading);
    const rightZ = -Math.sin(heading);
    const side = this.random() < 0.5 ? -1 : 1;
    const wheelX = rightX * side * 0.145 - forwardX * 0.19;
    const wheelZ = rightZ * side * 0.145 - forwardZ * 0.19;

    this.positions[offset] = physics.position.x + wheelX;
    this.positions[offset + 1] = physics.position.y + 0.045;
    this.positions[offset + 2] = physics.position.z + wheelZ;

    const angle = this.random() * Math.PI * 2;
    const spread = config.spread * (0.4 + this.random() * 0.9);
    this.velocities[offset] =
      physics.velocity.x * 0.12 + Math.cos(angle) * spread;
    this.velocities[offset + 1] =
      config.rise * (0.55 + this.random() * 0.9);
    this.velocities[offset + 2] =
      physics.velocity.z * 0.12 + Math.sin(angle) * spread;

    const life = config.lifeMin + this.random() * (config.lifeMax - config.lifeMin);
    this.life[index] = life;
    this.maxLife[index] = life;
    this.alphas[index] = config.alpha;
    this.sizes[index] =
      config.sizeMin + this.random() * (config.sizeMax - config.sizeMin);
  }

  update(dt) {
    const config = this.config;
    const count = config.maxParticles;
    let changed = false;

    for (let i = 0; i < count; i += 1) {
      if (this.life[i] <= 0) continue;

      this.life[i] -= dt;
      const offset = i * 3;
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        changed = true;
        continue;
      }

      const drag = Math.exp(-config.drag * dt);
      this.velocities[offset] *= drag;
      this.velocities[offset + 1] *= drag;
      this.velocities[offset + 2] *= drag;

      this.positions[offset] += this.velocities[offset] * dt;
      this.positions[offset + 1] += this.velocities[offset + 1] * dt;
      this.positions[offset + 2] += this.velocities[offset + 2] * dt;

      this.alphas[i] = config.alpha * (this.life[i] / this.maxLife[i]);
      this.sizes[i] += dt * 0.07;
      changed = true;
    }

    if (!changed) return;
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  /** Retire every live puff when a race restarts. */
  reset() {
    this.accumulator = 0;
    this.life.fill(0);
    this.maxLife.fill(0);
    this.alphas.fill(0);
    this.sizes.fill(0);
    this.geometry.attributes.aAlpha.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
  }

  dispose() {
    this.points.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}
