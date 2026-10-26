/**
 * Post-processing tuning.
 *
 * Bloom exists for actual emitters only: lamp bulbs, the wall LED strip, fairy
 * lights, track LEDs, and the car's lights. The high-pass threshold sits above
 * ordinary lamplit plaster, so daylight cannot turn the whole bedroom hazy.
 *
 * Vignette is deliberately weak. It should frame the shot without reading as a
 * filter or an effect.
 */
export const POSTFX = Object.freeze({
  bloom: {
    // UnrealBloomPass: radius 0..1, threshold in linear HDR luminance.
    radius: 0.42,
    threshold: 1.1,
  },
  vignette: {
    strength: 0.14,
    // Distance where the falloff starts and where it reaches full strength.
    start: 0.34,
    end: 0.92,
  },
});
