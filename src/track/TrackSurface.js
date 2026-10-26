/**
 * Fast lookup for the surface under the car.
 *
 * The car needs three answers every fixed step: is it on the toy track, how
 * high is that surface, and (for the ramp) what is the local slope? Re-sampling
 * the Catmull-Rom curve each step would allocate and waste time. Instead the
 * closed curve is baked once into a short polyline of segments, and the lookup
 * projects the car onto the nearest segment. Off-track the car drops to the rug
 * or the wooden floor, which Phase 7 will use for collisions.
 */
import { Vector3 } from 'three';
import { ROOM } from '../config/constants.js';
import { TRACK } from '../config/track.config.js';

export class TrackSurface {
  constructor(trackPath) {
    this.trackPath = trackPath;
    this.halfWidth = trackPath.halfWidth;

    const count = TRACK.physicsSamples;
    this.count = count;
    this.segmentX = new Float32Array(count);
    this.segmentZ = new Float32Array(count);
    this.segmentDx = new Float32Array(count);
    this.segmentDz = new Float32Array(count);
    this.segmentInvLen2 = new Float32Array(count);
    this.segmentY0 = new Float32Array(count);
    this.segmentY1 = new Float32Array(count);

    const p0 = new Vector3();
    const p1 = new Vector3();
    for (let i = 0; i < count; i += 1) {
      trackPath.getPointAt(i / count, p0);
      trackPath.getPointAt((i + 1) / count, p1);
      const dx = p1.x - p0.x;
      const dz = p1.z - p0.z;
      const length2 = dx * dx + dz * dz;

      this.segmentX[i] = p0.x;
      this.segmentZ[i] = p0.z;
      this.segmentDx[i] = dx;
      this.segmentDz[i] = dz;
      this.segmentInvLen2[i] = length2 > 1e-8 ? 1 / length2 : 0;
      this.segmentY0[i] = p0.y;
      this.segmentY1[i] = p1.y;
    }

    const rug = ROOM.rug;
    this.rugX = rug.position[0];
    this.rugZ = rug.position[2];
    this.rugY = rug.position[1];
    this.rugHalfWidth = rug.size[0] / 2;
    this.rugHalfDepth = rug.size[1] / 2;
    this.rugCos = Math.cos(rug.rotation);
    this.rugSin = Math.sin(rug.rotation);
  }

  /** Allocate the reusable result objects used by ToyF1Car. */
  createResult() {
    return { onTrack: false, onRug: false, height: 0, distance: 0 };
  }

  /**
   * Project (x, z) onto the nearest track segment and write the result into
   * `out`. Allocation-free after construction.
   */
  sample(x, z, out) {
    let bestDistance2 = Infinity;
    let bestHeight = 0;

    for (let i = 0; i < this.count; i += 1) {
      const dx = x - this.segmentX[i];
      const dz = z - this.segmentZ[i];
      let t =
        (dx * this.segmentDx[i] + dz * this.segmentDz[i]) *
        this.segmentInvLen2[i];
      t = t < 0 ? 0 : t > 1 ? 1 : t;

      const cx = this.segmentX[i] + this.segmentDx[i] * t;
      const cz = this.segmentZ[i] + this.segmentDz[i] * t;
      const ox = x - cx;
      const oz = z - cz;
      const distance2 = ox * ox + oz * oz;

      if (distance2 < bestDistance2) {
        bestDistance2 = distance2;
        bestHeight =
          this.segmentY0[i] + (this.segmentY1[i] - this.segmentY0[i]) * t;
      }
    }

    out.distance = Math.sqrt(bestDistance2);
    out.onTrack = out.distance <= this.halfWidth;
    out.onRug = false;

    if (out.onTrack) {
      out.height = bestHeight;
      return out;
    }

    // Outside the ribbon the car is on the rug or the bare floor. The rug is
    // almost axis aligned, but rotate into its local frame so the corners are
    // still honest if a designer nudges its rotation.
    const dx = x - this.rugX;
    const dz = z - this.rugZ;
    const localX = dx * this.rugCos - dz * this.rugSin;
    const localZ = dx * this.rugSin + dz * this.rugCos;
    if (
      Math.abs(localX) <= this.rugHalfWidth &&
      Math.abs(localZ) <= this.rugHalfDepth
    ) {
      out.onRug = true;
      out.height = this.rugY;
    } else {
      out.height = 0;
    }

    return out;
  }
}
