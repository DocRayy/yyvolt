/**
 * Route touch steering through the scheme-active control while pedals always
 * come from the touch button cluster.
 *
 * InputManager reads a single touch object (getSteer, getThrottle, getBrake,
 * getHandbrake, getBoost, reset, dispose). Under the "wheel" scheme the
 * steering half is the F1 steering wheel; under every other scheme the
 * steering half is the touch-pad set. The pedal cluster is always provided by
 * TouchControls and is never rewritten. Switches between the two by swapping
 * the left-hand steering zone: the wheel replaces the two steer pads, and the
 * pads return when the wheel is hidden.
 */
import { SteeringWheelControl } from './SteeringWheelControl.js';
import { TouchControls } from './TouchControls.js';

export class TouchScheme {
  constructor({ bus, coarse, settings }) {
    if (!bus) throw new Error('TouchScheme needs an EventBus.');
    if (!settings) throw new Error('TouchScheme needs settings.');

    this.bus = bus;
    this.settings = settings;
    this.coarse = Boolean(coarse);
    this.wheel = null;
    this.pads = null;
    this.visible = false;

    // Pedals always belong to the (existing) touch button cluster.
    this.pads = new TouchControls({ bus });

    // Steering belongs to the wheel only when the scheme is "wheel".
    if (this.coarse && settings.get().controlScheme === 'wheel') {
      this.wheel = new SteeringWheelControl({ bus, settings });
    }

    this.applyScheme();
  }

  getSteer() {
    return this.wheel ? this.wheel.getSteer() : this.pads.getSteer();
  }

  getThrottle() {
    return this.pads.getThrottle();
  }

  getBrake() {
    return this.pads.getBrake();
  }

  getHandbrake() {
    return this.pads.getHandbrake();
  }

  getBoost() {
    return this.pads.getBoost();
  }

  reset() {
    if (this.wheel) this.wheel.reset();
    this.pads.reset();
  }

  /**
   * Swap the left-hand steering zone between the wheel and the steer pads.
   * The wheel's show()/hide() manage the leftZone content; the pedal cluster
   * is untouched by this method.
   */
  applyScheme() {
    const showWheel =
      this.coarse && this.settings.get().controlScheme === 'wheel';
    if (showWheel && !this.visible) {
      this.wheel?.show();
      this.visible = true;
    } else if (!showWheel && this.visible) {
      this.wheel?.hide();
      this.visible = false;
    }
  }

  dispose() {
    this.visible = false;
    this.wheel?.dispose();
    this.pads.dispose();
    this.wheel = null;
    this.pads = null;
  }

  update(dt) {
    if (this.wheel) this.wheel.update(dt);
  }
}
