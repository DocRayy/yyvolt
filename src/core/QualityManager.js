/**
 * Watches render cadence and steps one quality tier down when the frame rate
 * cannot hold 50 FPS for three seconds.
 *
 * The manager owns the renderer's pixel-ratio cap, the shadow map size, and the
 * bloom toggle. Applying a tier is cheap: no renderer or scene is rebuilt, so
 * the player sees a brief resolution/shadow change instead of a loading hitch.
 * Desktop starts high and earns its tier; mobile starts on its own limited tier
 * so the first frames after boot are already inside the device budget.
 */
import { QUALITY } from '../config/quality.config.js';

export class QualityManager {
  constructor({ bus, renderer, lighting, postProcessing, profile = null }) {
    if (!renderer) throw new Error('QualityManager needs a renderer.');

    this.bus = bus ?? null;
    this.renderer = renderer;
    this.lighting = lighting ?? null;
    this.postProcessing = postProcessing ?? null;
    this.mobile = profile?.isMobile ?? false;
    this.order = profile?.qualityOrder ?? QUALITY.order;

    const requestedLevel = profile?.startQuality ?? QUALITY.startLevel;
    this.level = QUALITY.presets[requestedLevel]
      ? requestedLevel
      : QUALITY.startLevel;
    this.preset = QUALITY.presets[this.level];
    this.sampleElapsed = 0;
    this.sampleFrames = 0;
    this.slowElapsed = 0;
    this.warmupElapsed = 0;
    this.settling = true;
    this.exhausted = false;

    this.applyPreset();
  }

  /**
   * Resolve the device pixel ratio against the current tier. Called for every
   * viewport resize as well as when a tier changes.
   */
  resolvePixelRatio() {
    return Math.min(
      window.devicePixelRatio || 1,
      this.preset.maxPixelRatio,
    );
  }

  setSize(width, height) {
    const safeWidth = Math.max(width, 1);
    const safeHeight = Math.max(height, 1);
    const pixelRatio = this.resolvePixelRatio();

    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(safeWidth, safeHeight);
    this.postProcessing?.setSize(safeWidth, safeHeight);

    return pixelRatio;
  }

  applyPreset({ announce = false } = {}) {
    const width = Math.max(window.innerWidth, 1);
    const height = Math.max(window.innerHeight, 1);

    this.renderer.setPixelRatio(this.resolvePixelRatio());
    this.renderer.setSize(width, height);
    this.postProcessing?.setSize(width, height);

    this.lighting?.setShadowMapSize(this.preset.shadowMapSize);
    this.postProcessing?.setBloomEnabled(this.preset.bloom);
    this.postProcessing?.setBloomScale(this.preset.bloomScale);

    // The shadow map is cached to avoid rebuilding it every frame, so a size
    // change must explicitly invalidate it.
    this.renderer.shadowMap.needsUpdate = true;

    this.bus?.emit('quality:changed', {
      level: this.level,
      label: this.preset.label,
      mobile: this.mobile,
    });

    if (announce) {
      this.bus?.emit('ui:toast', {
        message: `Graphics set to ${this.preset.label.toLowerCase()}`,
      });
    }
  }

  /** Keep monitoring honest after a tab return or a long loading stall. */
  resetMonitor() {
    this.sampleElapsed = 0;
    this.sampleFrames = 0;
    this.slowElapsed = 0;
    this.warmupElapsed = 0;
    this.settling = true;
  }

  update(delta) {
    if (this.exhausted || !Number.isFinite(delta) || delta <= 0) return;

    const monitor = QUALITY.monitor;
    const step = Math.min(delta, monitor.maxFrameDelta);

    if (this.settling) {
      this.warmupElapsed += step;
      if (this.warmupElapsed >= monitor.warmupSeconds) {
        this.settling = false;
        this.warmupElapsed = 0;
        this.sampleElapsed = 0;
        this.sampleFrames = 0;
      }
      return;
    }

    this.sampleElapsed += step;
    this.sampleFrames += 1;

    if (this.sampleElapsed < monitor.sampleSeconds) return;

    const fps = this.sampleFrames / this.sampleElapsed;
    this.sampleElapsed = 0;
    this.sampleFrames = 0;

    if (fps >= monitor.downgradeBelowFps) {
      this.slowElapsed = 0;
      return;
    }

    this.slowElapsed += monitor.sampleSeconds;
    if (this.slowElapsed < monitor.downgradeWindowSeconds) return;

    this.stepDown();
  }

  stepDown() {
    const index = this.order.indexOf(this.level);
    const nextLevel = this.order[index + 1];

    this.slowElapsed = 0;

    if (!nextLevel) {
      this.exhausted = true;
      return;
    }

    this.level = nextLevel;
    this.preset = QUALITY.presets[nextLevel];
    this.warmupElapsed = 0;
    this.settling = true;
    this.sampleElapsed = 0;
    this.sampleFrames = 0;
    this.applyPreset({ announce: true });
  }

  dispose() {
    this.bus = null;
    this.renderer = null;
    this.lighting = null;
    this.postProcessing = null;
    this.order = null;
  }
}
