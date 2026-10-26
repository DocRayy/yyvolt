/**
 * Resolves the toy car against the room walls and static furniture boxes.
 *
 * The car is modelled as two circle probes (nose and tail) so a long, narrow
 * toy does not feel like a beach ball when it touches a wall. Resolution works
 * on the already-integrated position: at 60 Hz the longest boost step is only
 * ~0.17 units, well below the smallest obstacle, so no swept test is needed and
 * the wall clamp makes tunnelling impossible.
 *
 * resolve() writes the corrected position back, reflects the world velocity
 * with a damped impulse, and returns a reusable hit record. Nothing is
 * allocated during the fixed step.
 */
import { ROOM } from '../config/constants.js';
import { COLLISION, OBSTACLES } from '../config/collision.config.js';

export class CollisionWorld {
  constructor() {
    this.hit = {
      impact: 0,
      normalX: 0,
      normalZ: 0,
    };

    // Probe radii already include the small body margin.
    this.minX = -ROOM.width / 2 + COLLISION.wallInset;
    this.maxX = ROOM.width / 2 - COLLISION.wallInset;
    this.minZ = -ROOM.depth / 2 + COLLISION.wallInset;
    this.maxZ = ROOM.depth / 2 - COLLISION.wallInset;
  }

  /**
   * @param {import('three').Vector3} position Car centre, mutated in place.
   * @param {import('three').Vector3} velocity World velocity, mutated in place.
   * @param {number} heading Car yaw in radians.
   * @returns {{impact:number, normalX:number, normalZ:number}|null}
   */
  resolve(position, velocity, heading) {
    const hit = this.hit;
    hit.impact = 0;
    hit.normalX = 0;
    hit.normalZ = 0;

    const forwardX = -Math.sin(heading);
    const forwardZ = -Math.cos(heading);
    const probeY = position.y + COLLISION.probeHeight;

    for (const probe of COLLISION.probes) {
      // Recompute from the current centre: an earlier contact may have shifted
      // the car before the next probe is tested.
      let px = position.x + forwardX * probe.offset;
      let pz = position.z + forwardZ * probe.offset;
      const radius = probe.radius;

      // Room walls. The clamp guarantees the car can never leave the room.
      const wallMaxX = this.maxX - radius;
      const wallMinX = this.minX + radius;
      const wallMaxZ = this.maxZ - radius;
      const wallMinZ = this.minZ + radius;

      if (px > wallMaxX) {
        position.x -= px - wallMaxX;
        px = wallMaxX;
        this.contact(velocity, -1, 0);
      } else if (px < wallMinX) {
        position.x += wallMinX - px;
        px = wallMinX;
        this.contact(velocity, 1, 0);
      }

      if (pz > wallMaxZ) {
        position.z -= pz - wallMaxZ;
        pz = wallMaxZ;
        this.contact(velocity, 0, -1);
      } else if (pz < wallMinZ) {
        position.z += wallMinZ - pz;
        pz = wallMinZ;
        this.contact(velocity, 0, 1);
      }

      for (let i = 0; i < OBSTACLES.length; i += 1) {
        const obstacle = OBSTACLES[i];
        if (probeY > obstacle.top) continue;

        const minX = obstacle.minX - radius;
        const maxX = obstacle.maxX + radius;
        const minZ = obstacle.minZ - radius;
        const maxZ = obstacle.maxZ + radius;
        if (px <= minX || px >= maxX || pz <= minZ || pz >= maxZ) continue;

        // Push out along the nearest face of the expanded box. This keeps the
        // response stable when sliding along a long piece of furniture.
        const left = px - minX;
        const right = maxX - px;
        const back = pz - minZ;
        const front = maxZ - pz;

        if (left <= right && left <= back && left <= front) {
          position.x -= left;
          px -= left;
          this.contact(velocity, -1, 0);
        } else if (right <= back && right <= front) {
          position.x += right;
          px += right;
          this.contact(velocity, 1, 0);
        } else if (back <= front) {
          position.z -= back;
          pz -= back;
          this.contact(velocity, 0, -1);
        } else {
          position.z += front;
          pz += front;
          this.contact(velocity, 0, 1);
        }
      }
    }

    return hit.impact > 0 ? hit : null;
  }

  /** Apply one contact normal to the world velocity, keeping a little bounce. */
  contact(velocity, normalX, normalZ) {
    const normalSpeed = velocity.x * normalX + velocity.z * normalZ;
    // Moving away from the surface: the positional correction is enough and a
    // second impulse would only make the car chatter against the wall.
    if (normalSpeed >= 0) return;

    const impact = -normalSpeed;
    const bounce = impact >= COLLISION.impactThreshold ? COLLISION.restitution : 0;
    const tangentX = velocity.x - normalSpeed * normalX;
    const tangentZ = velocity.z - normalSpeed * normalZ;

    velocity.x =
      tangentX * COLLISION.tangentRetention + bounce * impact * normalX;
    velocity.z =
      tangentZ * COLLISION.tangentRetention + bounce * impact * normalZ;

    if (impact > this.hit.impact) {
      this.hit.impact = impact;
      this.hit.normalX = normalX;
      this.hit.normalZ = normalZ;
    }
  }
}
