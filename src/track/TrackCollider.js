/**
 * Invisible track walls.
 *
 * The car is only ever allowed to be on the toy track, so the wall is not a
 * physical object in the room: it is a lateral clamp around the centreline.
 * Every sample stores position, tangent, and the left-pointing normal; each
 * physics step projects the car onto the nearest one and, when the lateral
 * offset exceeds halfWidth - carHalfWidth, pushes it back and reflects the
 * outward part of its velocity.
 *
 * Once built, the module touches no scene objects: it stores flat Float32Arrays
 * and mutates plain {x, z} objects, which keeps the fixed step allocation-free
 * and makes the maths easy to reason about (everything happens in the XZ plane,
 * so ramps and tunnels need no special case).
 */
import { Vector3 } from 'three';
import { TRACK } from '../config/track.config.js';

export class TrackCollider {
  constructor(trackPath, { bus = null } = {}) {
    const config = TRACK.collision;
    const count = config.samples;

    this.bus = bus;
    this.trackPath = trackPath;
    this.count = count;
    this.config = config;
    this.halfWidth = trackPath.halfWidth;
    this.limit = trackPath.halfWidth - config.carHalfWidth;
    this.spacing = trackPath.length / count;
    this.lostDistance2 = config.lostDistance * config.lostDistance;

    this.x = new Float32Array(count);
    this.y = new Float32Array(count);
    this.z = new Float32Array(count);
    this.nx = new Float32Array(count);
    this.nz = new Float32Array(count);
    this.tx = new Float32Array(count);
    this.tz = new Float32Array(count);

    // TrackPath writes into Vector3s, so the bake uses real vectors. They are
    // allocated once here and never touched again.
    const frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };

    for (let i = 0; i < count; i += 1) {
      const u = i / count;
      trackPath.getFrameAt(u, frame);
      this.x[i] = frame.position.x;
      this.y[i] = frame.position.y;
      this.z[i] = frame.position.z;
      this.nx[i] = frame.side.x;
      this.nz[i] = frame.side.z;
      this.tx[i] = frame.tangent.x;
      this.tz[i] = frame.tangent.z;
    }

    this.index = -1;
    this.cooldown = 0;
    this.hit = {
      impact: 0,
      strength: 0,
      normalX: 0,
      normalZ: 0,
      side: 0,
      x: 0,
      y: 0,
      z: 0,
    };
    this.event = {
      strength: 0,
      impact: 0,
      normalX: 0,
      normalZ: 0,
      side: 0,
      x: 0,
      y: 0,
      z: 0,
    };
  }

  /** Forget the cached nearest sample (after a respawn or a teleport). */
  reset() {
    this.index = -1;
    this.cooldown = 0;
  }

  /**
   * Nearest centreline sample. Searches a window around the last index, which
   * is all a car moving at 10 units/s needs; a global scan only happens on the
   * first step or when the car was moved somewhere else entirely.
   */
  findNearest(x, z) {
    const count = this.count;
    const window = this.config.localWindow;

    if (this.index >= 0) {
      let bestIndex = this.index;
      let bestDistance2 = Infinity;

      for (let offset = -window; offset <= window; offset += 1) {
        const i = (this.index + offset + count) % count;
        const dx = x - this.x[i];
        const dz = z - this.z[i];
        const distance2 = dx * dx + dz * dz;
        if (distance2 < bestDistance2) {
          bestDistance2 = distance2;
          bestIndex = i;
        }
      }

      if (bestDistance2 <= this.lostDistance2) {
        this.index = bestIndex;
        return bestIndex;
      }
    }

    let bestIndex = 0;
    let bestDistance2 = Infinity;
    for (let i = 0; i < count; i += 1) {
      const dx = x - this.x[i];
      const dz = z - this.z[i];
      const distance2 = dx * dx + dz * dz;
      if (distance2 < bestDistance2) {
        bestDistance2 = distance2;
        bestIndex = i;
      }
    }

    this.index = bestIndex;
    return bestIndex;
  }

  /**
   * Clamp the car inside the ribbon for one substep.
   *
   * @param {{x:number, y:number, z:number}} position Mutated in place.
   * @param {{x:number, y:number, z:number}} velocity Mutated in place.
   * @param {number} dt Substeps length in seconds (used for event throttling).
   * @returns {object|null} Reused hit record, or null when the car is inside.
   */
  resolve(position, velocity, dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);

    const i = this.findNearest(position.x, position.z);
    const nx = this.nx[i];
    const nz = this.nz[i];
    const lateral = (position.x - this.x[i]) * nx + (position.z - this.z[i]) * nz;
    const distance = Math.abs(lateral);

    if (distance <= this.limit) return null;

    // 1. Put the centre back exactly on the limit along the wall normal. Using
    // the excess (not the absolute offset) keeps the car's progress along the
    // track intact, so sliding along a wall never loses forward motion.
    const side = lateral >= 0 ? 1 : -1;
    const excess = distance - this.limit;
    position.x -= nx * excess * side;
    position.z -= nz * excess * side;

    // 2. Outward normal for this wall, then reflect only the part of the
    // velocity that is actually pushing into it.
    const wallX = nx * side;
    const wallZ = nz * side;
    const outwardSpeed = velocity.x * wallX + velocity.z * wallZ;
    let impact = 0;

    if (outwardSpeed > 0) {
      const retention = 1 - this.config.wallFriction;
      const tangentX = velocity.x - outwardSpeed * wallX;
      const tangentZ = velocity.z - outwardSpeed * wallZ;
      const bounce = outwardSpeed * this.config.restitution;

      velocity.x = tangentX * retention - bounce * wallX;
      velocity.z = tangentZ * retention - bounce * wallZ;
      impact = outwardSpeed;
    }

    const hit = this.hit;
    hit.impact = impact;
    hit.normalX = wallX;
    hit.normalZ = wallZ;
    hit.side = side;
    hit.x = position.x;
    hit.y = position.y;
    hit.z = position.z;

    // 3. One event per scrape. The cooldown keeps a long slide against a wall
    // from machine-gunning the sound and the camera shake.
    if (impact >= this.config.impactThreshold && this.cooldown <= 0) {
      this.cooldown = this.config.eventCooldown;
      const event = this.event;
      event.strength = Math.min(impact / 6, 1.4);
      event.impact = impact;
      event.normalX = wallX;
      event.normalZ = wallZ;
      event.side = side;
      event.x = hit.x;
      event.y = hit.y;
      event.z = hit.z;
      this.bus?.emit('car:collide', event);
    }

    return hit;
  }

  /**
   * Two closed polylines at the ribbon edge, for `?debug=colliders`.
   * Returned as flat x, y, z arrays so the caller can build a BufferGeometry
   * without knowing anything about the collider internals.
   */
  getDebugEdges() {
    const count = this.count;
    const left = new Float32Array((count + 1) * 3);
    const right = new Float32Array((count + 1) * 3);
    const lift = 0.012;
    const edge = this.halfWidth;

    for (let i = 0; i <= count; i += 1) {
      const s = i % count;
      const o = i * 3;
      left[o] = this.x[s] + this.nx[s] * edge;
      left[o + 1] = this.y[s] + lift;
      left[o + 2] = this.z[s] + this.nz[s] * edge;
      right[o] = this.x[s] - this.nx[s] * edge;
      right[o + 1] = this.y[s] + lift;
      right[o + 2] = this.z[s] - this.nz[s] * edge;
    }

    return { left, right };
  }
}
