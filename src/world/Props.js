/**
 * Loose toys on the floor: Lego bricks, a striped ball, a stack of picture
 * books, a teddy bear, crayons, and a toy rocket.
 *
 * These are obstacles and storytelling props, not scenery. Each one is built
 * from primitives with rounded edges so it reads as moulded plastic or plush
 * rather than a pile of boxes.
 */
import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  COLORS,
  MATERIALS,
  PROPS_LAYOUT,
} from '../config/constants.js';

function addMesh(parent, geometry, material, x, y, z) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(parent, width, height, depth, material, x, y, z) {
  return addMesh(
    parent,
    new BoxGeometry(width, height, depth),
    material,
    x, y, z,
  );
}

function addCylinder(parent, radiusTop, radiusBottom, height, material, x, y, z, segments = 16) {
  return addMesh(
    parent,
    new CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
    x, y, z,
  );
}

export class Props {
  constructor() {
    this.group = new Group();
    this.group.name = 'Props';
    this.materials = {
      yellow: new MeshStandardMaterial({ color: COLORS.liveryYellow, roughness: 0.4 }),
      navy: new MeshStandardMaterial({ color: MATERIALS.fabricNavy, roughness: 0.55 }),
      red: new MeshStandardMaterial({ color: COLORS.kerbRed, roughness: 0.45 }),
      steel: new MeshStandardMaterial({ color: MATERIALS.steel, roughness: 0.35, metalness: 0.5 }),
      paper: new MeshStandardMaterial({ color: MATERIALS.paper, roughness: 0.5 }),
      cream: new MeshStandardMaterial({ color: MATERIALS.fabricCream, roughness: 0.88 }),
      teddy: new MeshStandardMaterial({ color: MATERIALS.teddy, roughness: 0.95 }),
      teddyDark: new MeshStandardMaterial({ color: MATERIALS.teddyDark, roughness: 0.95 }),
      dark: new MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }),
    };

    for (const brick of PROPS_LAYOUT.lego) this.buildLegoBrick(brick);
    this.buildBall();
    this.buildBookStack();
    this.buildTeddy();
    this.buildCrayons();
    this.buildRocket();
  }

  buildLegoBrick({ position, rotationY, color, studs }) {
    const brick = new Group();
    brick.position.fromArray(position);
    brick.rotation.y = rotationY;
    const material = this.materials[color] ?? this.materials.yellow;
    const [columns, rows] = studs;
    const unit = 0.12;
    const width = columns * unit;
    const depth = rows * unit;
    const base = addMesh(
      brick,
      new RoundedBoxGeometry(width, 0.14, depth, 2, 0.014),
      material,
      0, 0.07, 0,
    );
    base.receiveShadow = true;

    for (let ix = 0; ix < columns; ix += 1) {
      for (let iz = 0; iz < rows; iz += 1) {
        addCylinder(
          brick, 0.044, 0.044, 0.04, material,
          (ix - (columns - 1) / 2) * unit,
          0.16,
          (iz - (rows - 1) / 2) * unit,
          12,
        );
      }
    }
    this.group.add(brick);
  }

  buildBall() {
    const { position, radius } = PROPS_LAYOUT.ball;
    const ball = new Group();
    ball.position.fromArray(position);
    addMesh(
      ball,
      new SphereGeometry(radius, 24, 18),
      this.materials.paper,
      0, 0, 0,
    );
    const ring = addMesh(
      ball,
      new TorusGeometry(radius + 0.005, 0.012, 8, 36),
      this.materials.yellow,
      0, 0, 0,
    );
    ring.rotation.x = Math.PI / 2;
    const ring2 = addMesh(
      ball,
      new TorusGeometry(radius + 0.006, 0.009, 8, 36),
      this.materials.navy,
      0, 0, 0,
    );
    ring2.rotation.set(Math.PI / 2, 0, Math.PI / 3);
    this.group.add(ball);
  }

  buildBookStack() {
    const { position, rotationY } = PROPS_LAYOUT.books;
    const stack = new Group();
    stack.position.fromArray(position);
    stack.rotation.y = rotationY;
    const colors = [this.materials.yellow, this.materials.navy, this.materials.red];

    for (let i = 0; i < 3; i += 1) {
      const y = 0.03 + i * 0.072;
      const book = addMesh(
        stack,
        new RoundedBoxGeometry(0.5, 0.06, 0.36, 2, 0.01),
        colors[i],
        0, y, 0,
      );
      book.rotation.y = (i - 1) * 0.08;
      addBox(stack, 0.46, 0.045, 0.018, this.materials.paper, 0, y, 0.183);
    }
    this.group.add(stack);
  }

  buildTeddy() {
    const { position, rotationY } = PROPS_LAYOUT.teddy;
    const teddy = new Group();
    teddy.position.fromArray(position);
    teddy.rotation.y = rotationY;

    const body = addMesh(
      teddy,
      new SphereGeometry(0.22, 20, 16),
      this.materials.teddy,
      0, 0.34, 0,
    );
    body.scale.set(1, 1.12, 0.82);
    addMesh(teddy, new SphereGeometry(0.18, 20, 16), this.materials.teddy, 0, 0.68, 0);
    for (const side of [-1, 1]) {
      addMesh(teddy, new SphereGeometry(0.075, 14, 10), this.materials.teddy, side * 0.13, 0.82, 0);
      addMesh(teddy, new SphereGeometry(0.03, 10, 8), this.materials.dark, side * 0.06, 0.72, 0.158);
      addMesh(
        teddy,
        new CapsuleGeometry(0.055, 0.18, 4, 10),
        this.materials.teddy,
        side * 0.22, 0.36, 0.03,
      ).rotation.z = side * 0.55;
      addMesh(
        teddy,
        new CapsuleGeometry(0.07, 0.18, 4, 10),
        this.materials.teddy,
        side * 0.12, 0.13, 0.17,
      ).rotation.x = Math.PI / 2;
      addMesh(
        teddy,
        new SphereGeometry(0.052, 12, 10),
        this.materials.yellow,
        side * 0.045, 0.54, 0.16,
      ).scale.set(1.25, 0.6, 0.5);
    }
    const muzzle = addMesh(
      teddy,
      new SphereGeometry(0.09, 16, 12),
      this.materials.cream,
      0, 0.65, 0.145,
    );
    muzzle.scale.set(1, 0.72, 0.62);
    addMesh(teddy, new SphereGeometry(0.028, 10, 8), this.materials.dark, 0, 0.665, 0.225);
    this.group.add(teddy);
  }

  buildCrayons() {
    const { position, rotationY } = PROPS_LAYOUT.crayons;
    const crayons = new Group();
    crayons.position.fromArray(position);
    crayons.rotation.y = rotationY;
    const colors = [this.materials.yellow, this.materials.red, this.materials.navy, this.materials.paper];

    for (let i = 0; i < colors.length; i += 1) {
      const z = (i - 1.5) * 0.075;
      const body = addCylinder(crayons, 0.024, 0.024, 0.28, colors[i], 0, 0.024, z, 12);
      body.rotation.z = Math.PI / 2;
      const tip = addMesh(
        crayons,
        new ConeGeometry(0.024, 0.08, 12),
        colors[i],
        0.18, 0.024, z,
      );
      tip.rotation.z = -Math.PI / 2;
      const band = addCylinder(crayons, 0.027, 0.027, 0.08, this.materials.cream, 0, 0.024, z, 12);
      band.rotation.z = Math.PI / 2;
    }
    this.group.add(crayons);
  }

  buildRocket() {
    const { position, rotationY } = PROPS_LAYOUT.rocket;
    const rocket = new Group();
    rocket.position.fromArray(position);
    rocket.rotation.y = rotationY;

    addCylinder(rocket, 0.12, 0.12, 0.04, this.materials.steel, 0, 0.02, 0, 18);
    addCylinder(rocket, 0.09, 0.09, 0.56, this.materials.paper, 0, 0.32, 0, 18);
    addCylinder(rocket, 0.092, 0.092, 0.04, this.materials.red, 0, 0.24, 0, 18);
    const nose = addMesh(
      rocket,
      new ConeGeometry(0.09, 0.22, 18),
      this.materials.red,
      0, 0.71, 0,
    );
    nose.castShadow = true;
    addMesh(rocket, new SphereGeometry(0.042, 12, 10), this.materials.navy, 0, 0.42, 0.085);

    for (let i = 0; i < 3; i += 1) {
      const angle = (i * Math.PI * 2) / 3;
      const fin = addBox(
        rocket, 0.025, 0.22, 0.14, this.materials.yellow,
        Math.sin(angle) * 0.11, 0.18, Math.cos(angle) * 0.11,
      );
      fin.rotation.y = angle;
    }
    this.group.add(rocket);
  }
}
