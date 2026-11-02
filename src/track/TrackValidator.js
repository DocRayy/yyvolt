/**
 * Pure-math track validator.
 *
 * The toy track has to stay readable: two parts of the loop that a player sees
 * as separate must never touch, and no corner may be so tight that the ribbon
 * folds over itself. This module samples the centreline and checks those two
 * geometric promises plus width, self-intersection, and ribbon subdivision.
 *
 * It deliberately imports no DOM or scene code. Vite runs it in development
 * (TrackPath) and `npm run check:tracks` runs the exact same function in Node,
 * so the geometry the game draws is the geometry that gets checked.
 */
import { CatmullRomCurve3, Vector3 } from 'three';
import { CAR_WIDTH } from '../config/car.config.js';

/** Rules from V2-SPEC. Width factors are multiples of the car width. */
export const TRACK_RULES = Object.freeze({
  minWidthFactor: 3,
  separationFactor: 2.5,
  radiusFactor: 1.5,
  minSamples: 400,
  subdivisionsPerSpan: 10,
  // Enough samples that a 2.2-unit corner still spans ~500 of them.
  analysisSamples: 1200,
  /**
   * Curvature is measured between samples this far apart, not between three
   * neighbours. A Catmull-Rom spline carries sub-millimetre ripples wherever
   * curvature changes; a three-sample stencil turns those ripples into
   * reported hairpins. A 0.15 baseline is ~7% of the minimum legal radius, so a
   * genuinely tight corner still reads correctly while spline noise does not.
   */
  curvatureBaseline: 0.15,
  maxErrors: 12,
});

const ALMOST_ZERO = 1e-9;

function buildCurve(definition) {
  const points = definition.points.map(([x, y, z]) => new Vector3(x, y, z));
  return new CatmullRomCurve3(
    points,
    true,
    'catmullrom',
    definition.curveTension ?? 0.5,
  );
}

/** Shortest distance between two loop indices, measured in sample steps. */
function loopIndexDistance(a, b, count) {
  const raw = Math.abs(a - b);
  return Math.min(raw, count - raw);
}

/** Proper 2D segment intersection; touching endpoints count as adjacent. */
function segmentsCross(ax, az, bx, bz, cx, cz, dx, dz) {
  const abx = bx - ax;
  const abz = bz - az;
  const cdx = dx - cx;
  const cdz = dz - cz;

  const denominator = abx * cdz - abz * cdx;
  if (Math.abs(denominator) < ALMOST_ZERO) return false;

  const acx = cx - ax;
  const acz = cz - az;
  const t = (acx * cdz - acz * cdx) / denominator;
  const u = (acx * abz - acz * abx) / denominator;
  const epsilon = 1e-5;

  return t > epsilon && t < 1 - epsilon && u > epsilon && u < 1 - epsilon;
}

/** Circumradius of a triangle, or Infinity for three collinear points. */
function triangleRadius(a, b, c) {
  const ab = Math.hypot(b.x - a.x, b.z - a.z);
  const bc = Math.hypot(c.x - b.x, c.z - b.z);
  const ca = Math.hypot(a.x - c.x, a.z - c.z);
  const area2 = Math.abs(
    (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x),
  );
  if (area2 < ALMOST_ZERO) return Infinity;
  return (ab * bc * ca) / (2 * area2);
}

/**
 * Validate one track definition.
 *
 * @param {{
 *   id: string,
 *   name: string,
 *   width: number,
 *   samples: number,
 *   points: readonly (readonly number[])[],
 *   curveTension?: number,
 * }} definition
 * @returns {{
 *   id: string,
 *   name: string,
 *   ok: boolean,
 *   errors: string[],
 *   stats: {
 *     width: number,
 *     length: number,
 *     minRadius: number,
 *     minSeparation: number,
 *     samplesPerSpan: number,
 *     samples: number,
 *   },
 * }}
 */
export function validateTrack(definition) {
  const errors = [];
  const name = definition.name ?? definition.id ?? 'Track';
  const width = definition.width;
  const spanCount = definition.points.length;

  const minWidth = CAR_WIDTH * TRACK_RULES.minWidthFactor;
  const minSeparation = width * TRACK_RULES.separationFactor;
  const minRadius = width * TRACK_RULES.radiusFactor;
  const requiredRibbonSamples = Math.max(
    TRACK_RULES.minSamples,
    spanCount * TRACK_RULES.subdivisionsPerSpan,
  );

  if (!(spanCount >= 3)) {
    errors.push(`centreline needs at least 3 control points, got ${spanCount}`);
  }
  if (!(width >= minWidth)) {
    errors.push(
      `width ${width.toFixed(2)} is below ${TRACK_RULES.minWidthFactor} x CAR_WIDTH (${minWidth.toFixed(2)})`,
    );
  }
  if (!(definition.samples >= requiredRibbonSamples)) {
    errors.push(
      `ribbon samples ${definition.samples} is below ${requiredRibbonSamples} (${TRACK_RULES.subdivisionsPerSpan} per control-point span)`,
    );
  }

  const curve = buildCurve(definition);
  const length = curve.getLength();
  const sampleCount = Math.max(
    TRACK_RULES.analysisSamples,
    requiredRibbonSamples,
  );
  // getSpacedPoints returns the closing point too; the loop uses the first
  // `sampleCount` entries so every sample is unique.
  const spaced = curve.getSpacedPoints(sampleCount);
  const points = spaced.slice(0, sampleCount);
  const spacing = length / sampleCount;

  // Tight corners, measured across a short baseline (see curvatureBaseline).
  const stride = Math.max(1, Math.round(TRACK_RULES.curvatureBaseline / spacing));
  let smallestRadius = Infinity;
  let smallestRadiusU = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const a = points[(i - stride + sampleCount) % sampleCount];
    const b = points[i];
    const c = points[(i + stride) % sampleCount];
    const radius = triangleRadius(a, b, c);
    if (radius < smallestRadius) {
      smallestRadius = radius;
      smallestRadiusU = i / sampleCount;
    }
  }
  if (smallestRadius < minRadius) {
    errors.push(
      `corner radius ${smallestRadius.toFixed(2)} at u=${smallestRadiusU.toFixed(3)} is below ${minRadius.toFixed(2)} (${TRACK_RULES.radiusFactor} x width)`,
    );
  }

  // Parallel sections. Two samples are "adjacent" when they are within one
  // corner of each other along the loop (2 x the minimum radius also covers
  // the two sides of a 180 degree hairpin, which must still be checked).
  // Everything further apart must also be apart in space.
  const localWindow = Math.ceil(
    Math.max(minSeparation, minRadius * 2) / spacing,
  );
  let closest = Infinity;
  let closenessReports = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const a = points[i];
    for (let j = i + 1; j < sampleCount; j += 1) {
      if (loopIndexDistance(i, j, sampleCount) <= localWindow) continue;

      const b = points[j];
      const dx = a.x - b.x;
      const dz = a.z - b.z;
      const distance = Math.hypot(dx, dz);
      if (distance < closest) closest = distance;
      if (distance < minSeparation && closenessReports < 3) {
        closenessReports += 1;
        errors.push(
          `sections ${distance.toFixed(2)} apart at u=${(i / sampleCount).toFixed(3)} and u=${(j / sampleCount).toFixed(3)} (minimum ${minSeparation.toFixed(2)})`,
        );
      }
    }
  }

  // Self-intersection. Adjacent segments share an endpoint by definition, so
  // they are skipped by index.
  let crossingReports = 0;
  for (let i = 0; i < sampleCount && crossingReports < 3; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % sampleCount];
    for (let j = i + 1; j < sampleCount; j += 1) {
      const gap = loopIndexDistance(i, j, sampleCount);
      if (gap <= 1) continue;

      const c = points[j];
      const d = points[(j + 1) % sampleCount];
      if (segmentsCross(a.x, a.z, b.x, b.z, c.x, c.z, d.x, d.z)) {
        crossingReports += 1;
        errors.push(
          `centreline self-intersects at u=${(i / sampleCount).toFixed(3)} and u=${(j / sampleCount).toFixed(3)}`,
        );
        break;
      }
    }
  }

  const stats = {
    width,
    length,
    minRadius: smallestRadius,
    minSeparation: closest,
    samplesPerSpan: definition.samples / spanCount,
    samples: sampleCount,
  };

  return {
    id: definition.id,
    name,
    ok: errors.length === 0,
    errors: errors.slice(0, TRACK_RULES.maxErrors),
    stats,
  };
}

/** One-line stats for the dev console and the check:tracks script. */
export function formatTrackStats(result) {
  const s = result.stats;
  return [
    `width ${s.width.toFixed(2)}`,
    `length ${s.length.toFixed(2)}`,
    `min radius ${s.minRadius.toFixed(2)}`,
    `min separation ${s.minSeparation.toFixed(2)}`,
    `${s.samplesPerSpan.toFixed(1)} ribbon subdivisions per span`,
  ].join(', ');
}
