/**
 * F1-style steering wheel for the "wheel" controls scheme (V2).
 *
 * An inline-SVG wheel anchored to the bottom-left of the left-hand steering
 * zone. The player drags around the wheel centre; atan2 converts the touch
 * angle into a rotation clamped to +/- 135 degrees, giving an analog steer of
 * -1..1. The wheel owns a single pointer and ignores the rest, and returns to
 * centre on release with a damped spring of about 250 ms.
 *
 * Steering sensitivity is read from Settings (0.6..1.4). Smoothing stays in
 * InputManager. Shown only on touch devices when controlScheme is "wheel".
 * The pedals (right-hand cluster) are owned by TouchControls and are not
 * touched by this class.
 */
import { clamp } from '../utils/math.js';

/** Time constant for the damped spring return, in milliseconds. */
const SPRING_TIME_MS = 250;
/** Spring rate: 1 - exp(-k * dt). k = 1000 / SPRING_TIME_MS. */
const SPRING_K = 1000 / SPRING_TIME_MS;
/** Wheel rotation clamp in degrees. */
const MAX_ROTATION_DEG = 135;
/** SVG namespace. */
const SVG_NS = 'http://www.w3.org/2000/svg';

export class SteeringWheelControl {
  constructor({ bus, settings }) {
    if (!bus) throw new Error('SteeringWheelControl needs an EventBus.');
    if (!settings) throw new Error('SteeringWheelControl needs settings.');

    this.bus = bus;
    this.settings = settings;

    this.rotation = 0; // current rotation in degrees
    this.dragging = false;
    this.pointerId = null;
    this.padButtons = null;
    // Sensitivity is cached and refreshed on settings:changed.
    this.sensitivity = this.settings.get().steeringSensitivity ?? 1;

    this.unsubs = [
      bus.on('settings:changed', () => {
        this.sensitivity = settings.get().steeringSensitivity ?? 1;
      }),
    ];

    this.wheelEl = this.buildWheel();
    this.pointerDownHandler = this.onPointerDown.bind(this);
    this.pointerMoveHandler = this.onPointerMove.bind(this);
    this.pointerUpHandler = this.onPointerUp.bind(this);
  }

  /** Build the inline-SVG F1 wheel. */
  buildWheel() {
    const root = document.createElementNS(SVG_NS, 'svg');
    root.setAttribute('viewBox', '0 0 200 200');
    root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    root.setAttribute('aria-hidden', 'true');
    root.style.transformBox = 'fill-box';
    root.style.transformOrigin = 'center';
    root.style.transition = 'transform 0ms';
    root.style.width = 'clamp(140px, 30vmin, 200px)';
    root.style.height = 'clamp(140px, 30vmin, 200px)';
    root.style.position = 'absolute';
    root.style.bottom = '0';
    root.style.left = '0';
    root.style.pointerEvents = 'auto';

    // Side grips (the ribbon's two hand rests, palette yellow).
    root.appendChild(this.makeRect(16, 40, 28, 120, 7, 'var(--color-yellow)'));
    root.appendChild(this.makeRect(156, 40, 28, 120, 7, 'var(--color-yellow)'));

    // Wheel body: flat-bottomed rectangle, moulded-navy.
    const body = this.makeRect(40, 52, 120, 96, 8, 'var(--color-navy)');
    body.setAttribute('rx', '6');
    root.appendChild(body);

    // Decorative rim buttons (three small circles per side).
    [28, 60, 92].forEach((y) => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', '64');
      c.setAttribute('cy', y);
      c.setAttribute('r', '5');
      c.setAttribute('fill', 'var(--color-yellow)');
      root.appendChild(c);
    });
    [28, 60, 92].forEach((y) => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', '136');
      c.setAttribute('cy', y);
      c.setAttribute('r', '5');
      c.setAttribute('fill', 'var(--color-yellow)');
      root.appendChild(c);
    });

    // Centre display block.
    const display = document.createElementNS(SVG_NS, 'rect');
    display.setAttribute('x', '84');
    display.setAttribute('y', '72');
    display.setAttribute('width', '32');
    display.setAttribute('height', '56');
    display.setAttribute('rx', '4');
    display.setAttribute('fill', 'var(--color-paper)');
    display.setAttribute('stroke', 'var(--color-steel)');
    root.appendChild(display);

    // Neutral marker on the rim (top of the centre block).
    const marker = document.createElementNS(SVG_NS, 'circle');
    marker.setAttribute('cx', '100');
    marker.setAttribute('cy', '100');
    marker.setAttribute('r', '5');
    marker.setAttribute('fill', 'var(--color-livery-yellow)');
    root.appendChild(marker);

    // Rotary knobs (two small cylinders on the grips).
    root.appendChild(this.makeKnob(29, 44));
    root.appendChild(this.makeKnob(171, 44));

    return root;
  }

  /** Rounded-rect helper used for the grips and body. */
  makeRect(x, y, w, h, r, fill) {
    const el = document.createElementNS(SVG_NS, 'rect');
    el.setAttribute('x', String(x));
    el.setAttribute('y', String(y));
    el.setAttribute('width', String(w));
    el.setAttribute('height', String(h));
    el.setAttribute('rx', String(r));
    el.setAttribute('fill', fill);
    return el;
  }

  /** Small cylinder helper for the rotary knobs. */
  makeKnob(x, y) {
    const shaft = document.createElementNS(SVG_NS, 'rect');
    shaft.setAttribute('x', String(x - 3.5));
    shaft.setAttribute('y', String(y - 6));
    shaft.setAttribute('width', '7');
    shaft.setAttribute('height', '14');
    shaft.setAttribute('rx', '3');
    shaft.setAttribute('fill', 'var(--color-navy)');

    const cap = document.createElementNS(SVG_NS, 'rect');
    cap.setAttribute('x', String(x - 5));
    cap.setAttribute('y', String(y - 7.5));
    cap.setAttribute('width', '10');
    cap.setAttribute('height', '3');
    cap.setAttribute('rx', '1.5');
    cap.setAttribute('fill', 'var(--color-yellow)');
    return [shaft, cap];
  }

  /** Apply the current rotation to the wheel's CSS transform. */
  updateTransform() {
    this.wheelEl.style.transform = `rotate(${this.rotation}deg)`;
  }

  /** Read the touch angle from a pointer event and map it to rotation. */
  angleFromEvent(event) {
    const rect = this.wheelEl.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    // Screen Y grows downward; invert so "left" steering maps to a positive
    // rotation, matching the drive.steer-left convention.
    return Math.atan2(-dy, dx) * (180 / Math.PI);
  }

  /** Handle a pointer-down on the wheel. Owns the pointer. */
  onPointerDown(event) {
    if (this.dragging) return;
    this.dragging = true;
    this.pointerId = event.pointerId;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is an enhancement; the drag still works without it.
    }
    this.rotation = clamp(this.angleFromEvent(event), -MAX_ROTATION_DEG, MAX_ROTATION_DEG);
    this.updateTransform();
  }

  /** Handle pointermove while the wheel owns the pointer. */
  onPointerMove(event) {
    if (this.dragging && event.pointerId === this.pointerId) {
      this.rotation = clamp(this.angleFromEvent(event), -MAX_ROTATION_DEG, MAX_ROTATION_DEG);
      this.updateTransform();
    }
  }

  /** Handle pointer up / cancel / lost capture: release the pointer. */
  onPointerUp(event) {
    if (this.dragging && (this.pointerId === event.pointerId || this.pointerId === null)) {
      this.dragging = false;
      this.pointerId = null;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore a missing capture; it is not a gameplay error.
      }
    }
  }

  /** Fall through a blur or an orientation change without leaving the value. */
  onBlurOrOrientation() {
    if (!this.dragging) return;
    this.dragging = false;
    this.pointerId = null;
    // Rotation is retained; updateTransform picks it up next frame.
  }

  /** Input active: return the current analog steer. */

  update(dt) {
    if (dt <= 0 || !Number.isFinite(dt)) return;
    if (!this.dragging) {
      this.rotation += (0 - this.rotation) * (1 - Math.exp(-SPRING_K * dt));
      this.updateTransform();
    }
  }

  getSteer() {
    return clamp((this.rotation / MAX_ROTATION_DEG) * this.sensitivity, -1, 1);
  }

  /** Expose the sensitivity to the settings UI. */
  getSensitivity() {
    return this.sensitivity;
  }

  /**
   * Show the wheel in the left-hand steering zone, replacing the two steer
   * pads. The pad buttons are remembered so they can be restored on hide.
   */
  show() {
    const zone = document.querySelector('[data-layout-zone="leftZone"]');
    if (!zone || this.wheelEl.parentNode === zone) return;

    const pads = Array.from(zone.querySelectorAll('.touch-pad--steer'));
    this.padButtons = pads;
    pads.forEach((el) => el.remove());
    zone.appendChild(this.wheelEl);
    this.updateTransform();
  }

  /**
   * Hide the wheel and restore the two steer pads in the left zone.
   * The wheel stays in the DOM; it is re-shown by show() without recreation.
   */
  hide() {
    const zone = document.querySelector('[data-layout-zone="leftZone"]');
    if (!zone) return;

    if (this.wheelEl.parentNode === zone) {
      zone.removeChild(this.wheelEl);
    }
    if (this.padButtons) {
      this.padButtons.forEach((el) => zone.appendChild(el));
      this.padButtons = null;
    }
    this.updateTransform();
  }

  dispose() {
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs.length = 0;
    this.hide();
    window.removeEventListener('blur', this.onBlurOrOrientation);
    window.removeEventListener('orientationchange', this.onPointerUp);
    this.wheelEl.remove();
    this.wheelEl = null;
  }
}
