/**
 * Owns the one closed Catmull-Rom racing line.
 *
 * TrackBuilder, TrackLights, Checkpoints, TrackCollider, and the car physics all
 * sample this object instead of keeping their own copy of the layout. Frames are
 * pre-allocated and written into a caller-supplied output so update loops can
 * ask for positions without creating garbage.
 *
 * The ramp is a height profile applied on top of the flat plan-view curve: the
 * 2D centreline stays smooth (which keeps the corner-radius check meaningful),
 * while the surface climbs over the picture books on the front straight.
 */
import { CatmullRomCurve3, Vector3 } from 'three';
import { TRACK } from '../config/track.config.js';
import { smoothstep } from '../utils/math.js';
import { formatTrackStats, validateTrack } from './TrackValidator.js';

const WORLD_UP = new Vector3(0, 1, 0);
const RAMP_SEARCH_SAMPLES = 1024;

export class TrackPath {
  constructor() {
    const points = TRACK.points.map(
      ([x, y, z]) => new Vector3(x, y, z),
    );

    this.curve = new CatmullRomCurve3(
      points,
      true,
      'catmullrom',
      TRACK.curveTension,
    );
    this.width = TRACK.width;
    this.halfWidth = TRACK.width / 2;
    this.length = this.curve.getLength();
    this.ramp = TRACK.ramp;
    this.rampCenterU = this.findRampCenterU();
    this.rampLength = this.ramp.rise + this.ramp.flat + this.ramp.fall;

    this.frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };

    // A broken centreline invalidates the ribbon, the walls, and every lap
    // gate at once, so say so loudly the moment it happens in development.
    if (import.meta.env?.DEV) {
      const result = validateTrack(TRACK);
      if (!result.ok) {
        console.error(
          `Track "${result.name}" fails V2 validation:\n${result.errors
            .map((error) => `  - ${error}`)
            .join('\n')}`,
        );
      } else {
        console.info(`Track "${result.name}": ${formatTrackStats(result)}`);
      }
    }
  }

  /**
   * Find the curve parameter closest to the ramp's plan-view anchor. Sampling
   * once at load keeps `ramp.center` readable in the config instead of forcing
   * a designer to know the arc-length parameter of the front straight.
   */
  findRampCenterU() {
    const [targetX, targetZ] = this.ramp.center;
    const point = new Vector3();
    let bestDistance = Infinity;
    let bestU = 0;

    for (let i = 0; i < RAMP_SEARCH_SAMPLES; i += 1) {
      const u = i / RAMP_SEARCH_SAMPLES;
      this.curve.getPointAt(u, point);
      const dx = point.x - targetX;
      const dz = point.z - targetZ;
      const distance = dx * dx + dz * dz;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestU = u;
      }
    }

    return bestU;
  }

  /** Signed distance in curve-parameter space from the ramp centre, -0.5..0.5. */
  rampOffset(u) {
    const raw = u - this.rampCenterU;
    return raw - Math.floor(raw + 0.5);
  }

  /** Surface height added by the ramp at parameter u. */
  rampHeightAt(u) {
    const distance = Math.abs(this.rampOffset(u)) * this.length;
    const halfFlat = this.ramp.flat / 2;

    if (distance <= halfFlat) return this.ramp.height;

    const slope = (distance - halfFlat) / this.ramp.rise;
    if (slope >= 1) return 0;

    return this.ramp.height * (1 - smoothstep(0, 1, slope));
  }

  /** True when u sits on the ramp (plus an optional margin in world units). */
  isOnRamp(u, margin = 0) {
    const distance = Math.abs(this.rampOffset(u)) * this.length;
    return distance <= this.rampLength / 2 + margin;
  }

  /**
   * Write the point, forward tangent, lateral axis, and surface normal at an
   * arc-length parameter u into `out`. `side` points to the track's left edge.
   */
  getFrameAt(u, out = this.frame) {
    this.getPointAt(u, out.position);
    this.getTangentAt(u, out.tangent);
    out.side.crossVectors(out.tangent, WORLD_UP).normalize();
    out.up.crossVectors(out.side, out.tangent).normalize();
    return out;
  }

  getPointAt(u, target = new Vector3()) {
    this.curve.getPointAt(u, target);
    target.y += this.rampHeightAt(u);
    return target;
  }

  getTangentAt(u, target = new Vector3()) {
    return this.curve.getTangentAt(u, target).normalize();
  }

  /** Convert a world distance along the ribbon into the 0..1 curve parameter. */
  distanceToU(distance) {
    if (this.length <= 0) return 0;
    return ((distance / this.length) % 1 + 1) % 1;
  }
}
