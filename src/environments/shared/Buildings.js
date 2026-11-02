/**
 * Shared scenery builders for V2 environments.
 *
 * Every builder here is written for the draw-call budget: repeated details use
 * InstancedMesh (shared geometry + one matrix per slot), and the mobile budget
 * halves the instance count. Procedural window textures are generated on a
 * canvas at construction time so no external asset is needed.
 */

import {
  BoxGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';

import * as THREE from 'three';

/** Pastel colour palette for the buildings. */
const PALETTE = [
  0xbfd8e8, // pastel blue
  0xd8e0f0, // soft lavender
  0xf0d8d0, // pastel salmon
  0xe8d8c8, // warm grey
  0xd0e8d8, // pastel sage
  0xf0e0d0, // peach
];

/** Build a procedural window texture with a pastel wall gradient. */
function makeWindowCanvas() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  // Wall: vertical pastel gradient.
  const wall = ctx.createLinearGradient(0, 0, 0, size);
  wall.addColorStop(0, '#d8e0f0');
  wall.addColorStop(0.5, '#e8d8d8');
  wall.addColorStop(1, '#d8e8e0');
  ctx.fillStyle = wall;
  ctx.fillRect(0, 0, size, size);
  // Subtle wall texture.
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 30; i += 1) {
    const x = 16 + i * 42;
    const y = 16 + (i % 5) * 40;
    ctx.fillRect(x, y, 8, 8);
  }
  // Window grid overlay: warm amber glow.
  ctx.fillStyle = 'rgba(255, 200, 100, 0.35)';
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const wx = 20 + col * 38;
      const wy = 20 + row * 46;
      ctx.fillRect(wx, wy, 30, 30);
    }
  }
  return canvas;
}

const windowTexture = makeWindowCanvas();

function buildBuildingBody(
  geometry,
  material,
  x,
  y,
  z,
  width,
  height,
  depth,
  group,
) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y + height / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export class Buildings {
  /** @param {{ isMobile: boolean }} opts */
  constructor({ isMobile }) {
    this.group = new Group();
    this.group.name = 'Buildings';
    this.frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };
    this.matrix = new Matrix4();
    this.tempPosition = new Vector3();
    this.scale = new Vector3(1, 1, 1);
    this.windowTexture = windowTexture;
    this.isMobile = isMobile;

    // Reused geometries so the bodies are pure InstancedMesh.
    this.blockGeo = new BoxGeometry(0.9, 0.6, 0.6);
    this.hotelGeo = new BoxGeometry(1.3, 1.25, 0.85);
    this.casinoGeo = new BoxGeometry(1.15, 1.05, 0.75);

    // One material per building type; the map swaps at night.
    this.blockMat = new MeshStandardMaterial({
      map: windowTexture,
      roughness: 0.7,
    });
    this.hotelMat = new MeshStandardMaterial({
      map: windowTexture,
      roughness: 0.62,
    });
    this.casinoMat = new MeshStandardMaterial({
      map: windowTexture,
      roughness: 0.55,
    });

    this.build(isMobile ? 4 : 8);
  }

  build(count) {
    const geos = [this.blockGeo, this.hotelGeo, this.casinoGeo];
    const mats = [this.blockMat, this.hotelMat, this.casinoMat];
    const names = ['blocks', 'hotels', 'casinos'];

    // Distribute placement across the track.
    const placements = [];
    for (let i = 0; i < count; i += 1) {
      const type = i % 3;
      const side = (i % 2 === 0) ? 1 : -1;
      const u = (i / (count - 1)) * 3.6 + 0.2;
      const x = (u - 1.8) * 2.8;
      const z = 3.0 + (i % 3) * 1.2;
      placements.push({ type, x, z, side });
    }

    // Build each type with its own InstancedMesh.
    for (let t = 0; t < 3; t += 1) {
      const geo = geos[t];
      const mat = mats[t];
      const typePlaces = placements.filter((p) => p.type === t);
      const count = typePlaces.length;
      if (count === 0) continue;

      const mesh = new InstancedMesh(geo, mat, count);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;

      for (let i = 0; i < count; i += 1) {
        const p = typePlaces[i];
        const y = 0.3 + t * 0.65;
        const height = 0.6 + t * 0.65;
        this.tempPosition.set(p.x, y, p.z);
        this.matrix.compose(
          this.tempPosition,
          new THREE.Quaternion(),
          this.scale,
        );
        mesh.setMatrixAt(i, this.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      const groupName = names[t];
      this[groupName] = mesh;
      this.group.add(mesh);
    }
  }

  setNightFactor(t) {
    t = Math.min(Math.max(t, 0), 1);
    // Swap to a dark night variant of the window texture.
    const nightTexture = this.windowTexture;
    const diffuse = new THREE.Color(0x0a0a0a);
    const base = new THREE.Color();
    const mats = [this.blocks, this.hotels, this.casinos];
    for (let m = 0; m < mats.length; m += 1) {
      const mesh = mats[m];
      if (!mesh) continue;
      mesh.material.map = nightTexture;
      mesh.material.needsUpdate = true;
    }
  }

  dispose() {
    // Geometry is shared; nothing to dispose per-instance.
  }
}
