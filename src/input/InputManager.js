/**
 * Keyboard and optional touch input foundation.
 *
 * KeyboardEvent.code is translated through controls.config.js and published as
 * input:action for one-shot commands and input:keystate for UI key highlights.
 * Continuous driving input is exposed as a small analog interface; the keyboard
 * contributes 0 or 1, while TouchControls can contribute a pad press or a tilt
 * value. CarPhysics sees only the merged values, never the device that made them.
 */
import { ACTION_BY_CODE } from '../config/controls.config.js';
import { clamp } from '../utils/math.js';

const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], [role="button"]';

export class InputManager {
  constructor({ bus, touch = null } = {}) {
    if (!bus) throw new Error('InputManager needs an EventBus.');

    this.bus = bus;
    this.touch = touch;
    this.pressed = new Set();
    // A count per action, not a boolean: W and ArrowUp can both be held, and
    // releasing one must not stop the car.
    this.actionCounts = new Map();
    this.connected = false;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
  }

  connect() {
    if (this.connected) return;
    this.connected = true;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  disconnect() {
    if (!this.connected) return;
    this.connected = false;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    this.handleBlur();
  }

  handleKeyDown(event) {
    const action = ACTION_BY_CODE.get(event.code);
    if (!action) return;

    // Suppress scrolling on held arrows and Space even on auto-repeat.
    if (!this.isInteractiveTarget(event.target)) event.preventDefault();
    if (event.repeat || this.pressed.has(event.code)) return;

    this.pressed.add(event.code);
    this.actionCounts.set(
      action,
      (this.actionCounts.get(action) ?? 0) + 1,
    );
    this.bus.emit('input:keystate', {
      code: event.code,
      action,
      pressed: true,
    });
    this.bus.emit('input:action', { action, code: event.code });
  }

  handleKeyUp(event) {
    const action = ACTION_BY_CODE.get(event.code);
    if (!action || !this.pressed.delete(event.code)) return;

    const count = this.actionCounts.get(action) ?? 0;
    if (count <= 1) this.actionCounts.delete(action);
    else this.actionCounts.set(action, count - 1);

    this.bus.emit('input:keystate', {
      code: event.code,
      action,
      pressed: false,
    });
  }

  /** Digital probe for one-shot and UI actions that do not need analog input. */
  isActionDown(action) {
    return (this.actionCounts.get(action) ?? 0) > 0;
  }

  /**
   * Merged steering target from -1 (right) to 1 (left).
   * A literal key or a touch pad wins over tilt so both remain usable.
   */
  getSteer() {
    const keyboard =
      (this.isActionDown('drive.steer-left') ? 1 : 0) -
      (this.isActionDown('drive.steer-right') ? 1 : 0);
    if (keyboard !== 0) return keyboard;
    return clamp(this.touch?.getSteer() ?? 0, -1, 1);
  }

  getThrottle() {
    return Math.max(
      this.isActionDown('drive.accelerate') ? 1 : 0,
      this.touch?.getThrottle() ?? 0,
    );
  }

  getBrake() {
    return Math.max(
      this.isActionDown('drive.brake') ? 1 : 0,
      this.touch?.getBrake() ?? 0,
    );
  }

  getHandbrake() {
    return Math.max(
      this.isActionDown('drive.handbrake') ? 1 : 0,
      this.touch?.getHandbrake() ?? 0,
    );
  }

  isBoostDown() {
    return (
      this.isActionDown('drive.boost') ||
      (this.touch?.getBoost() ?? 0) > 0.5
    );
  }

  /**
   * Drop every held key and touch. Used when focus, tab visibility, or
   * orientation interrupts the game so a release off-screen cannot stick.
   */
  reset() {
    this.handleBlur();
    this.touch?.reset();
  }

  handleBlur() {
    for (const code of this.pressed) {
      const action = ACTION_BY_CODE.get(code);
      if (action) {
        this.bus.emit('input:keystate', { code, action, pressed: false });
      }
    }
    this.pressed.clear();
    this.actionCounts.clear();
  }

  isInteractiveTarget(target) {
    return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
  }

  dispose() {
    this.disconnect();
    this.pressed.clear();
    this.actionCounts.clear();
  }
}
