/**
 * Sky dome for the Monaco environment.
 *
 * A large inverted sphere plus a subtle upper haze layer reads as a twilight
 * harbour. Three canvas textures (sky gradient, starfield, cloud layer) and
 * simple geometry keep the draw call count low: one sphere draw, one haze
 * draw, plus a sun disc and a moon disc.
 */

import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  Texture,
  Vector3,
} from 'three';

/** Generate a sky gradient gradient texture. */
function makeSkyCanvas(day) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  let top, mid, bottom;
  if (day) {
    top = '#2a4a6a';
    mid = '#6b9bc0';
    bottom = '#d8e8f0';
  } else {
    top = '#0a0e1a';
    mid = '#0e1a30';
    bottom = '#1a2a44';
  }
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, top);
  grad.addColorStop(0.4, mid);
  grad.addColorStop(1, bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

/** Generate a soft sun disc and glow with canvas. */
function makeSunCanvas(day) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  if (day) {
    const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 220);
    glow.addColorStop(0, 'rgba(255,236,180,0.9)');
    glow.addColorStop(0.4, 'rgba(255,220,150,0.35)');
    glow.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(255,244,210,0.95)';
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(cx - 8, cy - 10, 18, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 180);
    glow.addColorStop(0, 'rgba(214,229,255,0.6)');
    glow.addColorStop(1, 'rgba(214,229,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(214,229,255,0.85)';
    ctx.beginPath();
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,215,240,0.6)';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 8, cy + 6, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/** Generate a starfield texture. */
function makeStarCanvas(night) {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!night) {
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 40; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.6 + Math.random() * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas;
  }
  const seed = 113;
  let s = seed;
  const random = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  for (let i = 0; i < 320; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const r = random() > 0.85 ? 1.6 : random() > 0.6 ? 1.0 : 0.4;
    const alpha = random() > 0.95 ? 0.85 : random() > 0.7 ? 0.45 : 0.2;
    ctx.fillStyle = `rgba(248, 248, 250, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/** Generate a soft cloud layer texture. */
function makeCloudCanvas() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(244, 246, 248, 0.0)';
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#e8edf4';
  for (let i = 0; i < 8; i += 1) {
    const cx = 60 + i * 62;
    const cy = 40 + (i % 2) * 120;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 80, 32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 42, cy - 16, 56, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 34, cy + 12, 42, 22, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#d0d8e4';
  for (let i = 0; i < 5; i += 1) {
    const cx = 30 + i * 110;
    const cy = 300 + i * 60;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 72, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  return canvas;
}

const skyCanvas = makeSkyCanvas(true);
const daySkyCanvas = makeSkyCanvas(true);
const nightSkyCanvas = makeSkyCanvas(false);
const starCanvas = makeStarCanvas(true);
const cloudCanvas = makeCloudCanvas();

export class SkyDome {
  constructor(hasCeiling) {
    this.group = new Group();
    this.group.name = 'SkyDome';
    this.hasCeiling = hasCeiling;

    // Main sky dome (inverted sphere).
    const skyGeo = new SphereGeometry(30, 24, 16);
    this.skyMat = new MeshBasicMaterial({
      map: skyCanvas,
      side: DoubleSide,
      depthWrite: false,
      transparent: true,
    });
    this.sky = new Mesh(skyGeo, this.skyMat);
    this.sky.scale.y = 1.02;
    this.group.add(this.sky);

    // Starfield layer.
    this.starsMat = new MeshBasicMaterial({
      map: starCanvas,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });
    this.stars = new Mesh(new SphereGeometry(30, 16, 12), this.starsMat);
    this.stars.scale.y = 1.02;
    this.group.add(this.stars);

    // Cloud layer.
    this.cloudMat = new MeshBasicMaterial({
      map: cloudCanvas,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });
    this.clouds = new Mesh(new SphereGeometry(30, 12, 10), this.cloudMat);
    this.clouds.scale.y = 1.04;
    this.group.add(this.clouds);

    // Sun and moon discs.
    const sunCanvas = makeSunCanvas(true);
    this.sunMat = new MeshBasicMaterial({
      map: sunCanvas,
      transparent: true,
      depthWrite: false,
    });
    this.sun = new Mesh(
      new RingGeometry(1.2, 2.2, 20, 1),
      this.sunMat,
    );
    this.sun.position.set(0, 0, -26);
    this.sun.scale.y = 0.1;
    this.group.add(this.sun);

    // The moon (a soft disc with a subtle glow behind it).
    const moonCanvas = makeSunCanvas(false);
    this.moonMat = new MeshBasicMaterial({
      map: moonCanvas,
      transparent: true,
      depthWrite: false,
    });
    this.moon = new Mesh(
      new RingGeometry(1.3, 2.3, 20, 1),
      this.moonMat,
    );
    this.moon.position.set(0, 0, 26);
    this.moon.scale.y = 0.1;
    this.group.add(this.moon);

    // Halo ring around the sun/moon for a soft broadcast look.
    this.ringMat = new MeshBasicMaterial({
      color: 0xffc20e,
      transparent: true,
      opacity: 0.06,
      depthWrite: false,
    });
    this.ring = new Mesh(new RingGeometry(4, 12, 24, 1), this.ringMat);
    this.ring.position.set(0, 0, -26);
    this.ring.scale.y = 0.1;
    this.group.add(this.ring);

    // Upper haze (a large soft sphere tinted by the sky).
    const hazeGeo = new SphereGeometry(32, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    const hazeMat = new MeshStandardMaterial({
      color: new Color(0x8b9bc0),
      transparent: true,
      opacity: 0.12,
      roughness: 0.9,
      side: DoubleSide,
    });
    this.haze = new Mesh(hazeGeo, hazeMat);
    this.haze.position.y = 22;
    this.group.add(this.haze);
  }

  setNightFactor(t) {
    t = Math.min(Math.max(t, 0), 1);
    const dayCol = new Color(0x8b9bc0);
    const nightCol = new Color(0x1a2a44);
    // Blend the sky texture between the day and night canvases by
    // re-assigning the map. In a real engine this would use a single dual-map
    // approach; here the canvas swap is cheap enough.
    const maps = [daySkyCanvas, nightSkyCanvas];
    this.skyMat.map = maps[Math.round(t)];
    this.skyMat.needsUpdate = true;
    this.starsMat.map = stars[(t > 0.5) ? 1 : 0];
    this.starsMat.needsUpdate = true;
    this.cloudMat.opacity = 0.2 + 0.45 * (1 - t);
    this.cloudMat.needsUpdate = true;
    this.sunMat.map = makeSunCanvas(false);
    this.sunMat.needsUpdate = true;
    this.moonMat.map = moonCanvas;
    this.moonMat.needsUpdate = true;
  }

  dispose() {
    this.skyMat.dispose();
    this.starsMat.dispose();
    this.cloudMat.dispose();
    this.sunMat.dispose();
    this.moonMat.dispose();
    this.ringMat.dispose();
    this.haze.material.dispose();
  }
}
