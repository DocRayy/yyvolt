/**
 * One-time device detection used before the renderer exists.
 *
 * The quality manager needs a starting tier before it can measure a single
 * frame, and the renderer needs to know whether to allocate an antialiased
 * default framebuffer. Both answers live here so the rest of the game never has
 * to guess from a CSS media query or a user-agent string.
 *
 * The classification is deliberately conservative: a touch-enabled laptop with
 * a mouse and a large viewport is still a desktop, while a tablet or phone uses
 * the mobile render budget. Orientation is read live because it changes while
 * the game is running.
 */
import { QUALITY } from '../config/quality.config.js';

export class DeviceProfile {
  constructor() {
    const media = window.matchMedia?.bind(window);

    this.coarsePointer = media?.('(pointer: coarse)').matches ?? false;
    this.noHover = media?.('(hover: none)').matches ?? false;
    this.touchPoints = navigator.maxTouchPoints ?? 0;
    this.isTouch =
      this.coarsePointer || this.noHover || this.touchPoints > 0;

    this.refresh();

    // A fine-pointer touch laptop is not a phone just because it has a touch
    // screen. Coarse pointer, a tablet-sized viewport, or both identify the
    // devices whose default framebuffer and light budget should be reduced.
    this.isMobile =
      this.isTouch && (this.coarsePointer || this.shortSide <= 1024);

    const cores = navigator.hardwareConcurrency ?? 8;
    const memory = navigator.deviceMemory ?? 4;
    this.lowEnd = this.isMobile && cores <= 4 && memory <= 4;

    if (!this.isMobile) this.startQuality = QUALITY.startLevel;
    else this.startQuality = this.lowEnd ? 'low' : QUALITY.mobileStartLevel;

    this.qualityOrder = this.isMobile ? QUALITY.mobileOrder : QUALITY.order;
    this.antialias = !this.isMobile;
    this.maxDynamicLights = this.isMobile
      ? QUALITY.mobileMaxDynamicLights
      : null;
  }

  /** Refresh viewport-dependent values after a resize or rotation. */
  refresh() {
    this.width = Math.max(window.innerWidth || 0, 1);
    this.height = Math.max(window.innerHeight || 0, 1);
    this.shortSide = Math.min(this.width, this.height);
  }

  /** True when the viewport, not the hardware, is taller than it is wide. */
  isPortrait() {
    return this.height > this.width;
  }
}
