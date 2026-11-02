/**
 * Animated water plane for the Monaco harbour.
 *
 * The surface is a single plane whose vertices are displaced every frame by a
 * pre-computed noise-like pattern (no dynamic geometry allocation, just a
 * Float32BufferAttribute updated in place from a seeded grid). Vertex colors
 * give the water its blue-white sheen without per-fragment light counts.
 */

import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Vector3,
} from 'three';

const RANDOM = { seed: 201 };
RANDOM.next = function () {
  this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
  return this.seed / 4294967296;
};

function genWaveGrid(size, segments, time) {
  const positions = new Float32Array((segments + 1) * (segments + 1) * 3);
  const colors = new Float32Array((segments + 1) * (segments + 1) * 3);
  const step = size / segments;
  const half = size / 2;
  for (let row = 0; row <= segments; row += 1) {
    for (let col = 0; col <= segments; col += 1) {
      const i = row * (segments + 1) + col;
      const x = -half + col * step;
      const z = -half + row * step;
      const seed = 101 + row * 13 + col * 7;
      const n1 = Math.sin(x * 0.8 + time * 1.8 + seed * 0.03) * 0.12;
      const n2 = Math.sin(z * 0.6 + time * 1.4 + seed * 0.05 + 1.7) * 0.08;
      const n3 = Math.sin((x + z) * 0.4 + time * 1.2 + seed * 0.02) * 0.06;
      positions[i * 3] = x;
      positions[i * 3 + 1] = n1 + n2 + n3;
      positions[i * 3 + 2] = z;
      // Colour: deep water at the edges, brighter at the crests.
      const intensity = 0.5 + 0.5 * Math.sin(time * 1.1 + seed * 0.03);
      const r = 0.35 + 0.42 * intensity;
      const g = 0.55 + 0.35 * intensity;
      const b = 0.75 + 0.2 * intensity;
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geo.setIndex(
    new Float32BufferAttribute(
      new Uint32Array(
        (segments) * (segments) * 6,
      ),
      1,
    ),
  );
  geo.computeVertexNormals();
  return geo;
}

export class WaterPlane {
  /** @param {{ isMobile: boolean }} opts */
  constructor({ isMobile }) {
    this.group = new Group();
    this.group.name = 'Water';
    this.frame = { position: new Vector3(), up: new Vector3() };
    this.time = 0;

    const size = 6.0;
    const segments = isMobile ? 20 : 32;
    const geo = genWaveGrid(size, segments, 0);
    this.geometry = geo;

    this.material = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.6,
      metalness: 0.05,
      transparent: true,
      opacity: 0.92,
      side: DoubleSide,
      depthWrite: false,
    });
    this.mesh = new Mesh(geo, this.material);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // Foam line along the edges (a thin plane under the water surface).
    const foamGeo = new PlaneGeometry(size * 0.9, size * 0.9);
    foamGeo.translate(0, -0.004, 0);
    this.foamMat = new MeshStandardMaterial({
      color: 0x8fc8e0,
      roughness: 0.3,
      transparent: true,
      opacity: 0.5,
      side: DoubleSide,
    });
    this.foam = new Mesh(foamGeo, this.foamMat);
    this.foam.receiveShadow = true;
    this.group.add(this.foam);

    // Underwater reflection of the sky / track.
    this.reflectMat = new MeshStandardMaterial({
      color: 0x12223f,
      roughness: 0.3,
      transparent: true,
      opacity: 0.18,
      side: DoubleSide,
    });
    this.reflect = new Mesh(new PlaneGeometry(size, size), this.reflectMat);
    this.reflect.position.y = 0.002;
    this.reflect.receiveShadow = true;
    this.group.add(this.reflect);
  }

  update(dt) {
    this.time += dt;
    const geo = this.geometry;
    const pos = geo.attributes.position.array;
    const step = 6.0 / this.geometry.parameters.widthSegments;
    const half = 3.0;
    const count = pos.length / 3;
    for (let i = 0; i < count; i += 1) {
      const row = (i / (this.geometry.parameters.widthSegments + 1)) | 0;
      const col = i % (this.geometry.parameters.widthSegments + 1);
      const x = -half + col * step;
      const z = -half + row * step;
      const seed = 101 + row * 13 + col * 7;
      const n1 = Math.sin(x * 0.8 + this.time * 1.8 + seed * 0.03) * 0.12;
      const n2 = Math.sin(z * 0.6 + this.time * 1.4 + seed * 0.05 + 1.7) * 0.08;
      const n3 = Math.sin((x + z) * 0.4 + this.time * 1.2 + seed * 0.02) * 0.06;
      const idx = i * 3;
      pos[idx + 1] = n1 + n2 + n3;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    // Foam opacity fades with the wave height of the crests.
    let maxH = 0;
    for (let i = 0; i < count; i += 1) {
      const h = pos[i * 3 + 1];
      if (h > maxH) maxH = h;
    }
    this.foamMat.opacity = 0.35 + 0.25 * Math.sin(this.time * 0.8) * 0.3;
    this.material.opacity = 0.9 + 0.05 * Math.sin(this.time * 0.6) * 0.3;
    this.material.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.foamMat.dispose();
    this.reflectMat.dispose();
  }
}
