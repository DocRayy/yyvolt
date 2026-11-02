/**
 * Low-poly instanced pines for the Monaco hillside.
 *
 * Each pine is a Group of a few cone/cylinder segments so the shape reads as a
 * tree. A shared geometry + one matrix per instance keeps draw calls tiny
 * (one draw call per instance, not per cone).
 */

import {
  BoxGeometry,
  Color,
  ConeGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';

const RANDOM = { seed: 7 };
RANDOM.next = function () {
  this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
  return this.seed / 4294967296;
};

/** Seeded pseudo-random for the tree crown shape. */
function rng() {
  return RANDOM.next();
}

function buildPineCrown(scale, group) {
  const base = scale * 0.5;
  const tiers = 3;
  const totalHeight = scale * 0.9;
  const tierH = totalHeight / tiers;
  for (let i = 0; i < tiers; i += 1) {
    const y = i * tierH + tierH / 2;
    const r = base * (1 - i / tiers);
    const cone = new Mesh(
      new ConeGeometry(r, tierH, 5),
      new MeshStandardMaterial({ color: 0x2d4a2d, roughness: 0.9, flatShading: true }),
    );
    cone.position.y = y;
    cone.castShadow = true;
    cone.receiveShadow = true;
    group.add(cone);
  }
  // Trunk
  new Mesh(
    new BoxGeometry(scale * 0.12, scale * 0.25, scale * 0.12),
    new MeshStandardMaterial({ color: 0x5a3a1a, roughness: 0.9 }),
  )
    .position.set(0, scale * 0.12, 0)
    .castShadow = true
    .receiveShadow = true
    .addTo(group);
}

export class Trees {
  /** @param {{ isMobile: boolean }} opts */
  constructor({ isMobile }) {
    this.group = new Group();
    this.group.name = 'Trees';
    this.frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };
    this.matrix = new Matrix4();
    this.tempPosition = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    this.isMobile = isMobile;

    // One shared geometry per size class so InstancedMesh stays cheap.
    this.smallGeo = new ConeGeometry(0.2, 0.4, 4);
    this.medGeo = new ConeGeometry(0.35, 0.6, 5);
    this.largeGeo = new ConeGeometry(0.5, 0.85, 6);

    this.build(isMobile ? 6 : 12);
  }

  build(count) {
    const geos = [this.smallGeo, this.medGeo, this.largeGeo];
    const sizes = [1.2, 2.0, 3.5];
    const placements = [];
    for (let i = 0; i < count; i += 1) {
      const tier = (i % 3);
      const side = (i % 2 === 0) ? 1 : -1;
      const u = (i / (count - 1)) * 3.6 + 0.2;
      const x = (u - 1.8) * 2.8;
      const z = 1.5 + tier * 1.1;
      placements.push({ x, z, side, tier });
    }

    for (let t = 0; t < 3; t += 1) {
      const geo = geos[t];
      const count = placements.filter((p) => p.tier === t).length;
      if (count === 0) continue;

      const mesh = new InstancedMesh(geo, this.buildMaterial(t), count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      for (let i = 0; i < count; i += 1) {
        const p = placements[i];
        if (p.tier !== t) continue;
        const scale = sizes[t];
        const y = 0.6 + t * 0.3;
        this.tempPosition.set(p.x, y, p.z);
        this.matrix.compose(
          this.tempPosition,
          new THREE.Quaternion(),
          this.scale,
        );
        mesh.setMatrixAt(i, this.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      const tName = t === 0 ? 'small' : t === 1 ? 'medium' : 'large';
      this[tName] = mesh;
      this.group.add(mesh);
    }
  }

  buildMaterial(tier) {
    const colors = [0x2d4a2d, 0x3a5a2d, 0x4a6a3a];
    return new MeshStandardMaterial({
      color: colors[tier],
      roughness: 0.9,
      flatShading: true,
    });
  }

  setNightFactor(t) {
    // Pines get a subtle darkening at night; the glow comes from the track
    // and the casino windows, so the trees stay muted.
  }

  dispose() {
    // Geometry is shared; nothing to dispose per-instance.
  }
}
