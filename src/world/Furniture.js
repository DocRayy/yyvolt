/**
 * The bedroom furniture: bed, bedside table and lamp, desk, chair, wardrobe,
 * bookshelf with instanced books, and a painted toy box.
 *
 * Pieces are built in local space and placed with FURNITURE_LAYOUT, so Phase 4
 * can route the track around real footprints. Shapes favour rounded volumes and
 * chunky proportions: this is a kid's room seen at toy scale, not an office.
 */
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SphereGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  COLORS,
  FURNITURE_LAYOUT,
  MATERIALS,
} from '../config/constants.js';
import {
  LAMP_GLOW,
  NIGHT_PRESET,
} from '../config/lighting.config.js';
import { clamp } from '../utils/math.js';

function box(parent, width, height, depth, material, x, y, z, cast = true) {
  const mesh = new Mesh(new BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function rounded(parent, width, height, depth, radius, material, x, y, z) {
  const mesh = new Mesh(
    new RoundedBoxGeometry(width, height, depth, 3, radius),
    material,
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, radiusTop, radiusBottom, height, material, x, y, z, segments = 16) {
  const mesh = new Mesh(
    new CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export class Furniture {
  constructor(textures) {
    this.group = new Group();
    this.group.name = 'Furniture';
    this.lampShades = [];
    this.lampBulbs = [];
    this.lampAnchors = {};

    this.materials = {
      wood: new MeshStandardMaterial({ color: MATERIALS.wood, roughness: 0.6 }),
      woodDark: new MeshStandardMaterial({ color: MATERIALS.woodDark, roughness: 0.62 }),
      woodLight: new MeshStandardMaterial({ color: MATERIALS.woodLight, roughness: 0.58 }),
      paper: new MeshStandardMaterial({ color: MATERIALS.paper, roughness: 0.78 }),
      cream: new MeshStandardMaterial({ color: MATERIALS.fabricCream, roughness: 0.9 }),
      navy: new MeshStandardMaterial({ color: MATERIALS.fabricNavy, roughness: 0.52 }),
      yellow: new MeshStandardMaterial({ color: COLORS.liveryYellow, roughness: 0.42 }),
      steel: new MeshStandardMaterial({ color: MATERIALS.steel, metalness: 0.6, roughness: 0.3 }),
      fabric: new MeshStandardMaterial({ map: textures.createFabric(), roughness: 0.94 }),
      book: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 }),
    };

    this.buildBed();
    this.buildBedside();
    this.buildDesk();
    this.buildChair();
    this.buildWardrobe();
    this.buildBookshelf();
    this.buildToyBox();
  }

  buildBed() {
    const { position, width, length, legHeight, mattressHeight, headboardHeight } =
      FURNITURE_LAYOUT.bed;
    const bed = new Group();
    bed.position.fromArray(position);
    const frameHeight = 0.18;
    const mattressTop = legHeight + frameHeight + mattressHeight;

    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        box(
          bed, 0.12, legHeight, 0.12, this.materials.woodDark,
          x * (width / 2 - 0.1), legHeight / 2, z * (length / 2 - 0.1),
        );
      }
    }
    box(bed, 0.08, frameHeight, length, this.materials.wood, -width / 2 + 0.04, legHeight + frameHeight / 2, 0);
    box(bed, 0.08, frameHeight, length, this.materials.wood, width / 2 - 0.04, legHeight + frameHeight / 2, 0);
    box(bed, width, frameHeight, 0.08, this.materials.wood, 0, legHeight + frameHeight / 2, -length / 2 + 0.04);
    box(bed, width, frameHeight, 0.08, this.materials.wood, 0, legHeight + frameHeight / 2, length / 2 - 0.04);

    for (let i = 0; i < 5; i += 1) {
      const z = -length / 2 + 0.45 + (i * (length - 0.9)) / 4;
      box(bed, width - 0.2, 0.04, 0.08, this.materials.woodDark, 0, legHeight + 0.07, z);
    }

    rounded(
      bed, width, mattressHeight, length, 0.07, this.materials.paper,
      0, legHeight + frameHeight + mattressHeight / 2, 0,
    );
    rounded(
      bed, width + 0.08, headboardHeight, 0.12, 0.05, this.materials.wood,
      0, legHeight + headboardHeight / 2, -length / 2 + 0.02,
    );
    rounded(
      bed, width * 0.72, headboardHeight * 0.58, 0.025, 0.03, this.materials.cream,
      0, legHeight + headboardHeight * 0.52, -length / 2 + 0.09,
    );

    const blanketZ = length * 0.15;
    const blanketLength = length * 0.62;
    rounded(
      bed, width + 0.04, 0.12, blanketLength, 0.05, this.materials.fabric,
      0, mattressTop + 0.055, blanketZ,
    );
    for (const side of [-1, 1]) {
      box(
        bed, 0.05, 0.34, blanketLength, this.materials.fabric,
        side * (width / 2 + 0.015), mattressTop - 0.14, blanketZ, false,
      );
    }
    box(
      bed, width + 0.04, 0.32, 0.05, this.materials.fabric,
      0, mattressTop - 0.13, length / 2 - 0.06, false,
    );

    for (const side of [-1, 1]) {
      const pillow = rounded(
        bed, 0.82, 0.16, 0.52, 0.07,
        side === -1 ? this.materials.paper : this.materials.cream,
        side * 0.58, mattressTop + 0.11, -length / 2 + 0.43,
      );
      pillow.rotation.z = side * 0.04;
    }

    this.group.add(bed);
  }

  buildBedside() {
    const { position, width, depth, height } = FURNITURE_LAYOUT.bedside;
    const table = new Group();
    table.position.fromArray(position);
    const legHeight = 0.2;

    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        box(
          table, 0.06, legHeight, 0.06, this.materials.woodDark,
          x * (width / 2 - 0.06), legHeight / 2, z * (depth / 2 - 0.06),
        );
      }
    }
    box(table, width, height - legHeight - 0.05, depth, this.materials.wood, 0, legHeight + (height - legHeight - 0.05) / 2, 0);
    box(table, width + 0.06, 0.05, depth + 0.06, this.materials.woodLight, 0, height - 0.025, 0);
    box(table, width * 0.76, 0.2, 0.02, this.materials.woodLight, 0, height * 0.52, depth / 2 + 0.01);
    const knob = new Mesh(new SphereGeometry(0.025, 12, 8), this.materials.steel);
    knob.position.set(0, height * 0.52, depth / 2 + 0.035);
    table.add(knob);

    this.buildLamp(table, 0, height, 0, 0.82, 'bedside');
    this.group.add(table);
  }

  buildDesk() {
    const { position, width, length, height } = FURNITURE_LAYOUT.desk;
    const desk = new Group();
    desk.position.fromArray(position);

    rounded(desk, width, 0.08, length, 0.035, this.materials.wood, 0, height, 0);
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        box(
          desk, 0.07, height, 0.07, this.materials.woodDark,
          x * (width / 2 - 0.08), height / 2, z * (length / 2 - 0.1),
        );
      }
    }
    box(desk, 0.03, 0.5, length * 0.82, this.materials.woodDark, width / 2 - 0.04, height * 0.58, 0);

    const drawer = box(desk, 0.42, 0.5, 0.55, this.materials.wood, -width / 2 + 0.27, 0.47, length / 2 - 0.45);
    drawer.castShadow = true;
    for (const y of [0.33, 0.6]) {
      box(desk, 0.36, 0.17, 0.02, this.materials.woodLight, -width / 2 + 0.27, y, length / 2 - 0.165);
      const knob = new Mesh(new SphereGeometry(0.022, 12, 8), this.materials.steel);
      knob.position.set(-width / 2 + 0.27, y, length / 2 - 0.14);
      desk.add(knob);
    }

    this.buildLamp(desk, 0.22, height + 0.04, -length / 2 + 0.38, 0.92, 'desk');

    cylinder(desk, 0.075, 0.07, 0.16, this.materials.navy, -0.22, height + 0.12, -0.42);
    for (let i = 0; i < 3; i += 1) {
      const pencil = cylinder(
        desk, 0.012, 0.012, 0.24,
        i === 0 ? this.materials.yellow : i === 1 ? this.materials.steel : this.materials.navy,
        -0.22 + (i - 1) * 0.045, height + 0.27, -0.42,
      );
      pencil.rotation.z = (i - 1) * 0.16;
    }
    this.group.add(desk);
  }

  buildChair() {
    const { position, rotationY } = FURNITURE_LAYOUT.chair;
    const chair = new Group();
    chair.position.fromArray(position);
    chair.rotation.y = rotationY;

    rounded(chair, 0.66, 0.1, 0.66, 0.04, this.materials.wood, 0, 0.52, 0);
    rounded(chair, 0.56, 0.06, 0.56, 0.03, this.materials.cream, 0, 0.59, 0);
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        box(chair, 0.055, 0.5, 0.055, this.materials.woodDark, x * 0.27, 0.25, z * 0.27);
      }
    }
    rounded(chair, 0.66, 0.62, 0.08, 0.035, this.materials.wood, 0, 0.9, -0.32);
    rounded(chair, 0.54, 0.44, 0.05, 0.025, this.materials.cream, 0, 0.9, -0.27);
    this.group.add(chair);
  }

  buildWardrobe() {
    const { position, width, length, height } = FURNITURE_LAYOUT.wardrobe;
    const wardrobe = new Group();
    wardrobe.position.fromArray(position);

    rounded(wardrobe, width, height, length, 0.05, this.materials.wood, 0, height / 2, 0);
    for (const z of [-1, 1]) {
      rounded(wardrobe, 0.035, height * 0.88, length * 0.46, 0.02, this.materials.woodLight, width / 2 + 0.02, height * 0.5, z * length * 0.24);
      box(wardrobe, 0.025, 0.2, 0.025, this.materials.steel, width / 2 + 0.06, height * 0.5, z * 0.1);
    }
    box(wardrobe, 0.012, 0.06, length * 0.9, this.materials.yellow, width / 2 + 0.045, height * 0.24, 0);
    box(wardrobe, width + 0.08, 0.08, length + 0.08, this.materials.woodDark, 0, height + 0.04, 0);
    for (const x of [-1, 1]) {
      for (const z of [-1, 1]) {
        box(wardrobe, 0.1, 0.12, 0.1, this.materials.woodDark, x * (width / 2 - 0.08), 0.06, z * (length / 2 - 0.1));
      }
    }
    this.group.add(wardrobe);
  }

  buildBookshelf() {
    const { position, width, depth, height } = FURNITURE_LAYOUT.bookshelf;
    const shelf = new Group();
    shelf.position.fromArray(position);

    box(shelf, width, height, 0.04, this.materials.woodDark, 0, height / 2, -depth / 2 + 0.02);
    for (const side of [-1, 1]) {
      box(shelf, 0.06, height, depth, this.materials.wood, side * (width / 2 - 0.03), height / 2, 0);
    }
    const shelfYs = [0.08, 0.56, 1.04, 1.52, 2];
    for (const y of shelfYs) {
      box(shelf, width - 0.12, 0.05, depth - 0.04, this.materials.woodLight, 0, y, 0.01);
    }
    box(shelf, width, 0.06, depth, this.materials.wood, 0, height, 0);

    const rows = 5;
    const perRow = 6;
    const count = rows * perRow;
    const books = new InstancedMesh(
      new BoxGeometry(1, 1, 1),
      this.materials.book,
      count,
    );
    books.castShadow = true;
    books.receiveShadow = true;
    const dummy = new Object3D();
    const color = new Color();
    let seed = 53;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let row = 0; row < rows; row += 1) {
      const baseY = [0.11, 0.59, 1.07, 1.55, 2.03][row];
      const slot = (width - 0.3) / perRow;
      for (let i = 0; i < perRow; i += 1) {
        const index = row * perRow + i;
        const w = slot * (0.55 + random() * 0.32);
        const h = 0.17 + random() * 0.1;
        const d = depth * (0.58 + random() * 0.16);
        dummy.position.set(
          -width / 2 + 0.15 + slot * (i + 0.5),
          baseY + h / 2,
          0.04,
        );
        dummy.rotation.set(0, 0, random() > 0.84 ? 0.08 : 0);
        dummy.scale.set(w, h, d);
        dummy.updateMatrix();
        books.setMatrixAt(index, dummy.matrix);
        color.setHex(MATERIALS.bookColors[Math.floor(random() * MATERIALS.bookColors.length)]);
        books.setColorAt(index, color);
      }
    }
    books.instanceMatrix.needsUpdate = true;
    if (books.instanceColor) books.instanceColor.needsUpdate = true;
    shelf.add(books);
    this.group.add(shelf);
  }

  buildToyBox() {
    const { position, width, depth, height } = FURNITURE_LAYOUT.toyBox;
    const chest = new Group();
    chest.position.fromArray(position);

    rounded(chest, width, height * 0.82, depth, 0.045, this.materials.navy, 0, height * 0.41, 0);
    rounded(chest, width + 0.06, 0.12, depth + 0.06, 0.03, this.materials.yellow, 0, height * 0.82 + 0.06, 0);
    box(chest, 0.18, 0.14, 0.04, this.materials.steel, 0, height * 0.68, depth / 2 + 0.03);
    for (const side of [-1, 1]) {
      box(chest, 0.04, 0.16, 0.3, this.materials.steel, side * (width / 2 + 0.02), height * 0.44, 0);
      for (const z of [-1, 1]) {
        box(chest, 0.1, 0.1, 0.1, this.materials.woodDark, side * (width / 2 - 0.12), 0.05, z * (depth / 2 - 0.12));
      }
    }
    this.group.add(chest);
  }

  buildLamp(parent, x, y, z, scale, name) {
    const base = cylinder(parent, 0.075 * scale, 0.09 * scale, 0.045, this.materials.steel, x, y + 0.022, z, 18);
    base.castShadow = true;
    cylinder(parent, 0.014, 0.014, 0.3 * scale, this.materials.steel, x, y + 0.17 * scale, z, 10);
    const shade = new Mesh(
      new CylinderGeometry(
        0.11 * scale,
        0.18 * scale,
        0.17 * scale,
        20,
        1,
        true,
      ),
      new MeshStandardMaterial({
        color: MATERIALS.fabricCream,
        emissive: 0xffc20e,
        emissiveIntensity: 0.05,
        roughness: 0.8,
        side: DoubleSide,
      }),
    );
    shade.position.set(x, y + 0.36 * scale, z);
    shade.name = `${name}LampShade`;
    shade.userData.lamp = name;
    shade.userData.noBatch = true;
    parent.add(shade);
    const bulb = new Mesh(
      new SphereGeometry(0.045 * scale, 12, 8),
      new MeshStandardMaterial({
        color: MATERIALS.paper,
        emissive: 0xffc20e,
        emissiveIntensity: 0.12,
        roughness: 0.4,
      }),
    );
    bulb.position.set(x, y + 0.3 * scale, z);
    bulb.userData.lamp = name;
    bulb.userData.noBatch = true;
    parent.add(bulb);
    this.lampShades.push(shade);
    this.lampBulbs.push(bulb);
    this.lampAnchors[name] = bulb;
  }

  /** 0 = day, 1 = night. The glass warms up; the point lights live in LightingRig. */
  setNightFactor(value) {
    const t = clamp(value, 0, 1);
    for (const shade of this.lampShades) {
      shade.material.emissive.setHex(
        shade.userData.lamp === 'desk'
          ? NIGHT_PRESET.deskLamp.color
          : NIGHT_PRESET.bedsideLamp.color,
      );
      shade.material.emissiveIntensity = LAMP_GLOW.shade * t;
    }
    for (const bulb of this.lampBulbs) {
      bulb.material.emissive.setHex(
        bulb.userData.lamp === 'desk'
          ? NIGHT_PRESET.deskLamp.color
          : NIGHT_PRESET.bedsideLamp.color,
      );
      bulb.material.emissiveIntensity = LAMP_GLOW.bulb * t;
    }
  }
}
