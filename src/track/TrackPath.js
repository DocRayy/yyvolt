/**
 * Owns the one closed Catmull-Rom racing line.
 *
 * TrackBuilder, TrackLights, Checkpoints, and Phase 5 car physics all sample
 * this object instead of keeping their own copy of the layout. Frames are
 * pre-allocated and written into a caller-supplied output so update loops can
 * ask for positions without creating garbage.
 */
import { CatmullRomCurve3, Vector3 } from 'three';
import { TRACK } from '../config/track.config.js';

const WORLD_UP = new Vector3(0, 1, 0);

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

    this.frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };
  }

  /**
   * Write the point, forward tangent, lateral axis, and surface normal at an
   * arc-length parameter u into `out`. `side` points to the track's left edge.
   */
  getFrameAt(u, out = this.frame) {
    this.curve.getPointAt(u, out.position);
    this.curve.getTangentAt(u, out.tangent).normalize();
    out.side.crossVectors(out.tangent, WORLD_UP).normalize();
    out.up.crossVectors(out.side, out.tangent).normalize();
    return out;
  }

  getPointAt(u, target = new Vector3()) {
    return this.curve.getPointAt(u, target);
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
