/**
 * Global tuning constants.
 *
 * Anything a designer is likely to tweak lives here so the rest of the code
 * stays free of magic numbers. Colours mirror the CSS variables in the boot
 * shell and, from Phase 9, theme.css. The 3D side uses numeric hex values.
 */

export const COLORS = Object.freeze({
  liveryYellow: 0xffc20e,
  liveryNavy: 0x12223f,
  trackOrange: 0xf4511e,
  kerbRed: 0xd7263d,
  paper: 0xf4f6f8,
  steel: 0x8a94a6,
  positive: 0x2bb673,
});

export const RENDERER = Object.freeze({
  maxPixelRatio: 2,
  exposure: 1.05,
  shadowMapSize: 2048,
  antialias: true,
});

export const TIMING = Object.freeze({
  fixedStep: 1 / 60,
  maxSubsteps: 5,
  maxFrameDelta: 0.25,
});

export const BOOT = Object.freeze({
  // Long enough for the progress bar to read as real work, short enough that
  // reloading during development never feels slow.
  minDurationMs: 1100,
});

export const TOAST = Object.freeze({
  durationMs: 2200,
});

export const ENVIRONMENT = Object.freeze({
  // Reflections stay subtle; the room should read as plaster and wood, not chrome.
  intensity: 0.32,
  sigma: 0.04,
});

export const LIGHTING = Object.freeze({
  shadowBounds: 7.5,
  shadowNear: 0.5,
  shadowFar: 22,
  shadowBias: -0.0004,
  shadowNormalBias: 0.03,
  shadowRadius: 4,
  shadowIntensity: 0.85,
});

/** Room shell measurements. The room is 12 x 3.5 x 10 world units. */
export const ROOM = Object.freeze({
  width: 12,
  depth: 10,
  height: 3.5,
  rug: {
    position: [0.2, 0.012, 0.7],
    size: [5.2, 3.6],
    rotation: 0.015,
  },
  baseboard: { height: 0.14, thickness: 0.04 },
  window: {
    position: [0.9, 2, -4.955],
    size: [2.8, 1.75],
  },
  door: {
    position: [-4.15, 0, 4.955],
    size: [1.15, 2.3],
  },
  posters: [
    {
      id: 'yyvolt',
      position: [2.93, 2.35, -4.955],
      rotationY: 0,
      size: [0.9, 1.2],
    },
    {
      id: 'space',
      position: [-3.3, 2.55, -4.955],
      rotationY: 0,
      size: [1.25, 1.65],
    },
    {
      id: 'track',
      position: [-5.955, 2.15, 3.4],
      rotationY: Math.PI / 2,
      size: [1.4, 1.65],
    },
  ],
  ceilingLamp: {
    position: [0, 3.5, 0.4],
    cordLength: 0.4,
    shadeRadius: 0.34,
    shadeHeight: 0.26,
  },
});

/**
 * Furniture transforms. Each builder reads its own entry so moving a piece is
 * a one-line change, and Phase 4 can route the track around the real layout.
 */
export const FURNITURE_LAYOUT = Object.freeze({
  bed: {
    position: [-3.35, 0, -2.75],
    width: 2.7,
    length: 4.1,
    legHeight: 0.34,
    mattressHeight: 0.3,
    headboardHeight: 1.15,
  },
  bedside: {
    position: [-1.55, 0, -4.3],
    width: 0.72,
    depth: 0.62,
    height: 0.66,
  },
  desk: {
    position: [5.35, 0, -2],
    width: 1,
    length: 2.3,
    height: 1.12,
  },
  chair: {
    // Tucked under the desk and clear of the widened right-hand straight.
    position: [4.55, 0, -2],
    rotationY: Math.PI / 2,
  },
  wardrobe: {
    position: [-5.5, 0, 1.3],
    width: 0.85,
    length: 2,
    height: 2.8,
  },
  bookshelf: {
    position: [4.25, 0, -4.72],
    width: 1.6,
    depth: 0.4,
    height: 2.35,
  },
  toyBox: {
    // Front-right corner, outside the widened track and away from the door.
    position: [4.85, 0, 4.3],
    width: 2,
    depth: 1.15,
    height: 0.78,
  },
});

/** Loose floor props: colour and toy-scale storytelling, kept off the ribbon. */
export const PROPS_LAYOUT = Object.freeze({
  lego: [
    {
      // Infield, between the start straight and the rug.
      position: [-1.9, 0, 1.15],
      rotationY: 0.35,
      color: 'yellow',
      studs: [3, 2],
    },
    {
      // Front strip, beside the ramp's outer book stack.
      position: [1.3, 0, 4.35],
      rotationY: -0.2,
      color: 'navy',
      studs: [2, 2],
    },
    {
      // Right-hand strip, between the track and the wall.
      position: [5.45, 0, 3.4],
      rotationY: 0.9,
      color: 'red',
      studs: [2, 3],
    },
  ],
  ball: { position: [5.5, 0.3, 1.1], radius: 0.3 },
  books: { position: [5.2, 0, 2.85], rotationY: -0.15 },
  teddy: { position: [-0.7, 0, 1.7], rotationY: 0.35 },
  crayons: { position: [1.5, 0, 0.4], rotationY: 0.4 },
  rocket: { position: [5.5, 0, 2], rotationY: -0.3 },
});

/** Shared material tints for the room and furniture. */
export const MATERIALS = Object.freeze({
  wood: 0x9a6b43,
  woodDark: 0x6b472e,
  woodLight: 0xc08a5a,
  wall: 0xe9e1d4,
  ceiling: 0xf4efe6,
  paper: 0xf4f6f8,
  steel: 0x8a94a6,
  fabricNavy: 0x12223f,
  fabricCream: 0xe8dfcc,
  teddy: 0xb9825a,
  teddyDark: 0x8a5a3b,
  bookColors: [0xd7263d, 0xffc20e, 0x12223f, 0x8a94a6, 0xf4f6f8, 0x9a6b43],
});
