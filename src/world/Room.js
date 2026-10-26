/**
 * The bedroom shell: floor, walls, ceiling, trim, rug, posters, door, window,
 * and the pendant lamp. Furniture and loose toys are separate so Phase 4 can
 * reason about the track and Phase 5 about the car without touching the shell.
 *
 * Everything is built from planes and boxes; the warmth comes from procedural
 * textures and daylight rather than heavy geometry.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  DoubleSide,
} from 'three';
import { MATERIALS, ROOM } from '../config/constants.js';
import { Window } from './Window.js';

export class Room {
  constructor(textures) {
    this.group = new Group();
    this.group.name = 'Room';
    this.ceiling = null;
    this.ceilingLamp = null;
    this.window = null;
    this.buildShell(textures);
    this.buildDecor(textures);
  }

  buildShell(textures) {
    const { width, depth, height } = ROOM;
    const floor = new Mesh(
      new PlaneGeometry(width, depth),
      new MeshStandardMaterial({
        map: textures.createFloorWood(),
        roughness: 0.68,
        metalness: 0.02,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    const wallMaterial = new MeshStandardMaterial({
      map: textures.createWall(),
      roughness: 0.95,
    });
    const wallData = [
      [width, height, 0, height / 2, -depth / 2, 0],
      [width, height, 0, height / 2, depth / 2, Math.PI],
      [depth, height, -width / 2, height / 2, 0, Math.PI / 2],
      [depth, height, width / 2, height / 2, 0, -Math.PI / 2],
    ];
    for (const [w, h, x, y, z, rotationY] of wallData) {
      const wall = new Mesh(new PlaneGeometry(w, h), wallMaterial);
      wall.position.set(x, y, z);
      wall.rotation.y = rotationY;
      wall.receiveShadow = true;
      this.group.add(wall);
    }

    this.ceiling = new Mesh(
      new PlaneGeometry(width, depth),
      new MeshStandardMaterial({
        color: MATERIALS.ceiling,
        roughness: 0.96,
      }),
    );
    this.ceiling.rotation.x = Math.PI / 2;
    this.ceiling.position.y = height;
    this.ceiling.receiveShadow = true;
    this.ceiling.userData.noBatch = true;
    this.group.add(this.ceiling);

    const trim = new MeshStandardMaterial({
      color: MATERIALS.paper,
      roughness: 0.55,
    });
    const { height: trimHeight, thickness } = ROOM.baseboard;
    const addTrim = (w, d, x, z) => {
      const board = new Mesh(
        new BoxGeometry(w, trimHeight, d),
        trim,
      );
      board.position.set(x, trimHeight / 2, z);
      board.receiveShadow = true;
      this.group.add(board);
    };
    addTrim(width, thickness, 0, -depth / 2 + thickness / 2);
    addTrim(width, thickness, 0, depth / 2 - thickness / 2);
    addTrim(thickness, depth, -width / 2 + thickness / 2, 0);
    addTrim(thickness, depth, width / 2 - thickness / 2, 0);

    const rug = new Mesh(
      new PlaneGeometry(ROOM.rug.size[0], ROOM.rug.size[1]),
      new MeshStandardMaterial({
        map: textures.createRug(),
        roughness: 0.96,
      }),
    );
    rug.rotation.x = -Math.PI / 2;
    rug.rotation.z = ROOM.rug.rotation;
    rug.position.set(
      ROOM.rug.position[0],
      ROOM.rug.position[1],
      ROOM.rug.position[2],
    );
    rug.receiveShadow = true;
    this.group.add(rug);
  }

  buildDecor(textures) {
    this.window = new Window(textures);
    this.group.add(this.window.group);

    const frameMaterial = new MeshStandardMaterial({
      color: MATERIALS.woodDark,
      roughness: 0.62,
    });
    for (const poster of ROOM.posters) {
      const [w, h] = poster.size;
      const holder = new Group();
      holder.position.fromArray(poster.position);
      holder.rotation.y = poster.rotationY;

      const backing = new Mesh(
        new BoxGeometry(w + 0.08, h + 0.08, 0.035),
        frameMaterial,
      );
      backing.position.z = -0.02;
      holder.add(backing);

      const print = new Mesh(
        new PlaneGeometry(w, h),
        new MeshStandardMaterial({
          map: textures.createPoster(poster.id),
          roughness: 0.82,
        }),
      );
      print.position.z = 0.008;
      holder.add(print);
      this.group.add(holder);
    }

    this.buildDoor();
    this.buildCeilingLamp();
  }

  buildDoor() {
    const [width, height] = ROOM.door.size;
    const [x, , z] = ROOM.door.position;
    const door = new Group();
    door.position.set(x, 0, z);

    const panelMaterial = new MeshStandardMaterial({
      color: MATERIALS.paper,
      roughness: 0.62,
    });
    const panel = new Mesh(
      new BoxGeometry(width, height, 0.06),
      panelMaterial,
    );
    panel.position.y = height / 2;
    door.add(panel);

    const insetMaterial = new MeshStandardMaterial({
      color: MATERIALS.fabricCream,
      roughness: 0.7,
    });
    for (const y of [0.62, 1.55]) {
      const inset = new Mesh(
        new BoxGeometry(width * 0.68, height * 0.32, 0.018),
        insetMaterial,
      );
      inset.position.set(0, y, -0.038);
      door.add(inset);
    }

    const knob = new Mesh(
      new SphereGeometry(0.045, 14, 10),
      new MeshStandardMaterial({ color: MATERIALS.steel, metalness: 0.7, roughness: 0.3 }),
    );
    knob.position.set(width * 0.34, 1.05, -0.07);
    door.add(knob);

    const trimMaterial = new MeshStandardMaterial({
      color: MATERIALS.paper,
      roughness: 0.55,
    });
    for (const side of [-1, 1]) {
      const bar = new Mesh(
        new BoxGeometry(0.09, height + 0.12, 0.07),
        trimMaterial,
      );
      bar.position.set(side * (width / 2 + 0.045), height / 2, -0.015);
      door.add(bar);
    }
    const top = new Mesh(
      new BoxGeometry(width + 0.18, 0.09, 0.07),
      trimMaterial,
    );
    top.position.set(0, height + 0.045, -0.015);
    door.add(top);

    this.group.add(door);
  }

  buildCeilingLamp() {
    const { position, cordLength, shadeRadius, shadeHeight } = ROOM.ceilingLamp;
    const lamp = new Group();
    lamp.position.fromArray(position);

    const cord = new Mesh(
      new CylinderGeometry(0.014, 0.014, cordLength, 8),
      new MeshStandardMaterial({ color: MATERIALS.steel, roughness: 0.5 }),
    );
    cord.userData.noBatch = true;
    cord.position.y = -cordLength / 2;
    lamp.add(cord);

    const shade = new Mesh(
      new CylinderGeometry(
        shadeRadius * 0.48,
        shadeRadius,
        shadeHeight,
        24,
        1,
        true,
      ),
      new MeshStandardMaterial({
        color: MATERIALS.fabricCream,
        roughness: 0.82,
        side: DoubleSide,
      }),
    );
    shade.position.y = -cordLength - shadeHeight / 2;
    shade.userData.noBatch = true;
    lamp.add(shade);

    const bulb = new Mesh(
      new SphereGeometry(shadeRadius * 0.26, 12, 8),
      new MeshStandardMaterial({
        color: MATERIALS.paper,
        emissive: 0xffc20e,
        emissiveIntensity: 0.12,
        roughness: 0.4,
      }),
    );
    bulb.position.y = -cordLength - shadeHeight * 0.9;
    bulb.userData.noBatch = true;
    lamp.add(bulb);

    this.ceilingLampShade = shade;
    this.ceilingBulb = bulb;
    this.ceilingLamp = lamp;
    this.group.add(lamp);
  }

  /** The aerial camera needs the whole ceiling assembly out of the way. */
  setCeilingVisible(visible) {
    this.ceiling.visible = visible;
    if (this.ceilingLamp) this.ceilingLamp.visible = visible;
  }
}
