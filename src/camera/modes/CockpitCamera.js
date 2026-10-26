/**
 * Driver's-eye cockpit camera.
 *
 * The helmet, visor, and helmet stripe are hidden only while this mode is
 * active, so the lens can sit where the driver's head is without the helmet
 * shell filling the screen. The halo, steering wheel, mirrors, and nose stay
 * visible, and head movement reacts gently to acceleration and cornering.
 */
import { clamp, damp } from '../../utils/math.js';
import { MountedCamera } from './MountedCamera.js';

export class CockpitCamera extends MountedCamera {
  constructor(definition, { car }) {
    super(definition);
    this.car = car;
    this.headYaw = 0;
    this.headPitch = 0;
    this.helmetHidden = false;
    // Hide only what would sit inside the lens: the helmet shell and the halo
    // support directly in front of the driver's eye. The halo hoop stays.
    this.hiddenParts = [
      car.model.helmet,
      car.model.visor,
      car.model.helmetStripe,
      car.model.haloPillar,
    ].filter(Boolean);
  }

  enter() {
    super.enter();
    this.headYaw = 0;
    this.headPitch = 0;
    this.setHelmetHidden(true);
  }

  exit() {
    this.setHelmetHidden(false);
    super.exit();
  }

  snap() {
    super.snap();
    this.headYaw = 0;
    this.headPitch = 0;
  }

  applyLocalOffsets(dt, carState) {
    const d = this.definition;
    const yawTarget = clamp(
      carState.lateralAcceleration * d.headYawGain,
      -d.headMaxYaw,
      d.headMaxYaw,
    );
    // The body pitches nose-up under acceleration; cancel most of that with a
    // small counter-pitch so the horizon does not swim in the cockpit.
    const pitchTarget = clamp(
      -carState.longitudinalAcceleration * d.headPitchGain,
      -d.headMaxPitch,
      d.headMaxPitch,
    );

    this.headYaw = damp(this.headYaw, yawTarget, d.headDamping, dt);
    this.headPitch = damp(this.headPitch, pitchTarget, d.headDamping, dt);
    this.yawOffset = this.headYaw;
    this.pitchOffset = this.headPitch;
  }

  setHelmetHidden(hidden) {
    if (this.helmetHidden === hidden) return;
    this.helmetHidden = hidden;
    for (const part of this.hiddenParts) part.visible = !hidden;
  }
}
