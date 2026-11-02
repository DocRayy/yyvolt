/**
 * On-screen steering and pedals for coarse-pointer devices.
 *
 * The controller owns no car state. It turns multi-touch pointer presses into
 * one small input snapshot that InputManager can merge with the keyboard,
 * optionally adds analog tilt steering, and routes short haptic pulses back to
 * the player. Each pedal is a real button with its own pointer capture, so a
 * gas thumb and a steering thumb never interfere.
 */
import { TOUCH } from '../config/touch.config.js';
import { GAME_STATES } from '../core/GameState.js';
import { clamp } from '../utils/math.js';
import { TouchActionButton } from './TouchActionButton.js';
import { TOUCH_MARKUP } from './touchMarkup.js';

export class TouchControls {
  constructor({ bus } = {}) {
    if (!bus) throw new Error('TouchControls needs an EventBus.');

    this.bus = bus;
    this.visible = false;
    this.pressed = new Set();
    this.controls = [];

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

    this.handleActionChange = this.handleActionChange.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
    this.handleOrientation = this.handleOrientation.bind(this);
    this.handleCollision = this.handleCollision.bind(this);
    this.handleBoost = this.handleBoost.bind(this);

    this.controls = this.buttons.map(
      (element) =>
        new TouchActionButton({
          element,
          action: element.dataset.touchAction,
          onChange: this.handleActionChange,
        }),
    );

    this.root.addEventListener('contextmenu', this.handleContextMenu);
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

  handleActionChange(action, active) {
    if (active) this.pressed.add(action);
    else this.pressed.delete(action);
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
    for (const control of this.controls) control.release();
    this.pressed.clear();
    this.tiltCenter = null;
    this.tiltSteer = 0;
    this.tiltTarget = 0;
  }

  handleContextMenu(event) {
    event.preventDefault();
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

    for (const control of this.controls) control.dispose();
    this.controls.length = 0;
    this.root.removeEventListener('contextmenu', this.handleContextMenu);

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
