/**
 * On-screen steering and pedals for coarse-pointer devices.
 *
 * The controller owns no car state. It turns multi-touch pointer presses into
 * one small input snapshot that InputManager can merge with the keyboard,
 * optionally adds analog tilt steering, and routes short haptic pulses back to
 * the player. Buttons are ordinary DOM elements, so the browser handles focus,
 * safe areas, and pointer capture; the canvas never sees these gestures.
 */
import { TOUCH } from '../config/touch.config.js';
import { GAME_STATES } from '../core/GameState.js';
import { clamp } from '../utils/math.js';

const TOUCH_MARKUP = `
  <div class="touch-controls__steer" role="group" aria-label="Steering">
    <button
      class="touch-pad touch-pad--steer"
      type="button"
      data-touch-action="drive.steer-left"
      aria-label="Steer left"
      aria-pressed="false"
    >
      Left
    </button>
    <button
      class="touch-pad touch-pad--steer"
      type="button"
      data-touch-action="drive.steer-right"
      aria-label="Steer right"
      aria-pressed="false"
    >
      Right
    </button>
  </div>

  <div class="touch-controls__drive" role="group" aria-label="Pedals and boost">
    <button
      class="touch-pad touch-pad--brake"
      type="button"
      data-touch-action="drive.brake"
      aria-pressed="false"
    >
      Brake
    </button>
    <button
      class="touch-pad touch-pad--drift"
      type="button"
      data-touch-action="drive.handbrake"
      aria-pressed="false"
    >
      Drift
    </button>
    <button
      class="touch-pad touch-pad--boost"
      type="button"
      data-touch-action="drive.boost"
      aria-pressed="false"
    >
      Boost
    </button>
    <button
      class="touch-pad touch-pad--gas"
      type="button"
      data-touch-action="drive.accelerate"
      aria-pressed="false"
    >
      Gas
    </button>
  </div>
`;

export class TouchControls {
  constructor({ bus } = {}) {
    if (!bus) throw new Error('TouchControls needs an EventBus.');

    this.bus = bus;
    this.visible = false;
    this.pointers = new Map();
    this.pressed = new Set();

    this.tiltEnabled = false;
    this.tiltPending = false;
    this.tiltSupported =
      typeof window.DeviceOrientationEvent !== 'undefined';
    this.tiltReceived = false;
    this.tiltCenter = null;
    this.tiltSteer = 0;
    this.tiltTarget = 0;
    this.tiltScreenAngle = this.readScreenAngle();
    this.tiltTimer = 0;
    this.tiltError = '';

    this.vibrationSupported = typeof navigator.vibrate === 'function';
    this.vibrationEnabled = this.vibrationSupported;
    this.lastPulseAt = 0;

    this.root = document.createElement('div');
    this.root.className = 'touch-controls';
    this.root.setAttribute('aria-label', 'Touch controls');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.inert = true;
    this.root.innerHTML = TOUCH_MARKUP;
    this.buttons = [...this.root.querySelectorAll('[data-touch-action]')];

    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerEnd = this.handlePointerEnd.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleOrientation = this.handleOrientation.bind(this);
    this.handleCollision = this.handleCollision.bind(this);
    this.handleBoost = this.handleBoost.bind(this);

    this.root.addEventListener('pointerdown', this.handlePointerDown);
    this.root.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('pointerup', this.handlePointerEnd);
    window.addEventListener('pointercancel', this.handlePointerEnd);
    document.body.append(this.root);

    this.unsubscribers = [
      bus.on('state:changed', ({ current }) => {
        this.setVisible(
          current === GAME_STATES.COUNTDOWN ||
            current === GAME_STATES.RACING,
        );
      }),
      bus.on('touch:settings-request', () => this.emitSettings()),
      bus.on('touch:tilt-toggle', () => {
        void this.toggleTilt();
      }),
      bus.on('touch:vibration-toggle', () => this.toggleVibration()),
      bus.on('car:collide', this.handleCollision),
      bus.on('boost:start', this.handleBoost),
    ];

    this.setVisible(false);
  }

  /** Analog steering target for InputManager. Pads win over tilt. */
  getSteer() {
    const pads =
      (this.pressed.has('drive.steer-left') ? 1 : 0) -
      (this.pressed.has('drive.steer-right') ? 1 : 0);
    if (pads !== 0) return pads;
    return this.tiltEnabled ? clamp(this.tiltSteer, -1, 1) : 0;
  }

  getThrottle() {
    return this.pressed.has('drive.accelerate') ? 1 : 0;
  }

  getBrake() {
    return this.pressed.has('drive.brake') ? 1 : 0;
  }

  getHandbrake() {
    return this.pressed.has('drive.handbrake') ? 1 : 0;
  }

  getBoost() {
    return this.pressed.has('drive.boost') ? 1 : 0;
  }

  setVisible(visible) {
    if (visible === this.visible) return;

    this.visible = visible;
    this.root.classList.toggle('is-visible', visible);
    this.root.setAttribute('aria-hidden', String(!visible));
    this.root.inert = !visible;

    if (visible) {
      // Recalibrate tilt on resume so a phone held in a new position starts
      // from neutral instead of inheriting the old offset.
      this.tiltCenter = null;
      this.tiltSteer = 0;
      this.tiltTarget = 0;
    } else {
      this.reset();
    }
  }

  reset() {
    this.pointers.clear();
    this.pressed.clear();
    this.syncButtons();
    this.tiltCenter = null;
    this.tiltSteer = 0;
    this.tiltTarget = 0;
  }

  handlePointerDown(event) {
    if (!this.visible || !(event.target instanceof Element)) return;

    const button = event.target.closest('[data-touch-action]');
    if (!button || !this.root.contains(button)) return;

    event.preventDefault();
    this.pointers.set(event.pointerId, button.dataset.touchAction);
    this.syncButtons();
    try {
      button.setPointerCapture(event.pointerId);
    } catch {
      // Older browsers can refuse capture after a simultaneous gesture. The
      // window-level pointerup listener still clears the held action.
    }
  }

  handlePointerEnd(event) {
    if (!this.pointers.delete(event.pointerId)) return;
    event.preventDefault();
    this.syncButtons();
  }

  handleContextMenu(event) {
    event.preventDefault();
  }

  syncButtons() {
    this.pressed.clear();
    for (const action of this.pointers.values()) this.pressed.add(action);

    for (const button of this.buttons) {
      const active = this.pressed.has(button.dataset.touchAction);
      button.classList.toggle('is-pressed', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  async toggleTilt() {
    if (!this.tiltSupported || this.tiltPending) {
      this.emitSettings();
      return;
    }

    if (this.tiltEnabled) {
      this.disableTilt();
      this.emitSettings();
      return;
    }

    this.tiltPending = true;
    this.tiltError = '';
    this.emitSettings();

    try {
      const Orientation = window.DeviceOrientationEvent;
      if (typeof Orientation?.requestPermission === 'function') {
        const permission = await Orientation.requestPermission();
        if (permission !== 'granted') {
          this.tiltPending = false;
          this.tiltError = 'Tilt permission was denied. Use the steering pads.';
          this.emitSettings();
          return;
        }
      }

      this.enableTilt();
    } catch {
      this.tiltPending = false;
      this.tiltError = 'Tilt permission was denied. Use the steering pads.';
      this.emitSettings();
    }
  }

  enableTilt() {
    this.tiltEnabled = true;
    this.tiltPending = false;
    this.tiltReceived = false;
    this.tiltCenter = null;
    this.tiltSteer = 0;
    this.tiltTarget = 0;
    this.tiltError = '';
    window.addEventListener('deviceorientation', this.handleOrientation);

    // Some browsers expose the API but have no usable sensor. Do not leave the
    // setting showing "On" when nothing will ever drive the car.
    window.clearTimeout(this.tiltTimer);
    this.tiltTimer = window.setTimeout(() => {
      this.tiltTimer = 0;
      if (!this.tiltEnabled || this.tiltReceived) return;
      this.disableTilt();
      this.tiltSupported = false;
      this.tiltError = 'Tilt steering did not start. Use the steering pads.';
      this.emitSettings();
    }, TOUCH.tilt.startTimeoutMs);

    this.emitSettings();
  }

  disableTilt() {
    window.removeEventListener('deviceorientation', this.handleOrientation);
    window.clearTimeout(this.tiltTimer);
    this.tiltTimer = 0;
    this.tiltEnabled = false;
    this.tiltPending = false;
    this.tiltReceived = false;
    this.tiltCenter = null;
    this.tiltSteer = 0;
    this.tiltTarget = 0;
  }

  handleOrientation(event) {
    const angle = this.readScreenAngle();
    if (angle !== this.tiltScreenAngle) {
      this.tiltScreenAngle = angle;
      this.tiltCenter = null;
      this.tiltSteer = 0;
      this.tiltTarget = 0;
    }

    // In landscape the device pitch (beta) becomes the screen-horizontal axis;
    // in portrait the roll (gamma) does. Normalize the two landscape directions
    // before applying the deadzone.
    const raw =
      angle === 90
        ? event.beta
        : angle === 270
          ? -event.beta
          : event.gamma;
    if (!Number.isFinite(raw)) return;

    window.clearTimeout(this.tiltTimer);
    this.tiltTimer = 0;
    this.tiltReceived = true;

    if (this.tiltCenter === null) {
      this.tiltCenter = raw;
      this.tiltSteer = 0;
      this.tiltTarget = 0;
      return;
    }

    let delta = raw - this.tiltCenter;
    if (Math.abs(delta) <= TOUCH.tilt.deadzoneDegrees) delta = 0;

    const range = Math.max(
      TOUCH.tilt.rangeDegrees - TOUCH.tilt.deadzoneDegrees,
      1,
    );
    const axis = clamp(delta / range, -1, 1);
    // Positive steering is left throughout the car code; the screen axis grows
    // to the right, so the final value is inverted.
    this.tiltTarget = TOUCH.tilt.invert ? axis : -axis;
    this.tiltSteer +=
      (this.tiltTarget - this.tiltSteer) * TOUCH.tilt.smoothing;
  }

  toggleVibration() {
    if (!this.vibrationSupported) return;

    this.vibrationEnabled = !this.vibrationEnabled;
    if (this.vibrationEnabled) {
      this.pulse(TOUCH.vibration.toggleMs);
    } else {
      try {
        navigator.vibrate(0);
      } catch {
        // Vibration is an enhancement; losing it must never affect the race.
      }
    }
    this.emitSettings();
  }

  handleCollision({ strength = 0 } = {}) {
    if (!this.visible || !this.vibrationEnabled) return;

    const normalized = clamp(
      strength / TOUCH.vibration.collisionStrengthMax,
      0,
      1,
    );
    const duration =
      TOUCH.vibration.collisionMinMs +
      normalized *
        (TOUCH.vibration.collisionMaxMs - TOUCH.vibration.collisionMinMs);
    this.pulse(duration);
  }

  handleBoost() {
    if (this.visible && this.vibrationEnabled) {
      this.pulse(TOUCH.vibration.boostMs);
    }
  }

  pulse(durationMs) {
    if (!this.vibrationEnabled) return;

    const now = performance.now();
    if (now - this.lastPulseAt < TOUCH.vibration.cooldownMs) return;
    this.lastPulseAt = now;

    try {
      navigator.vibrate(Math.round(durationMs));
    } catch {
      // Ignore a rejected vibration request; it is not a gameplay error.
    }
  }

  readScreenAngle() {
    const raw =
      window.screen?.orientation?.angle ?? window.orientation ?? 0;
    return ((Number(raw) % 360) + 360) % 360;
  }

  emitSettings() {
    this.bus.emit('touch:settings', {
      tiltEnabled: this.tiltEnabled,
      tiltPending: this.tiltPending,
      tiltSupported: this.tiltSupported,
      tiltError: this.tiltError,
      vibrationEnabled: this.vibrationEnabled,
      vibrationSupported: this.vibrationSupported,
    });
  }

  dispose() {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers.length = 0;
    this.disableTilt();
    window.clearTimeout(this.tiltTimer);
    this.tiltTimer = 0;

    this.root.removeEventListener('pointerdown', this.handlePointerDown);
    this.root.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('pointerup', this.handlePointerEnd);
    window.removeEventListener('pointercancel', this.handlePointerEnd);

    if (this.vibrationSupported) {
      try {
        navigator.vibrate(0);
      } catch {
        // Nothing to do.
      }
    }
    this.root.remove();
  }
}
