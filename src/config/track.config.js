import { CAR_WIDTH } from './car.config.js';
import { COLORS } from './constants.js';

/** Bedroom target from the V2 spec: 3.5 car widths. */
const BEDROOM_WIDTH = CAR_WIDTH * 3.5;

/** Bedroom track - the control track used as the baseline for Monaco. */
const BEDROOM_OVAL = Object.freeze({
  halfWidth: 3.35,
  halfDepth: 3.05,
  exponent: 2.25,
  points: 44,
  surfaceY: 0.02,
});

/** Bedroom track - the control track used as the baseline for Monaco. */
export const BEDROOM_TRACK = Object.freeze({
  id: 'bedroom',
  name: 'Bedroom',
  width: BEDROOM_WIDTH,
  samples: 640,
  curveTension: 0.5,
  points: buildCenterline(BEDROOM_OVAL),
});

function buildCenterline({ halfWidth, halfDepth, exponent, points, surfaceY }) {
  const controlPoints = [];
  const power = 2 / exponent;
  for (let i = 0; i < points; i += 1) {
    const t = (i / points) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = halfWidth * Math.sign(c) * Math.abs(c) ** power;
    const z = -halfDepth * Math.sign(s) * Math.abs(s) ** power;
    controlPoints.push(Object.freeze([x, surfaceY, z]));
  }
  return Object.freeze(controlPoints);
}

/** Monaco track: a smooth loop around the island.
 *
 * Scale (computed from the car constants, see docs/v2/V2-5a-monaco.md):
 *   maxSpeed = 7.2 units/s, average speed ~ 7.2 x 0.6 = 4.32 units/s,
 *   target lap length = 4.32 x 60 s = 259.2 world units.
 *
 * Width = 1.68 = 4 x CAR_WIDTH (0.42): 3-4 x CAR_WIDTH as required.
 * Min corner radius = 1.5 x width = 2.52; Grand Hotel hairpin is the tightest.
 * Min separation (parallel and loop-closure sections) >= 2.5 x width = 4.20.
 *
 * Layout: a long start/finish straight runs along z = 0 (the bottom of the
 * loop), from x = -30 (start) to x = +30 (loop closure). The loop rises off
 * the right end of the straight, climbs uphill, sweeps across the top, runs
 * down the left side through the Grand Hotel hairpin (the tightest corner),
 * crosses the bottom-left and returns to the start/finish straight.
 *
 * Clockwise = race direction. 32 control points in clockwise corner order.
 */
const MONACO_POINTS = Object.freeze([
  [-19.5, 0.02, -40.2],
  [-12.9, 0.02, -40.2],
  [-4.4, 0.02, -40.2],
  [4.1, 0.02, -40.2],
  [12.6, 0.02, -40.1],
  [18.0, 0.02, -37.0],
  [19.9, 0.02, -31.0],
  [21.2, 0.02, -23.6],
  [24.4, 0.02, -15.9],
  [27.2, 0.02, -8.0],
  [27.5, 0.02, -0.6],
  [23.3, 0.02, 4.0],
  [17.0, 0.02, 4.8],
  [9.5, 0.02, 4.8],
  [3.8, 0.02, 5.2],
  [0.8, 0.02, 8.2],
  [0.9, 0.02, 12.5],
  [4.0, 0.02, 15.4],
  [8.4, 0.02, 15.8],
  [13.8, 0.02, 15.8],
  [19.7, 0.02, 18.2],
  [21.9, 0.02, 24.0],
  [21.9, 0.02, 30.7],
  [19.4, 0.02, 36.6],
  [13.6, 0.02, 38.8],
  [6.9, 0.02, 38.8],
  [-1.4, 0.02, 40.2],
  [-9.9, 0.02, 39.7],
  [-18.3, 0.02, 38.8],
  [-24.4, 0.02, 37.6],
  [-27.4, 0.02, 33.0],
  [-27.5, 0.02, 27.4],
  [-27.5, 0.02, 20.2],
  [-27.5, 0.02, 11.7],
  [-27.5, 0.02, 3.2],
  [-27.5, 0.02, -5.3],
  [-27.5, 0.02, -13.8],
  [-27.5, 0.02, -22.3],
  [-27.5, 0.02, -30.8],
  [-25.7, 0.02, -37.3],
]);
const SILVERSTONE_POINTS = Object.freeze([
  [-36.2, 0.02, -35.6],
  [-27.4, 0.02, -35.6],
  [-18.5, 0.02, -34.6],
  [-10.1, 0.02, -31.5],
  [-1.1, 0.02, -30.9],
  [5.6, 0.02, -27.1],
  [6.1, 0.02, -20.1],
  [5.1, 0.02, -11.9],
  [4.0, 0.02, -2.9],
  [2.9, 0.02, 6.0],
  [2.6, 0.02, 14.4],
  [7.5, 0.02, 18.6],
  [14.0, 0.02, 17.4],
  [20.7, 0.02, 12.3],
  [27.3, 0.02, 6.2],
  [27.4, 0.02, -2.3],
  [23.8, 0.02, -10.3],
  [27.1, 0.02, -18.4],
  [35.3, 0.02, -21.2],
  [43.3, 0.02, -17.7],
  [44.7, 0.02, -9.5],
  [42.7, 0.02, -0.7],
  [40.8, 0.02, 8.1],
  [38.8, 0.02, 16.9],
  [36.9, 0.02, 25.6],
  [32.1, 0.02, 33.1],
  [23.7, 0.02, 35.6],
  [15.5, 0.02, 32.3],
  [7.4, 0.02, 28.4],
  [-1.2, 0.02, 25.9],
  [-8.2, 0.02, 20.3],
  [-15.4, 0.02, 15.1],
  [-23.2, 0.02, 10.6],
  [-31.1, 0.02, 6.2],
  [-38.9, 0.02, 1.7],
  [-44.2, 0.02, -5.2],
  [-43.2, 0.02, -14.1],
  [-44.7, 0.02, -22.8],
  [-43.9, 0.02, -31.4],
]);

/** The active track plus all rendering and gameplay tuning for it. */
export const TRACK = Object.freeze({
  ...BEDROOM_TRACK,
  surfaceThickness: 0.045,
  physicsSamples: 512,
  surface: Object.freeze({
    textureScale: 1.6,
    roughness: 0.68,
    metalness: 0.02,
  }),
  ramp: Object.freeze({
    center: Object.freeze([0, 3.05]),
    rise: 0.3,
    flat: 0.62,
    fall: 0.3,
    height: 0.24,
    kerbMargin: 0.1,
    stackLateral: 0.94,
    stackBooks: 3,
    bookWidth: 0.5,
    bookDepth: 0.36,
    bookHeight: 0.06,
    bookGap: 0.012,
  }),
  centerLine: Object.freeze({
    width: 0.06,
    height: 0.006,
    dashLength: 0.4,
    gapLength: 0.3,
  }),
  kerb: Object.freeze({
    width: 0.2,
    height: 0.055,
    length: 0.4,
    gap: 0.02,
    offset: 0.018,
    colors: Object.freeze([COLORS.kerbRed, COLORS.paper]),
    polygonOffset: Object.freeze({ factor: -2, units: -2 }),
  }),
  joint: Object.freeze({
    spacing: 4.4,
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
    us: Object.freeze([0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.86]),
    halfWidthMargin: 0.08,
  }),
  collectibles: Object.freeze({
    starUs: Object.freeze([0.07, 0.18, 0.31, 0.45, 0.6, 0.74, 0.9]),
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
  collision: Object.freeze({
    samples: 1024,
    carHalfWidth: CAR_WIDTH / 2,
    restitution: 0.25,
    wallFriction: 0.12,
    localWindow: 24,
    lostDistance: 1.6,
    eventCooldown: 0.14,
    impactThreshold: 0.35,
  }),
});

/** Every track the validator must check. */
export const TRACK_DEFINITIONS = Object.freeze([
  BEDROOM_TRACK,
  {
    id: 'monaco',
    name: 'Monaco',
    width: 1.68,
    samples: 600,
    curveTension: 0.5,
    points: MONACO_POINTS,
  },
  {
    id: 'silverstone',
    name: 'Silverstone',
    width: 1.68,
    samples: 600,
    curveTension: 0.5,
    points: SILVERSTONE_POINTS,
  },
]);
