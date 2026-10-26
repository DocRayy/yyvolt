/**
 * Full-screen portrait gate for touch devices.
 *
 * Phones only play in landscape so the HUD, track, and future touch controls
 * keep their intended thumb zones. The prompt is a plain navy message, not a
 * dialog the player has to dismiss: Game stops the render loop and suspends
 * audio while it is up, then resumes from the same race state when the device
 * turns back.
 */
export class RotatePrompt {
  constructor({ bus }) {
    this.root = document.createElement('div');
    this.root.className = 'rotate-prompt';
    this.root.setAttribute('role', 'status');
    this.root.setAttribute('aria-live', 'polite');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = `
      <div class="rotate-prompt__content">
        <p class="rotate-prompt__title">Rotate your device to play</p>
        <p class="rotate-prompt__detail">
          YYVOLT runs in landscape so the track and controls stay in view.
        </p>
      </div>
    `;
    document.body.append(this.root);

    this.visible = false;
    this.unsubscribe = bus.on('orientation:blocked', ({ blocked } = {}) => {
      if (blocked) this.show();
      else this.hide();
    });
  }

  show() {
    if (this.visible) return;
    this.visible = true;
    document.body.classList.add('is-rotate-blocked');
    this.root.classList.add('is-visible');
    this.root.setAttribute('aria-hidden', 'false');
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    document.body.classList.remove('is-rotate-blocked');
    this.root.classList.remove('is-visible');
    this.root.setAttribute('aria-hidden', 'true');
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    document.body.classList.remove('is-rotate-blocked');
    this.root.remove();
  }
}
