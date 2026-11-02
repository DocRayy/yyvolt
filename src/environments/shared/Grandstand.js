/**
 * src/environments/shared/Grandstand.js
 *
 * Shared grandstand builder for Silverstone. One InstancedMesh for the roof
 * (with canvas window texture) and one InstancedMesh for the seats, so a whole
 * family is a single draw call. Instanced seating keeps mobile draw calls to a
 * handful; a full grandstand family is 2 draw calls (roof + seats).
 */

import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from 'three';

/** Create a low-contrast window texture on a canvas (no external images). */
function makeWindowCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(0, 0, 64, 8);
  ctx.fillRect(0, 0, 8, 64);
  ctx.fillStyle = '#9a9a9a';
  for (let x = 8; x < 64; x += 16) {
    ctx.fillRect(x, 8, 4, 48);
  }
  for (let y = 8; y < 64; y += 16) {
    ctx.fillRect(8, y, 48, 4);
  }
  ctx.fillStyle = '#c8c8c8';
  ctx.fillRect(0, 0, 4, 4);
  ctx.fillRect(60, 60, 4, 4);
  return canvas;
}

export class Grandstand {
  constructor(trackPath, textures, options = {}) {
    const { rows = 2, cols = 10, depth = 0.4, width = 2.4, height = 0.4 } = options;
    this.trackPath = trackPath;
    this.textures = textures;

    this.group = new Group();
    this.group.name = 'Grandstand';

    // Roof: a single flat box with canvas window texture, instanced across
    // rows x cols positions. One InstancedMesh = one draw call.
    const roofGeo = new BoxGeometry(width, height, depth);
    const windowCanvas = makeWindowCanvas();
    const roofMat = new MeshStandardMaterial({
      map: textures.fromCanvas(windowCanvas, { clamp: true }),
      roughness: 0.85,
      metalness: 0.05,
    });
    this.roofMesh = new InstancedMesh(roofGeo, roofMat, rows * cols);
    this.roofMesh.castShadow = true;
    this.roofMesh.receiveShadow = true;
    this.roofMesh.frustumCulled = false;
    this.group.add(this.roofMesh);

    // Seats: flat planes on top of the roof, instanced the same way.
    const seatGeo = new PlaneGeometry(0.16, 0.12);
    const seatMat = new MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.95,
      metalness: 0.0,
      side: 2,
    });
    this.seatMesh = new InstancedMesh(seatGeo, seatMat, rows * cols);
    this.seatMesh.castShadow = true;
    this.seatMesh.receiveShadow = true;
    this.seatMesh.frustumCulled = false;
    this.group.add(this.seatMesh);

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

    this.build({ rows, cols, depth, width, height });
  }

  build({ rows, cols, depth, width, height }) {
    const trackPath = this.trackPath;
    const halfWidth = trackPath.halfWidth;
    const barrierOffset = 0.22 + 0.16 / 2;
    const sitHeight = 0.35;
    const xOffset = 0.8;
    const zOffset = 0.25;

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const u = (r * 0.5 + c * 2) / (rows * 0.5 + cols * 2);
        trackPath.getFrameAt(u, this.frame);
        const { position, side } = this.frame;

        const sign = 1; // place on the right side of the track
        const xBase = position.x + side.x * (halfWidth + barrierOffset + xOffset) * sign;
        const zBase = position.z + side.z * (halfWidth + barrierOffset + zOffset) * sign;

        const idx = r * cols + c;
        const colFrac = c / (cols - 1);
        const rowFrac = r / (rows - 1);

        // Roof
        this.tempPosition.set(
          xBase + (c - cols / 2) * width * 0.9,
          position.y + 0.2,
          zBase + (r - rows / 2) * depth * 0.9,
        );
        this.matrix.compose(this.tempPosition, this.quaternion, this.scale);
        this.roofMesh.setMatrixAt(idx, this.matrix);

        // Seats
        this.tempPosition.set(
          xBase + (c - cols / 2) * width * 0.9,
          position.y + sitHeight,
          zBase + (r - rows / 2) * depth * 0.9,
        );
        this.matrix.compose(this.tempPosition, this.quaternion, this.scale);
        this.seatMesh.setMatrixAt(idx, this.matrix);
      }
    }

    this.roofMesh.count = rows * cols;
    this.seatMesh.count = rows * cols;
    this.roofMesh.instanceMatrix.needsUpdate = true;
    this.seatMesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.roofMesh?.dispose?.();
    this.seatMesh?.dispose?.();
    this.group?.children?.forEach((child) => child.remove?.(child));
    this.group = null;
  }
}
