/**
 * Mini-stars and nitro pickups laid out along the racing line.
 *
 * Stars add score. Nitro canisters refill the boost tank, so a player who
 * spends boost early is rewarded for staying on the ribbon. Both are built from
 * shared geometry, use a cheap bob/spin animation, and are collected with a
 * squared-distance test in the fixed step. A short scale-up pop hides the
 * pickup instead of making it vanish on one frame.
 */
import {
  ConeGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Shape,
  TorusGeometry,
  Vector3,
} from 'three';
import { COLORS } from '../config/constants.js';
import { TRACK } from '../config/track.config.js';

const STAR_POINTS = 5;

export class Collectibles {
  constructor({ trackPath, car, bus }) {
    if (!trackPath || !car) {
      throw new Error('Collectibles needs the track and the car.');
    }

    this.trackPath = trackPath;
    this.car = car;
    this.bus = bus ?? null;
    this.group = new Group();
    this.group.name = 'Collectibles';

    this.elapsed = 0;
    this.starsCollected = 0;
    this.starsTotal = TRACK.collectibles.starUs.length;
    this.score = 0;
    this.items = [];
    this.geometries = [];
    this.materials = [];
    this.event = {
      kind: 'star',
      id: 0,
      score: 0,
      collected: 0,
      total: 0,
      boostEnergy: 0,
    };
    this.frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };

    this.createResources();
    this.starTemplate = this.buildStarTemplate();
    this.nitroTemplate = this.buildNitroTemplate();
    this.placePickups();
  }

  createResources() {
    this.yellowMaterial = new MeshStandardMaterial({
      color: COLORS.liveryYellow,
      emissive: COLORS.liveryYellow,
      emissiveIntensity: 0.28,
      roughness: 0.34,
      metalness: 0.06,
    });
    this.navyMaterial = new MeshStandardMaterial({
      color: COLORS.liveryNavy,
      roughness: 0.38,
      metalness: 0.12,
    });
    this.redMaterial = new MeshStandardMaterial({
      color: COLORS.kerbRed,
      emissive: COLORS.kerbRed,
      emissiveIntensity: 0.18,
      roughness: 0.34,
    });
    this.glowMaterial = new MeshStandardMaterial({
      color: COLORS.liveryYellow,
      emissive: COLORS.liveryYellow,
      emissiveIntensity: 0.75,
      roughness: 0.3,
    });
    this.materials.push(
      this.yellowMaterial,
      this.navyMaterial,
      this.redMaterial,
      this.glowMaterial,
    );
  }

  buildStarTemplate() {
    const shape = new Shape();
    const outerRadius = 0.1;
    const innerRadius = 0.044;

    for (let i = 0; i < STAR_POINTS * 2; i += 1) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = -Math.PI / 2 + (i * Math.PI) / STAR_POINTS;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();

    const geometry = new ExtrudeGeometry(shape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelThickness: 0.006,
      bevelSize: 0.006,
      bevelSegments: 1,
      curveSegments: 1,
    });
    geometry.translate(0, 0, -0.0175);
    geometry.computeVertexNormals();
    this.geometries.push(geometry);

    const mesh = new Mesh(geometry, this.yellowMaterial);
    mesh.castShadow = false;
    const template = new Group();
    template.add(mesh);
    return template;
  }

  buildNitroTemplate() {
    const bodyGeometry = new CylinderGeometry(0.055, 0.055, 0.16, 12);
    const bandGeometry = new CylinderGeometry(0.058, 0.058, 0.03, 12);
    const capGeometry = new ConeGeometry(0.04, 0.05, 12);
    const baseGeometry = new CylinderGeometry(0.058, 0.058, 0.02, 12);
    const ringGeometry = new TorusGeometry(0.072, 0.008, 6, 16);
    this.geometries.push(
      bodyGeometry,
      bandGeometry,
      capGeometry,
      baseGeometry,
      ringGeometry,
    );

    const body = new Mesh(bodyGeometry, this.navyMaterial);
    const band = new Mesh(bandGeometry, this.glowMaterial);
    band.position.y = 0.02;
    const base = new Mesh(baseGeometry, this.glowMaterial);
    base.position.y = -0.08;
    const cap = new Mesh(capGeometry, this.redMaterial);
    cap.position.y = 0.105;
    const ring = new Mesh(ringGeometry, this.glowMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.035;

    body.castShadow = true;
    cap.castShadow = true;
    const template = new Group();
    template.add(body, band, base, cap, ring);
    return template;
  }

  placePickups() {
    const config = TRACK.collectibles;
    let id = 0;

    for (const [index, u] of config.starUs.entries()) {
      this.addItem('star', id, u, index % 2 === 0 ? 1 : -1);
      id += 1;
    }
    for (const [index, u] of config.nitroUs.entries()) {
      this.addItem('nitro', id, u, index % 2 === 0 ? -1 : 1);
      id += 1;
    }
  }

  addItem(kind, id, u, sideSign) {
    const config = TRACK.collectibles;
    const frame = this.trackPath.getFrameAt(u, this.frame);
    const lateral = config.lateral * sideSign;
    const template = kind === 'star' ? this.starTemplate : this.nitroTemplate;
    const group = template.clone(true);

    const x = frame.position.x + frame.side.x * lateral;
    const z = frame.position.z + frame.side.z * lateral;
    const baseY = frame.position.y + config.hover;
    group.position.set(x, baseY, z);
    this.group.add(group);

    this.items.push({
      kind,
      id,
      x,
      z,
      baseY,
      group,
      phase: id * 1.7,
      collected: false,
      pop: 0,
    });
  }

  /** Fixed-step collection test against the car's simulated centre. */
  fixedUpdate() {
    const car = this.car;
    const config = TRACK.collectibles;
    const radius2 = config.pickupRadius * config.pickupRadius;

    for (const item of this.items) {
      if (item.collected) continue;

      const dx = car.physics.position.x - item.x;
      const dz = car.physics.position.z - item.z;
      if (dx * dx + dz * dz > radius2) continue;
      if (Math.abs(car.physics.position.y - item.baseY) > config.pickupHeight) {
        continue;
      }

      this.collect(item);
    }
  }

  collect(item) {
    const config = TRACK.collectibles;
    const car = this.car;
    item.collected = true;
    item.pop = 0;

    if (item.kind === 'star') {
      this.starsCollected += 1;
      this.score += config.starScore;
    } else {
      car.physics.boostEnergy = Math.min(
        1,
        car.physics.boostEnergy + config.nitroRefill,
      );
    }

    const event = this.event;
    event.kind = item.kind;
    event.id = item.id;
    event.score = this.score;
    event.collected = this.starsCollected;
    event.total = this.starsTotal;
    event.boostEnergy = car.physics.boostEnergy;
    this.bus?.emit('collectible:collected', event);
    this.bus?.emit('ui:toast', {
      message:
        item.kind === 'star'
          ? `Star ${this.starsCollected} of ${this.starsTotal}`
          : 'Boost refilled',
    });
  }

  /** Render-clock animation: bob, spin, and scale-up the collected pickup. */
  update(dt) {
    const config = TRACK.collectibles;
    this.elapsed += dt;

    for (const item of this.items) {
      if (item.collected) {
        if (!item.group.visible) continue;
        item.pop += dt / config.popSeconds;
        const t = Math.min(item.pop, 1);
        item.group.scale.setScalar(1 + t * 0.55);
        item.group.position.y = item.baseY + t * 0.18;
        if (t >= 1) item.group.visible = false;
        continue;
      }

      item.group.rotation.y = this.elapsed * config.spinSpeed + item.phase;
      item.group.position.y =
        item.baseY +
        Math.sin(this.elapsed * config.bobSpeed + item.phase) * config.bob;
    }
  }

  /** Future race restart: brings every pickup back and clears the score. */
  reset() {
    this.elapsed = 0;
    this.starsCollected = 0;
    this.score = 0;

    for (const item of this.items) {
      item.collected = false;
      item.pop = 0;
      item.group.visible = true;
      item.group.scale.setScalar(1);
      item.group.position.y = item.baseY;
    }
  }

  dispose() {
    this.group.removeFromParent();
    for (const geometry of this.geometries) geometry.dispose();
    for (const material of this.materials) material.dispose();
  }
}
