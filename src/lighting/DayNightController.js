/**
 * Blends the whole room between the day and night presets.
 *
 * A toggle starts a 1.5 s eased transition. The controller only writes values:
 * the light objects, window planes, lamp materials, night decor, track LEDs, and
 * car headlights all exist from boot, so there is no scene rebuild and no shader
 * recompile mid-race. Pressing L again mid-transition reverses smoothly from the
 * current mix.
 */
import {
  DAY_NIGHT_MAX_DELTA,
  DAY_NIGHT_TRANSITION_SECONDS,
  DAY_PRESET,
  NIGHT_PRESET,
} from '../config/lighting.config.js';
import { lerp, smoothstep } from '../utils/math.js';

export class DayNightController {
  constructor({ bus, lighting, window, furniture, nightDecor, trackLights, car, renderer, scene }) {
    this.bus = bus;
    this.lighting = lighting;
    this.window = window;
    this.furniture = furniture;
    this.nightDecor = nightDecor;
    this.trackLights = trackLights ?? null;
    this.car = car ?? null;
    this.renderer = renderer;
    this.scene = scene;

    this.mix = 0;
    this.startMix = 0;
    this.targetMix = 0;
    this.elapsed = 0;
    this.duration = 0;
    this.transitioning = false;
    this.mode = 'day';
    this.bloomStrength = DAY_PRESET.bloomStrength;

    this.handleAction = ({ action }) => {
      if (action === 'environment.daynight') this.toggle();
    };
    this.handleToggle = () => this.toggle();
    this.unsubscribeAction = bus.on('input:action', this.handleAction);
    this.unsubscribeToggle = bus.on('daynight:toggle', this.handleToggle);

    this.apply(0);
  }

  toggle() {
    const target = this.targetMix > 0.5 ? 0 : 1;
    this.startMix = this.mix;
    this.targetMix = target;
    this.elapsed = 0;
    this.duration = Math.max(
      DAY_NIGHT_TRANSITION_SECONDS * Math.abs(target - this.startMix),
      0.001,
    );
    this.transitioning = true;
    this.mode = target === 1 ? 'night' : 'day';

    this.bus.emit('daynight:changed', this.eventPayload());
    this.bus.emit('ui:toast', {
      message: target === 1 ? 'Night mode on' : 'Day mode on',
    });
  }

  update(dt) {
    if (!this.transitioning) return;

    this.elapsed += Math.min(dt, DAY_NIGHT_MAX_DELTA);
    const progress = Math.min(this.elapsed / this.duration, 1);
    this.mix = lerp(this.startMix, this.targetMix, smoothstep(0, 1, progress));
    this.apply(this.mix);

    if (progress < 1) return;

    this.transitioning = false;
    this.mix = this.targetMix;
    this.apply(this.mix);
    this.bus.emit('daynight:changed', this.eventPayload());
  }

  apply(mix) {
    this.lighting.setNightFactor(mix);
    this.window.setNightFactor(mix);
    this.furniture.setNightFactor(mix);
    this.nightDecor.setNightFactor(mix);
    this.trackLights?.setNightFactor(mix);
    this.car?.setNightFactor(mix);
    this.renderer.toneMappingExposure = lerp(
      DAY_PRESET.exposure,
      NIGHT_PRESET.exposure,
      mix,
    );
    this.scene.environmentIntensity = lerp(
      DAY_PRESET.environmentIntensity,
      NIGHT_PRESET.environmentIntensity,
      mix,
    );
    this.bloomStrength = lerp(
      DAY_PRESET.bloomStrength,
      NIGHT_PRESET.bloomStrength,
      mix,
    );
  }

  eventPayload() {
    return {
      mode: this.mode,
      mix: this.mix,
      transitioning: this.transitioning,
      bloomStrength: this.bloomStrength,
    };
  }

  dispose() {
    this.unsubscribeAction?.();
    this.unsubscribeToggle?.();
    this.unsubscribeAction = null;
    this.unsubscribeToggle = null;
  }
}
