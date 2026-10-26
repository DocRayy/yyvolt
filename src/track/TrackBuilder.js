/**
 * Builds the visible toy track: orange ribbon, side skirts, dashed centre line,
 * red/white kerbs, chunky connector joints, and the checkered YYVOLT arch.
 *
 * Geometry is generated once from TrackPath. Repeated details use InstancedMesh
 * so the track stays cheap enough to leave unbatched beside the static room.
 * The LED strips live in TrackLights because their material animates at night.
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS, MATERIALS } from '../config/constants.js';
import { TRACK } from '../config/track.config.js';

function addBox(parent, width, height, depth, material, x, y, z) {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addMesh(parent, geometry, material, x, y, z) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** A flat ribbon following the curve. Used for the dashed centre line. */
function buildFlatRibbon(trackPath, width, yOffset, uvVScale) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const frame = {
    position: new Vector3(),
    tangent: new Vector3(),
    side: new Vector3(),
    up: new Vector3(),
  };
  const halfWidth = width / 2;

  for (let i = 0; i <= TRACK.samples; i += 1) {
    const u = i / TRACK.samples;
    trackPath.getFrameAt(u, frame);
    const { position, side } = frame;
    positions.push(
      position.x + side.x * halfWidth,
      position.y + yOffset,
      position.z + side.z * halfWidth,
      position.x - side.x * halfWidth,
      position.y + yOffset,
      position.z - side.z * halfWidth,
    );
    uvs.push(0, u * uvVScale, 1, u * uvVScale);

    if (i === TRACK.samples) continue;
    const a = i * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export class TrackBuilder {
  constructor(trackPath, textures) {
    this.trackPath = trackPath;
    this.textures = textures;
    this.group = new Group();
    this.group.name = 'Track';

    this.frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };
    this.matrix = new Matrix4();
    this.quaternion = new Quaternion();
    this.scale = new Vector3(1, 1, 1);
    this.tempPosition = new Vector3();
    this.tangentBack = new Vector3();
    this.kerbColors = TRACK.kerb.colors.map((hex) => new Color(hex));

    this.surfaceMaterial = new MeshStandardMaterial({
      color: COLORS.trackOrange,
      map: textures.createTrackAsphalt(),
      roughness: TRACK.surface.roughness,
      metalness: TRACK.surface.metalness,
    });

    this.buildSurface();
    this.buildCenterLine();
    this.buildKerbs();
    this.buildJoints();
    this.buildRampBooks();
    this.buildStartArch();
  }

  buildSurface() {
    const { samples } = TRACK;
    const { halfWidth } = this.trackPath;
    const thickness = TRACK.surfaceThickness;
    const positions = [];
    const uvs = [];
    const indices = [];
    const uvScale = this.trackPath.length / TRACK.surface.textureScale;

    for (let i = 0; i <= samples; i += 1) {
      const u = i / samples;
      this.trackPath.getFrameAt(u, this.frame);
      const { position, side } = this.frame;

      for (const sign of [1, -1]) {
        const x = position.x + side.x * halfWidth * sign;
        const z = position.z + side.z * halfWidth * sign;
        positions.push(x, position.y, z);
        uvs.push(u * uvScale, sign > 0 ? 0 : 1);
      }
      for (const sign of [1, -1]) {
        const x = position.x + side.x * halfWidth * sign;
        const z = position.z + side.z * halfWidth * sign;
        positions.push(x, position.y - thickness, z);
        uvs.push(u * uvScale, sign > 0 ? 0 : 1);
      }

      if (i === samples) continue;
      const a = i * 4;
      const c = a + 4;
      // Top, then the two outer side skirts. Winding is outward/upward.
      indices.push(a, c, a + 1, a + 1, c, c + 1);
      indices.push(a + 2, c, a, c + 2, c, a + 2);
      indices.push(a + 1, c + 1, a + 3, c + 1, c + 3, a + 3);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const surface = new Mesh(geometry, this.surfaceMaterial);
    surface.receiveShadow = true;
    surface.castShadow = false;
    this.group.add(surface);
  }

  buildCenterLine() {
    const { centerLine } = TRACK;
    const texture = this.textures.createCenterLine();
    const uvVScale =
      this.trackPath.length / (centerLine.dashLength + centerLine.gapLength);
    const geometry = buildFlatRibbon(
      this.trackPath,
      centerLine.width,
      centerLine.height,
      uvVScale,
    );
    const material = new MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.4,
      roughness: 0.75,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const line = new Mesh(geometry, material);
    line.receiveShadow = false;
    this.group.add(line);
  }

  buildKerbs() {
    const { kerb } = TRACK;
    const spacing = kerb.length + kerb.gap;
    const count = Math.max(1, Math.floor(this.trackPath.length / spacing));
    const geometry = new BoxGeometry(kerb.width, kerb.height, kerb.length);
    const material = new MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.52,
      metalness: 0.02,
    });
    const kerbs = new InstancedMesh(geometry, material, count * 2);
    kerbs.castShadow = true;
    kerbs.receiveShadow = true;
    kerbs.frustumCulled = false;

    let kerbIndex = 0;
    for (let i = 0; i < count; i += 1) {
      const u = ((i + 0.5) * spacing) / this.trackPath.length;
      this.trackPath.getFrameAt(u, this.frame);
      const { position, tangent, side, up } = this.frame;

      // The ramp edges are carried by book stacks instead of kerbs.
      if (
        Math.abs(position.z - 2.2) < 1.0 &&
        position.x > 2.5 &&
        position.x < 3.5
      ) {
        continue;
      }
      this.tangentBack.copy(tangent).negate();
      this.quaternion.setFromRotationMatrix(
        this.matrix.makeBasis(side, up, this.tangentBack),
      );

      for (let s = 0; s < 2; s += 1) {
        const sign = s === 0 ? 1 : -1;
        this.tempPosition.set(
          position.x + side.x * (this.trackPath.halfWidth + kerb.offset + kerb.width / 2) * sign,
          position.y + kerb.height / 2,
          position.z + side.z * (this.trackPath.halfWidth + kerb.offset + kerb.width / 2) * sign,
        );
        this.matrix.compose(this.tempPosition, this.quaternion, this.scale);
        kerbs.setMatrixAt(kerbIndex, this.matrix);
        kerbs.setColorAt(kerbIndex, this.kerbColors[i % 2]);
        kerbIndex += 1;
      }
    }
    kerbs.count = kerbIndex;

    kerbs.instanceMatrix.needsUpdate = true;
    if (kerbs.instanceColor) kerbs.instanceColor.needsUpdate = true;
    this.group.add(kerbs);
  }

  buildJoints() {
    const { joint } = TRACK;
    const count = Math.max(1, Math.floor(this.trackPath.length / joint.spacing));
    const geometry = new BoxGeometry(
      TRACK.width + joint.extraWidth,
      joint.height,
      joint.depth,
    );
    const material = new MeshStandardMaterial({
      color: joint.color,
      roughness: 0.55,
      metalness: 0.04,
    });
    const joints = new InstancedMesh(geometry, material, count);
    joints.castShadow = false;
    joints.receiveShadow = true;
    joints.frustumCulled = false;

    for (let i = 0; i < count; i += 1) {
      const u = ((i + 0.5) * joint.spacing) / this.trackPath.length;
      this.trackPath.getFrameAt(u, this.frame);
      const { position, tangent, side, up } = this.frame;
      this.tempPosition.set(position.x, position.y + joint.height / 2, position.z);
      this.tangentBack.copy(tangent).negate();
      this.quaternion.setFromRotationMatrix(
        this.matrix.makeBasis(side, up, this.tangentBack),
      );
      this.matrix.compose(this.tempPosition, this.quaternion, this.scale);
      joints.setMatrixAt(i, this.matrix);
    }

    joints.instanceMatrix.needsUpdate = true;
    this.group.add(joints);
  }

  /**
   * Two short stacks flank the ramp so the bridge over the books reads from a
   * normal chase camera. The third stack sits under the ribbon and is mostly
   * hidden, but the side stacks give the jump a physical reason to exist.
   */
  buildRampBooks() {
    const bookColors = MATERIALS.bookColors.slice(0, 3).map(
      (hex) => new MeshStandardMaterial({ color: hex, roughness: 0.58 }),
    );
    const pageMaterial = new MeshStandardMaterial({
      color: MATERIALS.paper,
      roughness: 0.72,
    });
    const bookGeometry = new RoundedBoxGeometry(0.5, 0.06, 0.36, 2, 0.01);
    const pageGeometry = new BoxGeometry(0.46, 0.045, 0.018);

    for (const z of [1.5, 2.9]) {
      const stack = new Group();
      stack.position.set(3.0, 0, z);
      for (let i = 0; i < 3; i += 1) {
        const book = new Group();
        book.position.y = 0.03 + i * 0.072;
        book.rotation.y = (i - 1) * 0.08;
        addMesh(book, bookGeometry, bookColors[i], 0, 0, 0);
        addBox(book, 0.46, 0.045, 0.018, pageMaterial, 0, 0, 0.183);
        stack.add(book);
      }
      this.group.add(stack);
    }
  }

  buildStartArch() {
    const { arch } = TRACK;
    this.trackPath.getFrameAt(0, this.frame);
    const { position, tangent, side, up } = this.frame;
    const archGroup = new Group();
    archGroup.name = 'StartFinishArch';
    archGroup.position.copy(position);
    // Local +z points back toward the approaching cars so the banner reads
    // correctly from the start straight and the chase camera at the grid.
    this.tangentBack.copy(tangent).negate();
    archGroup.quaternion.setFromRotationMatrix(
      this.matrix.makeBasis(side, up, this.tangentBack),
    );

    const postMaterial = new MeshStandardMaterial({
      color: COLORS.liveryNavy,
      roughness: 0.45,
      metalness: 0.08,
    });
    const postOffset = this.trackPath.halfWidth + arch.postSize / 2 + 0.02;
    for (const sign of [-1, 1]) {
      addBox(
        archGroup,
        arch.postSize,
        arch.height,
        arch.postSize,
        postMaterial,
        sign * postOffset,
        arch.height / 2,
        0,
      );
    }
    addBox(
      archGroup,
      TRACK.width + arch.bannerWidthExtra + arch.postSize * 2,
      0.08,
      arch.postSize,
      postMaterial,
      0,
      arch.height - 0.04,
      0,
    );

    const bannerTexture = this.textures.createStartBanner();
    const banner = new Mesh(
      new PlaneGeometry(
        TRACK.width + arch.bannerWidthExtra,
        arch.bannerHeight,
      ),
      new MeshStandardMaterial({
        map: bannerTexture,
        roughness: 0.55,
        side: DoubleSide,
      }),
    );
    banner.position.set(0, arch.height - 0.08 - arch.bannerHeight / 2, 0);
    banner.castShadow = true;
    archGroup.add(banner);

    const startLine = new Mesh(
      new PlaneGeometry(TRACK.width, arch.startLineDepth),
      new MeshStandardMaterial({
        map: this.textures.createStartLine(),
        roughness: 0.65,
      }),
    );
    startLine.rotation.x = -Math.PI / 2;
    startLine.position.y = arch.startLineHeight;
    startLine.receiveShadow = true;
    archGroup.add(startLine);

    this.group.add(archGroup);
  }
}
