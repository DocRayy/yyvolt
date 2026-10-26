/**
 * Orchestrates the car's cosmetic effects.
 *
 * Each effect owns its own pool, geometry, and resources: dust particles, skid
 * marks, the boost flame, and the screen-edge speed lines. Effects only wires
 * them to the car's fixed/tick clocks and exposes one scene group, so Game does
 * not need to know how many systems sit behind it.
 */
import { Group } from 'three';
import { CAR } from '../config/car.config.js';
import { BoostFlame } from './BoostFlame.js';
import { DustParticles } from './DustParticles.js';
import { SkidMarks } from './SkidMarks.js';
import { SpeedLines } from './SpeedLines.js';

export class Effects {
  constructor({ car, mobile = false } = {}) {
    if (!car) throw new Error('Effects needs the car.');

    this.car = car;
    this.group = new Group();
    this.group.name = 'Car effects';

    const mobileConfig = CAR.effects.mobile;
    this.dust = new DustParticles({
      car,
      parent: this.group,
      rateScale: mobile ? mobileConfig.dustRateScale : 1,
    });
    this.skid = new SkidMarks({
      car,
      parent: this.group,
      spacingScale: mobile ? mobileConfig.skidSpacingScale : 1,
    });
    this.flame = new BoostFlame({ car });
    this.speedLines = new SpeedLines({ car });
  }

  /** Fixed-step hook: emit dust and skid marks from the latest car state. */
  fixedUpdate(dt) {
    if (!(dt > 0)) return;
    this.dust.fixedUpdate(dt);
    this.skid.fixedUpdate(dt);
  }

  /** Render-clock hook: fade particles, animate flame and overlay. */
  update(dt) {
    this.dust.update(dt);
    this.flame.update(dt);
    this.speedLines.update();
  }

  /** Clear transient marks and particles between races. */
  reset() {
    this.dust.reset();
    this.skid.reset();
  }

  dispose() {
    this.group.removeFromParent();
    this.dust.dispose();
    this.skid.dispose();
    this.flame.dispose();
    this.speedLines.dispose();
  }
}
