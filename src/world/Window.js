/**
 * Bedroom window with a fully procedural sky.
 *
 * The wall behind the window is solid; the bright sky plane and frame are
 * enough to sell the opening from inside the room. Day and night skies are two
 * textures on two planes and cross-fade with setNightFactor(), which Phase 3's
 * DayNightController drives over 1.5 seconds.
 */
import {
  BoxGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { MATERIALS, ROOM } from '../config/constants.js';

function createSkyCanvas(night) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  if (!night) {
    const sky = ctx.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#6fa9dc');
    sky.addColorStop(0.55, '#a9d2ee');
    sky.addColorStop(1, '#e6f2f8');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 640);

    const sun = ctx.createRadialGradient(770, 140, 8, 770, 140, 150);
    sun.addColorStop(0, 'rgba(255, 246, 205, 0.95)');
    sun.addColorStop(0.35, 'rgba(255, 236, 180, 0.45)');
    sun.addColorStop(1, 'rgba(255, 236, 180, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(600, 0, 340, 320);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
    for (let i = 0; i < 14; i += 1) {
      const x = 80 + i * 74;
      const y = 120 + (i % 4) * 46;
      ctx.beginPath();
      ctx.ellipse(x, y, 62 + (i % 3) * 18, 22 + (i % 2) * 10, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 44, y - 14, 38, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(320, 300, 120, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#050b18');
    sky.addColorStop(0.65, '#0e1c35');
    sky.addColorStop(1, '#1a2c4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 640);

    let seed = 91;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 220; i += 1) {
      ctx.fillStyle = `rgba(244, 246, 248, ${0.3 + random() * 0.7})`;
      ctx.beginPath();
      ctx.arc(random() * 1024, random() * 640, random() > 0.9 ? 2.6 : 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    const moonGlow = ctx.createRadialGradient(760, 150, 20, 760, 150, 160);
    moonGlow.addColorStop(0, 'rgba(214, 229, 255, 0.32)');
    moonGlow.addColorStop(1, 'rgba(214, 229, 255, 0)');
    ctx.fillStyle = moonGlow;
    ctx.fillRect(600, 0, 340, 330);
    ctx.fillStyle = '#e8eef8';
    ctx.beginPath();
    ctx.arc(760, 150, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(140, 158, 184, 0.55)';
    ctx.beginPath();
    ctx.arc(738, 130, 12, 0, Math.PI * 2);
    ctx.arc(784, 170, 8, 0, Math.PI * 2);
    ctx.arc(744, 180, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

export class Window {
  constructor(textures) {
    this.group = new Group();
    this.group.name = 'Window';
    this.group.position.fromArray(ROOM.window.position);
    this.nightFactor = 0;

    const [width, height] = ROOM.window.size;
    const frame = 0.1;
    const skyGeometry = new PlaneGeometry(width, height);
    const dayTexture = textures.fromCanvas(createSkyCanvas(false), { clamp: true });
    const nightTexture = textures.fromCanvas(createSkyCanvas(true), { clamp: true });

    this.dayMaterial = new MeshBasicMaterial({
      map: dayTexture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.nightMaterial = new MeshBasicMaterial({
      map: nightTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });

    const daySky = new Mesh(skyGeometry, this.dayMaterial);
    daySky.position.z = 0.012;
    daySky.renderOrder = 1;
    this.group.add(daySky);

    const nightSky = new Mesh(skyGeometry, this.nightMaterial);
    nightSky.position.z = 0.013;
    nightSky.renderOrder = 2;
    this.group.add(nightSky);

    const frameMaterial = new MeshStandardMaterial({
      color: MATERIALS.paper,
      roughness: 0.58,
    });
    const addFrame = (w, h, d, x, y, z) => {
      const bar = new Mesh(new BoxGeometry(w, h, d), frameMaterial);
      bar.position.set(x, y, z);
      bar.receiveShadow = true;
      this.group.add(bar);
    };

    addFrame(frame, height + frame * 2, 0.09, -width / 2 - frame / 2, 0, 0.06);
    addFrame(frame, height + frame * 2, 0.09, width / 2 + frame / 2, 0, 0.06);
    addFrame(width + frame * 2, frame, 0.09, 0, height / 2 + frame / 2, 0.06);
    addFrame(width + frame * 2, frame, 0.09, 0, -height / 2 - frame / 2, 0.06);
    addFrame(0.045, height, 0.035, 0, 0, 0.075);
    addFrame(width, 0.045, 0.035, 0, 0.06, 0.075);

    const sill = new Mesh(
      new BoxGeometry(width + 0.36, 0.08, 0.22),
      frameMaterial,
    );
    sill.position.set(0, -height / 2 - frame - 0.02, 0.08);
    sill.receiveShadow = true;
    this.group.add(sill);

    const curtainMaterial = new MeshStandardMaterial({
      map: textures.createCurtain(),
      roughness: 0.92,
      side: DoubleSide,
    });
    const curtainGeometry = new PlaneGeometry(0.44, 1.95, 1, 1);
    for (const side of [-1, 1]) {
      const curtain = new Mesh(curtainGeometry, curtainMaterial);
      curtain.position.set(side * (width / 2 + 0.22), 0.02, 0.16);
      curtain.rotation.y = side * 0.06;
      this.group.add(curtain);
    }

    const rodMaterial = new MeshStandardMaterial({
      color: MATERIALS.woodDark,
      roughness: 0.5,
    });
    const rod = new Mesh(
      new CylinderGeometry(0.025, 0.025, width + 0.95, 12),
      rodMaterial,
    );
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, height / 2 + 0.2, 0.18);
    this.group.add(rod);
    for (const side of [-1, 1]) {
      const finial = new Mesh(new SphereGeometry(0.055, 12, 10), rodMaterial);
      finial.position.set(side * (width / 2 + 0.48), height / 2 + 0.2, 0.18);
      this.group.add(finial);
    }

    this.setNightFactor(0);
  }

  /** 0 = daylight, 1 = night. Phase 3 blends this during the room transition. */
  setNightFactor(value) {
    this.nightFactor = Math.min(Math.max(value, 0), 1);
    this.dayMaterial.opacity = 1 - this.nightFactor;
    this.nightMaterial.opacity = this.nightFactor;
  }
}
