/**
 * Street lamps for the Monaco harbour front.
 *
 * Simple lamp posts: a tapered column, a bowl reflector, and an emissive cone
 * that reads as a warm street light. The bowl is a thin mesh; the cone is an
 * emissive material so it is the only real light in the scene without adding
 * per-fragment point lights.
 */

import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';

const RANDOM = { seed: 37 };
RANDOM.next = function () {
  this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
  return this.seed / 4294967296;
};

export class StreetLamps {
  /** @param {{ isMobile: boolean }} opts */
  constructor({ isMobile }) {
    this.group = new Group();
    this.group.name = 'StreetLamps';
    this.frame = { position: new Vector3(), up: new Vector3() };
    this.matrix = new Matrix4();
    this.tempPosition = new Vector3();
    this.scale = new Vector3(1, 1, 1);

    // Shared geometries.
    this.columnGeo = new CylinderGeometry(0.05, 0.07, 0.7, 8);
    this.bowlGeo = new CylinderGeometry(0.14, 0.16, 0.12, 12, 1, true);
    this.lightGeo = new ConeGeometry(0.18, 0.3, 8);

    this.columnMat = new MeshStandardMaterial({
      color: 0x6a7a8a,
      roughness: 0.7,
      metalness: 0.15,
    });
    this.bowlMat = new MeshStandardMaterial({
      color: 0x8a94a6,
      roughness: 0.6,
      metalness: 0.2,
    });
    this.lightMat = new MeshStandardMaterial({
      color: 0xffb968,
      emissive: 0xffb968,
      emissiveIntensity: 0.3,
      roughness: 0.4,
      metalness: 0.05,
    });

    // Place lamps along the harbour front (z = -3 to -6, x = -3.5 to 3.5).
    const count = isMobile ? 3 : 8;
    this.build(count);
  }

  build(count) {
    const geos = [this.columnGeo, this.bowlGeo, this.lightGeo];
    const mats = [this.columnMat, this.bowlMat, this.lightMat];
    const names = ['columns', 'bowls', 'lights'];

    for (let i = 0; i < count; i += 1) {
      const u = (i / (count - 1)) * 3.2 + 0.2;
      const x = (u - 1.6) * 2.6;
      const z = -3.2 - (i % 4) * 0.9;
      const ry = (i % 3) * 0.12;

      for (let t = 0; t < 3; t += 1) {
        const geo = geos[t];
        const mat = mats[t];
        const mesh = new Mesh(geo, mat);
        mesh.castShadow = t === 0;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        const s = t === 0 ? 1 : t === 1 ? 1 : 1;
        this.tempPosition.set(x, t === 0 ? 0.35 : t === 1 ? 0.7 : 0.45, z);
        this.matrix.compose(
          this.tempPosition,
          new THREE.Quaternion(),
          s !== 1 ? new THREE.Vector3(s, s, s) : this.scale,
        );
        mesh.position.copy(this.tempPosition);
        mesh.rotation.y = ry;
        this.group.add(mesh);
      }
    }
  }

  setNightFactor(t) {
    t = Math.min(Math.max(t, 0), 1);
    // Brighten the lamps at night.
    const target = t > 0.5 ? 0.6 + 0.3 * (t - 0.5) * 2 : 0.3;
    const lights = this['lights'];
    if (lights) {
      for (let i = 0; i < lights.length; i += 1) {
        const mesh = lights[i];
        if (mesh && mesh.material) {
          mesh.material.emissiveIntensity = target;
          mesh.material.needsUpdate = true;
        }
      }
    }
  }

  dispose() {
    // Materials shared across instances; releasing the group is enough.
  }
}
