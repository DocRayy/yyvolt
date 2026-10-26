/**
 * Track layout and tuning.
 *
 * The control points are ordered clockwise around one closed toy track. The
 * front straight runs along z = 2.2, the ramp sits over the picture-book stack,
 * and the long left-hand section passes under the bed. Keeping the points here
 * means the ribbon, LED strips, checkpoints, and car physics all agree on the
 * same racing line.
 *
 * The track is deliberately inset from furniture footprints. When a prop moves,
 * update PROPS_LAYOUT in constants.js and re-check the clearance in this file.
 */
import { COLORS } from './constants.js';

const CONTROL_POINTS = [
  // Start/finish on the right-hand straight, heading -z. Its banner faces the
  // room and the start straight, so the YYVOLT board reads at the grid.
  [3.7, 0.02, 0.2],
  [3.7, 0.02, -0.6],
  // Long back straight between the desk and the bed, then the dive under the
  // raised bed frame. z = -3.0 clears the bedside table at z = -3.99.
  [-1.0, 0.02, -0.6],
  [-1.0, 0.02, -3.0],
  [-2.2, 0.02, -3.0],
  [-3.35, 0.02, -3.0],
  [-3.35, 0.02, -0.6],
  // Exit at the foot of the bed and sweep back across the room.
  [-3.35, 0.02, 0.8],
  [-1.0, 0.02, 0.8],
  [1.2, 0.02, 2.2],
  // Front straight. The plateau clears the book stack, whose top is at 0.204.
  [2.5, 0.02, 2.2],
  [2.7, 0.26, 2.2],
  [3.3, 0.26, 2.2],
  [3.5, 0.02, 2.2],
  [4.2, 0.02, 2.2],
  // Right-hand turn beside the desk, closing onto the start straight.
  [3.7, 0.02, 1.25],
];

export const TRACK = Object.freeze({
  width: 1.2,
  surfaceThickness: 0.045,
  samples: 480,
  // A coarser polyline is enough for the car's nearest-surface query and keeps
  // the fixed step cheap on low-end laptops.
  physicsSamples: 240,
  curveTension: 0.5,
  points: Object.freeze(CONTROL_POINTS.map((point) => Object.freeze(point))),

  surface: Object.freeze({
    textureScale: 1.6,
    roughness: 0.68,
    metalness: 0.02,
  }),

  centerLine: Object.freeze({
    width: 0.055,
    height: 0.006,
    dashLength: 0.34,
    gapLength: 0.26,
  }),

  kerb: Object.freeze({
    width: 0.16,
    height: 0.055,
    length: 0.34,
    gap: 0.02,
    offset: 0.018,
    colors: Object.freeze([COLORS.kerbRed, COLORS.paper]),
  }),

  joint: Object.freeze({
    spacing: 4.2,
    height: 0.034,
    depth: 0.14,
    extraWidth: 0.05,
    color: 0xb83b16,
  }),

  lights: Object.freeze({
    width: 0.035,
    height: 0.006,
    offset: 0.035,
    dayIntensity: 0.08,
    nightIntensity: 1.8,
    color: COLORS.liveryYellow,
    baseColor: 0x2a2a2a,
  }),

  arch: Object.freeze({
    height: 1.5,
    postSize: 0.1,
    bannerHeight: 0.34,
    bannerDepth: 0.04,
    bannerWidthExtra: 0.22,
    startLineDepth: 0.22,
    startLineHeight: 0.008,
  }),

  checkpoints: Object.freeze({
    // Seven ordered gates including the start/finish line. The first gate is
    // the lap line; the other six keep a lap honest.
    us: Object.freeze([0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84]),
    halfWidthMargin: 0.08,
  }),

  collectibles: Object.freeze({
    // Staggered between checkpoint gates so a clean lap naturally sweeps them
    // up. Nitro is rarer and deliberately sits off the ideal line.
    starUs: Object.freeze([0.07, 0.18, 0.31, 0.45, 0.6, 0.74, 0.88]),
    nitroUs: Object.freeze([0.12, 0.37, 0.55, 0.8]),
    lateral: 0.12,
    hover: 0.17,
    bob: 0.025,
    bobSpeed: 2.4,
    spinSpeed: 1.8,
    pickupRadius: 0.27,
    pickupHeight: 0.34,
    starScore: 100,
    nitroRefill: 0.55,
    popSeconds: 0.28,
  }),
});
