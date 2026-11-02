/**
 * Simple yacht hulls for the Monaco harbour.
 *
 * Each hull is a flat-bottomed box with a cabin and a mast. A beam of light
 * shines upward from the masthead so yachts read as lit at night. All hulls
 * share one geometry (scaled per instance) so we stay within the draw-call
 * budget.
 */

import {
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';

import * as THREE from 'three';

const RANDOM = { seed: 55 };
RANDOM.next = function () {
  this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
  return this.seed / 4294967296;
};

export class YachtHulls {
  /** @param {{ isMobile: boolean }} opts */
  constructor({ isMobile }) {
    this.group = new Group();
    this.group.name = 'Yachts';
    this.frame = { position: new Vector3(), up: new Vector3() };
    this.matrix = new Matrix4();
    this.tempPosition = new Vector3();
    this.scale = new Vector3(1, 1, 1);

    // Shared geometries per part.
    this.hullGeo = new BoxGeometry(0.45, 0.2, 0.5);
    this.cabinGeo = new BoxGeometry(0.25, 0.15, 0.1);
    this.mastGeo = new BoxGeometry(0.02, 1.0, 0.02);
    this.beamGeo = new BoxGeometry(0.06, 0.8, 0.06);
    this.lightGeo = new BoxGeometry(0.2, 1.2, 0.2);

    this.hullMat = new MeshStandardMaterial({
      color: 0x2a4a5a,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.cabinMat = new MeshStandardMaterial({
      color: 0x6a4a2a,
      roughness: 0.8,
    });
    this.mastMat = new MeshStandardMaterial({
      color: 0x8a94a6,
      roughness: 0.4,
      metalness: 0.3,
    });
    this.beamMat = new MeshStandardMaterial({
      color: 0xffc20e,
      emissive: 0xffc20e,
      emissiveIntensity: 0.25,
      transparent: true,
      opacity: 0.45,
      side: DoubleSide,
    });
    this.lightMat = new MeshStandardMaterial({
      color: 0x2a4a5a,
      emissive: 0xffc20e,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
    });

    this.build(isMobile ? 3 : 6);
  }

  build(count) {
    const geos = [this.hullGeo, this.cabinGeo, this.mastGeo, this.beamGeo, this.lightGeo];
    const mats = [this.hullMat, this.cabinMat, this.mastMat, this.beamMat, this.lightMat];
    const names = ['hulls', 'cabins', 'masts', 'beams', 'lights'];

    // Distribute along the harbour front.
    for (let i = 0; i < count; i += 1) {
      const u = (i / (count - 1)) * 3.2 + 0.2;
      const x = (u - 1.6) * 2.6;
      const z = -2.2 + (i % 3) * 2.0;
      const ry = (i % 3) * 0.15;
      const scale = 1.0 + (i % 3) * 0.08;

      for (let t = 0; t < 5; t += 1) {
        const geo = geos[t];
        const mat = mats[t];
        const mesh = new InstancedMesh(geo, mat, 1);
        mesh.castShadow = t < 2;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        const s = t === 0 ? scale : t === 1 ? scale * 0.5 : t === 2 ? scale * 0.05 : 1;
        const temp = this.tempPosition;
        temp.set(x, 0, z);
        this.matrix.compose(
          temp,
          new THREE.Quaternion(),
          s !== 1 ? new THREE.Vector3(s, s, s) : this.scale,
        );
        mesh.setMatrixAt(0, this.matrix);

        if (!this[names[t]]) {
          this[names[t]] = [];
        }
        this[names[t]].push(mesh);
        this.group.add(mesh);
      }
    }
  }

  setNightFactor(t) {
    t = Math.min(Math.max(t, 0), 1);
    // Brighten the masthead beams and lights at night.
    const target = t > 0.5 ? 0.6 + 0.3 * (t - 0.5) * 2 : 0.3;
    for (const key of ['lights', 'beams']) {
      const meshes = this[key];
      if (!meshes) continue;
      for (let i = 0; i < meshes.length; i += 1) {
        const mesh = meshes[i];
        if (!mesh) continue;
        mesh.material.emissiveIntensity = target;
        mesh.material.needsUpdate = true;
      }
    }
  }

  dispose() {
    // Materials shared across instances; releasing the group is sufficient.
  }
}
