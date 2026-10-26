/**
 * Collision tuning and the static obstacle boxes the toy car can hit.
 *
 * The room walls are handled analytically by CollisionWorld. These boxes cover
 * furniture and loose floor props at their real footprints; the bed contributes
 * only its four legs because the track deliberately runs under the raised frame.
 * The picture-book stack under the ramp is omitted for the same reason.
 *
 * Boxes are axis-aligned on purpose: an arcade car at this scale does not need
 * per-triangle collision, and an AABB keeps the fixed step allocation-free.
 * When a layout entry moves, update the matching box here.
 */
import {
  FURNITURE_LAYOUT,
  PROPS_LAYOUT,
} from './constants.js';

export const COLLISION = Object.freeze({
  // A short wall tolerance keeps the body clear of the painted wall plane.
  wallInset: 0.03,
  // Two probes approximate the capsule of the car: a narrow nose and tail with
  // a slightly wider middle. Offsets are metres along the car's forward axis.
  probes: Object.freeze([
    Object.freeze({ offset: 0.22, radius: 0.12 }),
    Object.freeze({ offset: -0.18, radius: 0.12 }),
  ]),
  // The car clears low props while climbing the ramp once its belly is above
  // this height; lids and crates near the floor still stop it.
  probeHeight: 0.08,
  restitution: 0.28,
  tangentRetention: 0.82,
  impactThreshold: 0.8,
  eventCooldown: 0.14,
});

function box(name, x, z, halfX, halfZ, top) {
  return Object.freeze({
    name,
    minX: x - halfX,
    maxX: x + halfX,
    minZ: z - halfZ,
    maxZ: z + halfZ,
    top,
  });
}

/** Rotate a rectangular footprint and return its axis-aligned half extents. */
function rotatedHalf(width, depth, angle) {
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return {
    halfX: (width * c + depth * s) / 2,
    halfZ: (width * s + depth * c) / 2,
  };
}

const obstacles = [];
const bed = FURNITURE_LAYOUT.bed;
const bedside = FURNITURE_LAYOUT.bedside;
const desk = FURNITURE_LAYOUT.desk;
const chair = FURNITURE_LAYOUT.chair;
const wardrobe = FURNITURE_LAYOUT.wardrobe;
const bookshelf = FURNITURE_LAYOUT.bookshelf;
const toyBox = FURNITURE_LAYOUT.toyBox;

// The bed frame is raised, so only the four legs are solid.
const bedLegX = bed.width / 2 - 0.1;
const bedLegZ = bed.length / 2 - 0.1;
for (const sideX of [-1, 1]) {
  for (const sideZ of [-1, 1]) {
    obstacles.push(
      box(
        'bed leg',
        bed.position[0] + sideX * bedLegX,
        bed.position[2] + sideZ * bedLegZ,
        0.07,
        0.07,
        bed.legHeight,
      ),
    );
  }
}

obstacles.push(
  box(
    'bedside table',
    bedside.position[0],
    bedside.position[2],
    bedside.width / 2,
    bedside.depth / 2,
    bedside.height,
  ),
);

// The desk and chair are treated as solid below their tops. The car is short
// enough to fit under the desk visually, but blocking the footprint stops it
// from clipping through legs and the drawer at speed.
const chairHalf = rotatedHalf(0.66, 0.66, chair.rotationY);
obstacles.push(
  box(
    'desk',
    desk.position[0],
    desk.position[2],
    desk.width / 2,
    desk.length / 2,
    desk.height,
  ),
  box(
    'chair',
    chair.position[0],
    chair.position[2],
    chairHalf.halfX,
    chairHalf.halfZ,
    0.52,
  ),
  box(
    'wardrobe',
    wardrobe.position[0],
    wardrobe.position[2],
    wardrobe.width / 2,
    wardrobe.length / 2,
    wardrobe.height,
  ),
  box(
    'bookshelf',
    bookshelf.position[0],
    bookshelf.position[2],
    bookshelf.width / 2,
    bookshelf.depth / 2,
    bookshelf.height,
  ),
  box(
    'toy box',
    toyBox.position[0],
    toyBox.position[2],
    toyBox.width / 2,
    toyBox.depth / 2,
    toyBox.height,
  ),
);

for (const [index, lego] of PROPS_LAYOUT.lego.entries()) {
  const half = rotatedHalf(lego.studs[0] * 0.12, lego.studs[1] * 0.12, lego.rotationY);
  obstacles.push(
    box(
      `lego brick ${index + 1}`,
      lego.position[0],
      lego.position[2],
      half.halfX,
      half.halfZ,
      0.18,
    ),
  );
}

const ball = PROPS_LAYOUT.ball;
const teddy = PROPS_LAYOUT.teddy;
const crayons = PROPS_LAYOUT.crayons;
const rocket = PROPS_LAYOUT.rocket;

obstacles.push(
  box('ball', ball.position[0], ball.position[2], ball.radius, ball.radius, ball.radius * 2),
  box('teddy', teddy.position[0], teddy.position[2], 0.32, 0.3, 0.9),
  box('crayons', crayons.position[0], crayons.position[2], 0.2, 0.16, 0.07),
  box('toy rocket', rocket.position[0], rocket.position[2], 0.2, 0.2, 0.82),
);

export const OBSTACLES = Object.freeze(obstacles.map((entry) => Object.freeze(entry)));
