/**
 * Fast lookup for the height of the track under the car.
 *
 * The car cannot leave the ribbon (TrackCollider enforces that), so the only
 * question left is how high the surface is and how steep it is. Re-sampling the
 * Catmull-Rom curve every step would allocate; instead the closed curve is
 * baked once into a short polyline and the lookup projects the car onto the
 * nearest segment. Segment heights come from TrackPath, so the ramp is included
 * automatically.
 */
import { Vector3 } from 'three';
import { TRACK } from '../config/track.config.js';

export class TrackSurface {
  constructor(trackPath) {
    this.trackPath = trackPath;

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
  }

  /** Allocate the reusable result object used by ToyF1Car. */
  createResult() {
    return { height: 0 };
  }

  /**
   * Project (x, z) onto the nearest track segment and write its height into
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

    out.height = bestHeight;
    return out;
  }
}
