/**
 * One captured touch target.
 *
 * Every pedal, drift button, and steering pad owns exactly one pointer. Owning
 * capture on the element (instead of listening through a shared container) is
 * what keeps two thumbs independent: a gas press and a steering press never
 * share state, and releasing one cannot clear the other. The same class also
 * drops its input on blur, orientation change, and lost capture so a race can
 * never start with a stuck pedal.
 */
export class TouchActionButton {
  constructor({ element, action, onChange }) {
    if (!element) throw new Error('TouchActionButton needs an element.');
    if (!action) throw new Error('TouchActionButton needs an action id.');

    this.element = element;
    this.action = action;
    this.onChange = onChange;
    this.pointerId = null;
    this.active = false;

    this.handleDown = this.handleDown.bind(this);
    this.handleUp = this.handleUp.bind(this);
    this.handleLostCapture = this.handleLostCapture.bind(this);
    this.handleReset = this.handleReset.bind(this);

    element.addEventListener('pointerdown', this.handleDown);
    element.addEventListener('pointerup', this.handleUp);
    element.addEventListener('pointercancel', this.handleUp);
    element.addEventListener('lostpointercapture', this.handleLostCapture);
    // Capture is the normal path, but an older browser may refuse it during a
    // simultaneous gesture. Window listeners guarantee the press still ends.
    window.addEventListener('pointerup', this.handleUp);
    window.addEventListener('pointercancel', this.handleUp);
    window.addEventListener('blur', this.handleReset);
    window.addEventListener('orientationchange', this.handleReset);
  }

  handleDown(event) {
    if (this.pointerId !== null) return;
    // Ignore secondary mouse buttons; touch and pen always report button 0.
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    event.preventDefault();
    this.pointerId = event.pointerId;
    this.setActive(true);

    try {
      this.element.setPointerCapture(event.pointerId);
    } catch {
      // The window-level pointerup listener still clears the action.
    }
  }

  handleUp(event) {
    if (event.pointerId !== this.pointerId) return;
    this.release();
  }

  handleLostCapture(event) {
    if (event.pointerId !== this.pointerId) return;
    this.release();
  }

  /** Window blur and orientation change must never leave a pedal held down. */
  handleReset() {
    this.release();
  }

  release() {
    if (this.pointerId !== null) {
      try {
        if (this.element.hasPointerCapture(this.pointerId)) {
          this.element.releasePointerCapture(this.pointerId);
        }
      } catch {
        // The element may already have lost capture.
      }
      this.pointerId = null;
    }

    this.setActive(false);
  }

  setActive(active) {
    if (active === this.active) return;
    this.active = active;
    this.element.classList.toggle('is-pressed', active);
    this.element.setAttribute('aria-pressed', String(active));
    this.onChange?.(this.action, active);
  }

  dispose() {
    this.release();
    this.element.removeEventListener('pointerdown', this.handleDown);
    this.element.removeEventListener('pointerup', this.handleUp);
    this.element.removeEventListener('pointercancel', this.handleUp);
    this.element.removeEventListener(
      'lostpointercapture',
      this.handleLostCapture,
    );
    window.removeEventListener('pointerup', this.handleUp);
    window.removeEventListener('pointercancel', this.handleUp);
    window.removeEventListener('blur', this.handleReset);
    window.removeEventListener('orientationchange', this.handleReset);
  }
}
