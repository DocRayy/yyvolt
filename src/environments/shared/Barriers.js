/**
 * src/environments/shared/Barriers.js
 *
 * Red-white barriers and tire stacks for real circuits.
 *
 * On the Monaco circuit the invisible TrackCollider wall is invisible, so the
 * visible decorative guardrail sits just outside the collider edge. Barriers are
 * one InstancedMesh with a flat red-white stripe texture, reused across both
 * sides; tire stacks are small instanced boxes placed at the hardest corners.
 * InstancedMesh keeps the barrier family to a single draw call.
 */

import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { TRACK } from '../../config/track.config.js';

/**
 * Flat canvas: red base with thin white stripes running horizontally.
 * Drawn once per instance family; the texture object itself is shared and
 * never mutated between builds.
 */
function makeStripesCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d7263d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#ffffff';
  for (let x = 0; x < canvas.width; x += 5) {
    ctx.fillRect(x, 0, 2, canvas.height);
  }
  return canvas;
}

export class Barriers {
  constructor(trackPath, textures) {
    this.trackPath = trackPath;
    this.textures = textures;

    this.group = new Group();
    this.group.name = 'Barriers';

    // Guardrails: flat box with red-white stripes. side: 2 so both faces
    // render. InstancedMesh across two sides (left/right) keeps the draw
    // count to a single mesh; build() sets the instance matrix for each.
    const geometry = new BoxGeometry(0.2, 0.3, 0.16);
    const canvas = makeStripesCanvas();
    const material = new MeshStandardMaterial({
      map: textures.fromCanvas(canvas),
      roughness: 0.45,
      metalness: 0.35,
      side: 2,
    });
    this.barrierMesh = new InstancedMesh(geometry, material, 512);
    this.barrierMesh.castShadow = true;
    this.barrierMesh.receiveShadow = true;
    this.barrierMesh.frustumCulled = false;
    this.group.add(this.barrierMesh);

    // Tire stacks: small cube stacks at the Grand Hotel hairpin and harbor
    // chicane, the two corners where toy F1 cars most often scrape.
    this.tireGeometry = new BoxGeometry(0.24, 0.18, 0.24);
    this.tireMaterial = new MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.85,
      metalness: 0.05,
    });
    this.tireMesh = new InstancedMesh(
      this.tireGeometry,
      this.tireMaterial,
      64,
    );
    this.tireMesh.castShadow = true;
    this.tireMesh.receiveShadow = true;
    this.tireMesh.frustumCulled = false;
    this.group.add(this.tireMesh);

    // Reusable per-instance state — no allocation in build().
    this.matrix = new Matrix4();
    this.quaternion = new Quaternion();
    this.scale = new Vector3(1, 1, 1);
    this.tempPosition = new Vector3();
    this.frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };

    this.build();
  }

  build() {
    const trackPath = this.trackPath;
    const halfWidth = trackPath.halfWidth;
    const barrierOffset = 0.22;
    const barrierDepth = 0.16;
    const samples = TRACK.samples;

    let barrierCount = 0;
    let tireCount = 0;

    for (let i = 0; i < samples; i += 1) {
      const u = i / samples;
      trackPath.getFrameAt(u, this.frame);
      const { position, side } = this.frame;

      // Guardrails on both sides of the ribbon, just outside the collider wall.
      // barrierOffset pushes the rail off the asphalt edge so the white line
      // reads as decoration, not geometry.
      for (let s = 0; s < 2; s += 1) {
        const sign = s === 0 ? 1 : -1;
        this.tempPosition.set(
          position.x + side.x * (halfWidth + barrierOffset + barrierDepth / 2) * sign,
          position.y + 0.15,
          position.z + side.z * (halfWidth + barrierOffset + barrierDepth / 2) * sign,
        );
        this.matrix.compose(this.tempPosition, this.quaternion, this.scale);
        this.barrierMesh.setMatrixAt(barrierCount, this.matrix);
        barrierCount += 1;
      }

      // Tire stacks at the Grand Hotel hairpin (samples 11-13) and harbor
      // chicane (samples 17-20). These are the corners where the car scrapes
      // most often, so the stacks also serve as early-warning visual markers.
      if (i === 11 || i === 17) {
        for (let s = 0; s < 2; s += 1) {
          const sign = s === 0 ? 1 : -1;
          this.tempPosition.set(
            position.x + side.x * (halfWidth + 0.12) * sign,
            position.y + 0.09,
            position.z + side.z * (halfWidth + 0.12) * sign,
          );
          this.matrix.compose(this.tempPosition, this.quaternion, this.scale);
          this.tireMesh.setMatrixAt(tireCount, this.matrix);
          tireCount += 1;
        }
      }
    }

    if (barrierCount > 0) this.barrierMesh.count = barrierCount;
    if (tireCount > 0) this.tireMesh.count = tireCount;
    if (barrierCount > 0) this.barrierMesh.instanceMatrix.needsUpdate = true;
    if (tireCount > 0) this.tireMesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.barrierMesh?.dispose?.();
    this.tireMesh?.dispose?.();
    this.group?.children?.forEach((child) => child.remove?.(child));
    this.group = null;
  }
}
