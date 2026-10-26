/**
 * The player's toy F1 car, built entirely from primitives.
 *
 * The model root is the ground contact point and points down local -Z. A child
 * `body` group carries the suspension pitch/roll so the four wheels stay
 * planted. Camera mounts and the night lighting live in the same model so
 * CameraRig never has to know how the car is assembled.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  SpotLight,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CAR } from '../config/car.config.js';
import { COLORS } from '../config/constants.js';
import { DAY_PRESET, NIGHT_PRESET } from '../config/lighting.config.js';
import { clamp, lerp } from '../utils/math.js';

function addMesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(parent, width, height, depth, material, x, y, z) {
  return addMesh(parent, new BoxGeometry(width, height, depth), material, x, y, z);
}

function addRounded(parent, width, height, depth, radius, material, x, y, z) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 3, radius);
  return addMesh(parent, geometry, material, x, y, z);
}

export class CarModel {
  constructor(textures, { headlightCount = 2 } = {}) {
    this.headlightCount = headlightCount;
    this.group = new Group();
    this.group.name = 'YYVOLT car';
    this.group.rotation.order = 'YXZ';

    this.body = new Group();
    this.body.name = 'Car body';
    this.group.add(this.body);

    this.wheels = [];
    this.frontPivots = [];
    this.headlights = [];
    this.nightFactor = 0;
    this.braking = false;

    this.pitch = 0;
    this.pitchVelocity = 0;
    this.roll = 0;
    this.rollVelocity = 0;

    const boltTexture = textures.createCarBolt();
    this.materials = {
      yellow: new MeshPhysicalMaterial({
        color: COLORS.liveryYellow,
        roughness: 0.24,
        metalness: 0.04,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
      }),
      navy: new MeshPhysicalMaterial({
        color: COLORS.liveryNavy,
        roughness: 0.32,
        metalness: 0.06,
        clearcoat: 0.9,
        clearcoatRoughness: 0.14,
      }),
      carbon: new MeshStandardMaterial({
        color: 0x171b23,
        roughness: 0.48,
        metalness: 0.3,
      }),
      tire: new MeshStandardMaterial({
        color: 0x1a1c21,
        roughness: 0.95,
        metalness: 0,
      }),
      rim: new MeshStandardMaterial({
        color: 0xd7dde7,
        roughness: 0.24,
        metalness: 0.9,
      }),
      helmet: new MeshPhysicalMaterial({
        color: COLORS.paper,
        roughness: 0.24,
        metalness: 0.02,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
      }),
      visor: new MeshStandardMaterial({
        color: 0x080b11,
        roughness: 0.16,
        metalness: 0.45,
      }),
      lens: new MeshStandardMaterial({
        color: 0xffffff,
        emissive: CAR.lights.color,
        emissiveIntensity: 0,
        roughness: 0.18,
      }),
      tail: new MeshStandardMaterial({
        color: 0x3b080d,
        emissive: CAR.lights.tailColor,
        emissiveIntensity: 0,
        roughness: 0.35,
      }),
      sticker: new MeshStandardMaterial({
        map: boltTexture,
        transparent: true,
        alphaTest: 0.2,
        roughness: 0.55,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    };
    this.tailMaterial = this.materials.tail;
    this.lensMaterial = this.materials.lens;

    this.buildChassis();
    this.buildAero();
    this.buildWheels();
    this.buildDriver();
    this.buildSticker();
    this.buildMounts();
    this.buildLights();
    this.setNightFactor(0);
  }

  buildChassis() {
    const m = this.materials;

    // Floor plank and main tub. The tub is the yellow livery; navy sidepods
    // and wings give the car the toy F1 colour split.
    addBox(this.body, 0.24, 0.018, 0.5, m.carbon, 0, 0.042, 0);
    addRounded(this.body, 0.16, 0.085, 0.3, 0.03, m.yellow, 0, 0.105, 0);
    addBox(this.body, 0.22, 0.018, 0.06, m.carbon, 0, 0.05, 0.25);

    const nose = addMesh(
      this.body,
      new CylinderGeometry(0.058, 0.024, 0.24, 14),
      m.yellow,
      0,
      0.095,
      -0.26,
    );
    nose.rotation.x = Math.PI / 2;
    addMesh(
      this.body,
      new SphereGeometry(0.024, 12, 10),
      m.yellow,
      0,
      0.095,
      -0.38,
    );

    addRounded(this.body, 0.11, 0.022, 0.16, 0.01, m.carbon, 0, 0.154, 0.02);
    addRounded(this.body, 0.13, 0.045, 0.07, 0.02, m.navy, 0, 0.16, 0.105);
    addRounded(this.body, 0.11, 0.07, 0.17, 0.03, m.yellow, 0, 0.155, 0.18);
    addRounded(this.body, 0.06, 0.045, 0.08, 0.015, m.navy, 0, 0.205, 0.075);
    addBox(this.body, 0.012, 0.055, 0.13, m.navy, 0, 0.205, 0.185);

    for (const side of [-1, 1]) {
      addRounded(this.body, 0.06, 0.075, 0.22, 0.025, m.navy, side * 0.09, 0.105, 0.035);
      addBox(this.body, 0.05, 0.045, 0.018, m.carbon, side * 0.09, 0.1, -0.078);
      addBox(this.body, 0.045, 0.006, 0.16, m.yellow, side * 0.09, 0.145, 0.035);
    }

    // A tiny rear crash structure and diffuser finish the silhouette.
    addBox(this.body, 0.1, 0.05, 0.06, m.navy, 0, 0.11, 0.27);
    addBox(this.body, 0.22, 0.02, 0.06, m.carbon, 0, 0.05, 0.25);

    for (const side of [-1, 1]) {
      addBox(this.body, 0.075, 0.008, 0.012, m.carbon, side * 0.115, 0.07, -0.19);
      addBox(this.body, 0.075, 0.008, 0.012, m.carbon, side * 0.115, 0.1, -0.19);
      addBox(this.body, 0.075, 0.008, 0.012, m.carbon, side * 0.115, 0.07, 0.19);
      addBox(this.body, 0.075, 0.008, 0.012, m.carbon, side * 0.115, 0.1, 0.19);
    }

  }

  buildAero() {
    const m = this.materials;

    addBox(this.body, 0.34, 0.012, 0.09, m.navy, 0, 0.045, -0.34);
    addBox(this.body, 0.3, 0.009, 0.045, m.navy, 0, 0.058, -0.3);
    addBox(this.body, 0.32, 0.004, 0.012, m.yellow, 0, 0.052, -0.382);
    for (const side of [-1, 1]) {
      addBox(this.body, 0.012, 0.06, 0.1, m.navy, side * 0.17, 0.065, -0.34);
      addBox(this.body, 0.012, 0.035, 0.012, m.navy, side * 0.05, 0.07, -0.32);
    }

    addBox(this.body, 0.3, 0.012, 0.08, m.navy, 0, 0.245, 0.275);
    addBox(this.body, 0.28, 0.008, 0.045, m.navy, 0, 0.223, 0.29);
    addBox(this.body, 0.3, 0.004, 0.022, m.yellow, 0, 0.251, 0.275);
    for (const side of [-1, 1]) {
      addBox(this.body, 0.012, 0.1, 0.1, m.navy, side * 0.15, 0.25, 0.275);
    }
    addBox(this.body, 0.02, 0.08, 0.03, m.navy, 0, 0.19, 0.265);
  }

  buildWheels() {
    const { wheelRadius, wheelWidth, wheelX, frontAxleZ, rearAxleZ } =
      CAR.dimensions;
    const m = this.materials;

    const tireGeometry = new CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 20);
    const rimGeometry = new CylinderGeometry(
      wheelRadius * 0.58,
      wheelRadius * 0.58,
      wheelWidth + 0.004,
      12,
    );
    const hubGeometry = new CylinderGeometry(
      wheelRadius * 0.18,
      wheelRadius * 0.18,
      wheelWidth + 0.014,
      10,
    );
    tireGeometry.rotateZ(Math.PI / 2);
    rimGeometry.rotateZ(Math.PI / 2);
    hubGeometry.rotateZ(Math.PI / 2);

    for (const z of [frontAxleZ, rearAxleZ]) {
      for (const side of [-1, 1]) {
        const pivot = new Group();
        pivot.position.set(side * wheelX, wheelRadius, z);
        this.group.add(pivot);

        const wheel = new Group();
        pivot.add(wheel);
        addMesh(wheel, tireGeometry, m.tire);
        addMesh(wheel, rimGeometry, m.rim);
        addMesh(wheel, hubGeometry, m.yellow);

        this.wheels.push(wheel);
        if (z === frontAxleZ) this.frontPivots.push(pivot);
      }
    }
  }

  buildDriver() {
    const m = this.materials;

    this.helmet = addMesh(
      this.body,
      new SphereGeometry(0.05, 20, 16),
      m.helmet,
      0,
      0.18,
      0.045,
    );
    this.visor = addBox(
      this.body,
      0.06,
      0.022,
      0.018,
      m.visor,
      0,
      0.183,
      -0.006,
    );
    this.visor.rotation.x = -0.12;
    this.helmetStripe = addBox(
      this.body,
      0.018,
      0.008,
      0.09,
      m.yellow,
      0,
      0.228,
      0.045,
    );

    const halo = addMesh(
      this.body,
      new TorusGeometry(0.075, 0.007, 8, 24),
      m.navy,
      0,
      0.21,
      0.04,
    );
    halo.rotation.x = Math.PI / 2;
    // The central halo support sits very close to the driver's eye at toy
    // scale, so CockpitCamera hides it as a view obstruction.
    this.haloPillar = addBox(
      this.body,
      0.012,
      0.06,
      0.012,
      m.navy,
      0,
      0.18,
      -0.035,
    );

    this.steeringWheel = new Group();
    this.steeringWheel.position.set(0, 0.155, -0.03);
    this.body.add(this.steeringWheel);
    addMesh(
      this.steeringWheel,
      new TorusGeometry(0.03, 0.006, 6, 16),
      m.navy,
    );
    addBox(this.steeringWheel, 0.014, 0.014, 0.014, m.carbon, 0, 0, 0);

    // Tiny mirrors are a cheap, very readable toy-car detail from the chase.
    for (const side of [-1, 1]) {
      addBox(this.body, 0.035, 0.018, 0.018, m.navy, side * 0.085, 0.17, -0.03);
    }
  }

  buildSticker() {
    const geometry = new PlaneGeometry(0.075, 0.075);
    for (const side of [-1, 1]) {
      const sticker = addMesh(
        this.body,
        geometry,
        this.materials.sticker,
        side * 0.122,
        0.11,
        0.035,
      );
      sticker.rotation.y = (side * Math.PI) / 2;
    }
  }

  buildMounts() {
    this.mounts = {};
    for (const [name, position] of Object.entries(CAR.mounts)) {
      const mount = new Object3D();
      mount.name = `mount:${name}`;
      mount.position.fromArray(position);
      this.body.add(mount);
      this.mounts[name] = mount;
    }
  }

  buildLights() {
    const anchors = CAR.lightAnchors;
    const lensGeometry = new SphereGeometry(0.017, 10, 8);

    for (const [index, [x, y, z]] of anchors.headlights.entries()) {
      const light = new SpotLight(
        CAR.lights.color,
        0,
        CAR.lights.distance,
        CAR.lights.angle,
        CAR.lights.penumbra,
        CAR.lights.decay,
      );
      light.position.set(x, y, z);
      light.castShadow = false;
      // Mobile keeps one beam; both lens meshes stay emissive, so the front of
      // the car still reads as lit without paying for a second spot light.
      light.visible = index < this.headlightCount;
      light.target.position.set(
        x,
        anchors.headlightTarget[1],
        anchors.headlightTarget[2],
      );
      this.body.add(light, light.target);
      this.headlights.push(light);

      addMesh(this.body, lensGeometry, this.lensMaterial, x, y, z);
    }

    const [x, y, z] = anchors.tail;
    addBox(this.body, 0.15, 0.03, 0.02, this.materials.carbon, x, y, z - 0.008);
    addBox(this.body, 0.13, 0.018, 0.012, this.tailMaterial, x, y, z);
  }

  setSteering(angle) {
    for (const pivot of this.frontPivots) pivot.rotation.y = angle;
    this.steeringWheel.rotation.z = -angle * 2.8;
  }

  setWheelSpin(spin) {
    for (const wheel of this.wheels) wheel.rotation.x = spin;
  }

  /** Spring-damper body motion; wheels stay on the ground. */
  updateBody(dt, state) {
    const p = CAR.physics;
    const step = Math.min(Math.max(dt, 0), 0.05);
    if (step <= 0) return;

    const targetPitch = clamp(
      state.longitudinalAcceleration * p.pitchGain,
      -p.maxPitch,
      p.maxPitch,
    );
    const targetRoll = clamp(
      -state.lateralAcceleration * p.rollGain,
      -p.maxRoll,
      p.maxRoll,
    );

    this.pitchVelocity +=
      ((targetPitch - this.pitch) * p.pitchStiffness -
        this.pitchVelocity * p.pitchDamping) *
      step;
    this.pitch += this.pitchVelocity * step;
    this.rollVelocity +=
      ((targetRoll - this.roll) * p.rollStiffness -
        this.rollVelocity * p.rollDamping) *
      step;
    this.roll += this.rollVelocity * step;

    this.body.rotation.x = this.pitch;
    this.body.rotation.z = this.roll;
  }

  resetBody() {
    this.pitch = 0;
    this.pitchVelocity = 0;
    this.roll = 0;
    this.rollVelocity = 0;
    this.body.rotation.x = 0;
    this.body.rotation.z = 0;
  }

  setBraking(braking) {
    if (braking === this.braking) return;
    this.braking = braking;
    this.updateTailLight();
  }

  setNightFactor(mix) {
    this.nightFactor = clamp(mix, 0, 1);
    const headlightIntensity = lerp(
      DAY_PRESET.carHeadlights.intensity,
      NIGHT_PRESET.carHeadlights.intensity,
      this.nightFactor,
    );
    for (const light of this.headlights) {
      light.intensity = headlightIntensity;
    }
    this.lensMaterial.emissiveIntensity =
      this.nightFactor * CAR.lights.lensEmissive;
    this.updateTailLight();
  }

  updateTailLight() {
    const base = lerp(
      DAY_PRESET.carTailLights.intensity,
      NIGHT_PRESET.carTailLights.intensity,
      this.nightFactor,
    );
    this.tailMaterial.emissiveIntensity =
      base * (this.braking ? CAR.lights.brakeMultiplier : 1);
  }
}
