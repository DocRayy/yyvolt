/**
 * Day and night lighting presets.
 *
 * Both presets expose the exact same keys so DayNightController can blend
 * every value with one generic routine. Lights themselves are created once by
 * LightingRig in Phase 3; only these properties animate.
 *
 * Positions are room-space coordinates and follow the final room scale.
 */
import { ENVIRONMENT } from './constants.js';

export const DAY_NIGHT_TRANSITION_SECONDS = 1.5;
export const DAY_NIGHT_MAX_DELTA = 0.1;

/** How strongly the practical lamp glass glows at full night. */
export const LAMP_GLOW = Object.freeze({
  shade: 0.45,
  bulb: 3.0,
});

export const DAY_PRESET = Object.freeze({
  label: 'Day',
  keyLight: {
    color: 0xfff2dc,
    intensity: 3.2,
    position: [1.6, 3.1, -5.6],
    target: [0, 0.6, 1.2],
  },
  hemisphere: {
    sky: 0xdfeaf5,
    ground: 0xe8dccb,
    intensity: 0.85,
  },
  ambient: { color: 0xfff4e6, intensity: 0.3 },
  roomFill: {
    color: 0xfff6e8,
    intensity: 0.3,
    position: [0, 3, 3.8],
    target: [0, 1, -1],
  },
  deskLamp: { color: 0xffb968, intensity: 0 },
  bedsideLamp: { color: 0xffb968, intensity: 0 },
  ledStrip: { color: 0xffc20e, intensity: 0.02 },
  fairyLights: { color: 0xffd48a, intensity: 0 },
  nightLight: { color: 0xffb968, intensity: 0 },
  carHeadlights: { intensity: 0 },
  carTailLights: { intensity: 0 },
  window: {
    skyTop: 0x9cc8ee,
    skyBottom: 0xe8f3fb,
    starsOpacity: 0,
  },
  environmentIntensity: ENVIRONMENT.intensity,
  exposure: 1.05,
  bloomStrength: 0.1,
});

export const NIGHT_PRESET = Object.freeze({
  label: 'Night',
  keyLight: {
    color: 0x9bb8e0,
    intensity: 0.22,
    position: [1.6, 3.1, -5.6],
    target: [0, 0.6, 1.2],
  },
  hemisphere: {
    sky: 0x2a3b5c,
    ground: 0x0a1220,
    intensity: 0.16,
  },
  ambient: { color: 0x2a3850, intensity: 0.04 },
  roomFill: {
    color: 0x22385c,
    intensity: 0.08,
    position: [0, 3, 3.8],
    target: [0, 1, -1],
  },
  deskLamp: { color: 0xffb968, intensity: 2.8 },
  bedsideLamp: { color: 0xffab5e, intensity: 2.4 },
  ledStrip: { color: 0xffc20e, intensity: 2.5 },
  fairyLights: { color: 0xffd48a, intensity: 2 },
  nightLight: { color: 0xffb968, intensity: 2 },
  carHeadlights: { intensity: 1.4 },
  carTailLights: { intensity: 0.8 },
  window: {
    skyTop: 0x081226,
    skyBottom: 0x1a2c4a,
    starsOpacity: 1,
  },
  // The PMREM was baked from the bright day room; lowering its contribution is
  // what lets the practicals read as the only real light at night.
  environmentIntensity: 0.08,
  exposure: 1.0,
  bloomStrength: 0.55,
});

/**
 * Fixed positions for the night-time light sources and decor.
 *
 * The two lamp lights follow the actual lamp bulbs through Furniture's anchors;
 * these entries cover the wall pieces that are built after static batching.
 * Keeping them here means the lighting rig and NightDecor cannot drift apart.
 */
export const LIGHT_LAYOUT = Object.freeze({
  deskLamp: {
    distance: 4.5,
    decay: 2,
    fallbackPosition: [5.57, 1.44, -2.77],
  },
  bedsideLamp: {
    distance: 3.5,
    decay: 2,
    fallbackPosition: [-1.55, 0.91, -4.3],
  },
  ledStrip: {
    position: [-3.3, 1.62, -4.92],
    size: [2.2, 0.035, 0.025],
  },
  fairyLights: {
    radius: 0.03,
    bulbWidthSegments: 8,
    bulbHeightSegments: 6,
    wireRadius: 0.004,
    wireSegments: 64,
    wireRadialSegments: 4,
    points: [
      [-0.9, 3.2, -4.92],
      [-0.43, 3.14, -4.92],
      [0.04, 3.18, -4.92],
      [0.51, 3.24, -4.92],
      [0.98, 3.19, -4.92],
      [1.45, 3.13, -4.92],
      [1.92, 3.18, -4.92],
      [2.39, 3.24, -4.92],
      [2.86, 3.19, -4.92],
    ],
  },
  nightLight: {
    position: [-1.0, 0.55, -4.92],
    glowSize: [0.18, 0.24, 0.06],
    backingSize: [0.22, 0.28, 0.035],
    backingOffset: [0, 0, -0.03],
    cornerSegments: 2,
    cornerRadius: 0.02,
  },
});
