/**
 * Flat circuit map in the bottom-left HUD corner.
 *
 * The track is projected once into an offscreen canvas and reused; each frame
 * only the car triangle is redrawn. World X maps to canvas X and world Z maps to
 * canvas Y, which keeps the bedroom's orientation readable without a compass or
 * grid. The map is deliberately a square with a 2px radius, not another
 * chamfered card.
 */
import { RACE } from '../config/race.config.js';

export class Minimap {
  constructor({ trackPath, car } = {}) {
    if (!trackPath || !car) {
      throw new Error('Minimap needs the track and the car.');
    }

    this.trackPath = trackPath;
    this.car = car;
    this.points = trackPath.curve.getSpacedPoints(RACE.hud.minimap.samples);
    this.elapsed = 0;
    this.config = RACE.hud.minimap;

    // Read the canvas-only colours once from the shared theme tokens. The
    // fallbacks keep the map readable if the stylesheet is still loading.
    const theme = getComputedStyle(document.documentElement);
    this.trackColor =
      theme.getPropertyValue('--color-orange').trim() || '#f4511e';
    this.carColor =
      theme.getPropertyValue('--color-yellow').trim() || '#ffc20e';

    this.bounds = this.measureTrack();
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'minimap';
    this.wrapper.dataset.layoutZone = 'bottomLeft';
    this.wrapper.setAttribute('role', 'img');
    this.wrapper.setAttribute(
      'aria-label',
      'Track map with the yellow car position.',
    );

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'minimap__canvas';
    this.wrapper.append(this.canvas);
    this.context = this.canvas.getContext('2d');
    this.trackLayer = document.createElement('canvas');
    this.layerContext = this.trackLayer.getContext('2d');

    this.width = 0;
    this.height = 0;
    this.pixelRatio = 1;
    this.mapScale = 1;
    this.mapOffsetX = 0;
    this.mapOffsetY = 0;
    this.carSize = 8;
  }

  measureTrack() {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;

    for (const point of this.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }

    return { minX, maxX, minZ, maxZ };
  }

  update(dt) {
    this.elapsed += dt;
    if (this.elapsed < 1 / RACE.hud.minimapUpdateHz) return;
    this.elapsed = 0;

    if (!this.resizeIfNeeded()) return;

    const context = this.context;
    context.clearRect(0, 0, this.width, this.height);
    context.drawImage(this.trackLayer, 0, 0);
    this.drawCar(context);
  }

  resizeIfNeeded() {
    // Measure the canvas, not the padded frame: the visual size is the drawing
    // size, which keeps the thin track line crisp on every pixel ratio.
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (
      width === this.width &&
      height === this.height &&
      ratio === this.pixelRatio
    ) {
      return true;
    }

    this.width = width;
    this.height = height;
    this.pixelRatio = ratio;
    this.canvas.width = width;
    this.canvas.height = height;
    this.trackLayer.width = width;
    this.trackLayer.height = height;
    this.buildTrackLayer();
    return true;
  }

  buildTrackLayer() {
    const context = this.layerContext;
    const width = this.width;
    const height = this.height;
    const minSize = Math.min(width, height);
    const config = this.config;
    const padding = Math.max(
      config.minPaddingPx * this.pixelRatio,
      minSize * config.paddingRatio,
    );
    const worldWidth = Math.max(this.bounds.maxX - this.bounds.minX, 0.001);
    const worldHeight = Math.max(this.bounds.maxZ - this.bounds.minZ, 0.001);
    const scale = Math.min(
      (width - padding * 2) / worldWidth,
      (height - padding * 2) / worldHeight,
    );

    this.mapScale = scale;
    this.mapOffsetX = (width - worldWidth * scale) / 2 - this.bounds.minX * scale;
    this.mapOffsetY = (height - worldHeight * scale) / 2 - this.bounds.minZ * scale;
    this.carSize = Math.max(
      config.minCarSizePx * this.pixelRatio,
      minSize * config.carSizeRatio,
    );

    context.clearRect(0, 0, width, height);
    context.lineWidth = Math.max(
      config.minLineWidthPx * this.pixelRatio,
      minSize * config.lineWidthRatio,
    );
    context.strokeStyle = this.trackColor;
    context.lineJoin = 'round';
    context.lineCap = 'round';

    context.beginPath();
    for (let index = 0; index < this.points.length; index += 1) {
      const point = this.points[index];
      const x = this.mapOffsetX + point.x * scale;
      const y = this.mapOffsetY + point.z * scale;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.stroke();
  }

  drawCar(context) {
    const position = this.car.group.position;
    const x = this.mapOffsetX + position.x * this.mapScale;
    const y = this.mapOffsetY + position.z * this.mapScale;
    const size = this.carSize;

    context.save();
    context.translate(x, y);
    // The map's Y axis points down. The car's forward direction is
    // (-sin heading, -cos heading) in world X/Z, so negating the yaw makes the
    // triangle point where the car is actually going.
    context.rotate(-this.car.group.rotation.y);
    context.beginPath();
    context.moveTo(0, -size);
    context.lineTo(size * 0.72, size * 0.82);
    context.lineTo(0, size * 0.46);
    context.lineTo(-size * 0.72, size * 0.82);
    context.closePath();
    context.fillStyle = this.carColor;
    context.fill();
    context.restore();
  }

  dispose() {
    this.wrapper.remove();
    this.context = null;
    this.layerContext = null;
    this.trackLayer = null;
    this.canvas = null;
  }
}
