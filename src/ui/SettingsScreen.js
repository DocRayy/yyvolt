/**
 * Settings screen.
 *
 * Reached from the main menu and the pause menu on every device. All options
 * apply immediately: the value is written to the shared Settings object, which
 * persists it and emits "settings:changed" so the rest of the game can react.
 *
 * The control scheme row is touch-only (the virtual wheel replaces the
 * keyboard on touch devices). Everything else renders on all devices.
 *
 * UI follows the global hard rules: solid navy panels, plain sentence-case
 * copy, no gradients or chrome, safe-area and clamp()-based sizing.
 */
import { DEFAULT_SETTINGS } from '../core/Settings.js';

const SETTINGS_MARKUP = `
  <div class="settings__panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <header class="settings__head">
      <h2 class="settings__title" id="settings-title">Settings</h2>
      <button class="settings__back" type="button" data-back>Back</button>
    </header>

    <div class="settings__body">
      <!-- Control scheme is a touch feature; hidden on desktop. -->
      <div class="settings__row" data-scheme-row>
        <span class="settings__label">Control scheme</span>
        <div class="settings__options">
          <button type="button" data-scheme="wheel">Wheel</button>
          <button type="button" data-scheme="buttons">Buttons</button>
          <button type="button" data-scheme="tilt">Tilt</button>
        </div>
      </div>

      <div class="settings__row">
        <span class="settings__label">Steering sensitivity</span>
        <input
          class="settings__range"
          type="range"
          min="0.6"
          max="1.4"
          step="0.05"
          value="1"
          aria-label="Steering sensitivity"
          data-sensitivity
        />
        <span class="settings__value" data-sensitivity-value>1.00</span>
      </div>

      <div class="settings__row">
        <span class="settings__label">Vibration</span>
        <label class="settings__switch">
          <input type="checkbox" data-toggle="vibration" />
          <span class="settings__track"></span>
        </label>
      </div>

      <div class="settings__row">
        <span class="settings__label">Music</span>
        <label class="settings__switch">
          <input type="checkbox" data-toggle="music" />
          <span class="settings__track"></span>
        </label>
      </div>

      <div class="settings__row">
        <span class="settings__label">Effects volume</span>
        <input
          class="settings__range"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value="1"
          aria-label="Effects volume"
          data-volume
        />
        <span class="settings__value" data-volume-value>100</span>
      </div>

      <div class="settings__row">
        <span class="settings__label">Quality</span>
        <div class="settings__options">
          <button type="button" data-quality="auto">Auto</button>
          <button type="button" data-quality="low">Low</button>
          <button type="button" data-quality="medium">Medium</button>
          <button type="button" data-quality="high">High</button>
        </div>
      </div>

      <div class="settings__row">
        <span class="settings__label">Show FPS</span>
        <label class="settings__switch">
          <input type="checkbox" data-toggle="showFps" />
          <span class="settings__track"></span>
        </label>
      </div>
    </div>
  </div>
`;


export class SettingsScreen {
  constructor({ bus, touch = false, settings = null } = {}) {
    if (!bus) throw new Error('SettingsScreen needs an EventBus.');

    this.bus = bus;
    this.settings = settings;
    this.isTouch = Boolean(touch);
    this.visible = false;

    this.root = document.createElement('div');
    this.root.className = 'settings';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'settings-title');
    this.root.inert = true;
    this.root.innerHTML = SETTINGS_MARKUP;

    this.panel = this.root.querySelector('.settings__panel');
    this.backButton = this.root.querySelector('[data-back]');

    // Control scheme is touch-only; hide the row on desktop.
    this.schemeRow = this.root.querySelector('[data-scheme-row]');
    this.schemeRow.hidden = !this.isTouch;

    this.schemes = Array.from(this.root.querySelectorAll('[data-scheme]'));
    this.sensitivitySlider = this.root.querySelector('[data-sensitivity]');
    this.volumeSlider = this.root.querySelector('[data-volume]');
    this.toggles = Array.from(this.root.querySelectorAll('[data-toggle]'));
    this.fpsRow = this.root.querySelector('[data-fps-row]');

    this.schemes.forEach((button) => {
      button.addEventListener('click', () => {
        this.setting(button.dataset.scheme);
      });
    });

    this.sensitivitySlider.addEventListener('input', () => {
      this.setting('steeringSensitivity', Number(this.sensitivitySlider.value));
      this.root.querySelector('[data-sensitivity-value]').textContent =
        this.sensitivitySlider.value;
    });

    this.volumeSlider.addEventListener('input', () => {
      this.setting('effectsVolume', Number(this.volumeSlider.value));
      this.root.querySelector('[data-volume-value]').textContent =
        Math.round(this.volumeSlider.value * 100);
    });

    this.toggles.forEach((toggle) => {
      toggle.addEventListener('change', () => {
        this.setting(toggle.dataset.toggle, toggle.checked);
      });
    });

    this.backClick = () => this.showHome();
    this.backButton.addEventListener('click', this.backClick);
    this.root.addEventListener('click', this.onRootClick);
    this.root.addEventListener('keydown', this.onRootKeydown);

    // Keep the view in sync with any external change.
    this.unsubscribeSettings = this.bus.on('settings:changed', () => {
      this.refreshFromSettings();
    });

    document.body.append(this.root);

    this.refreshFromSettings();
    this.visibilize(false);
  }

  /** Open the panel on top of the current screen. */
  show() {
    if (this.visible) return;
    this.visible = true;
    this.visibilize(true);
    this.backButton.focus({ preventScroll: true });
  }

  /** Close the panel and return focus to the screen behind it. */
  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.visibilize(false);
    this.root.blur();
  }

  /** Shared visibility wiring; the panel is gated to a single open state. */
  visibilize(visible) {
    this.root.inert = !visible;
    this.root.classList.toggle('is-visible', visible);
    this.root.setAttribute('aria-hidden', String(!visible));
  }

  /** Read the current settings and sync every control to the new values. */
  refreshFromSettings() {
    const s = this.settings.get();

    this.schemes.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.scheme === s.controlScheme);
    });

    this.sensitivitySlider.value = s.steeringSensitivity;
    this.root.querySelector('[data-sensitivity-value]').textContent =
      s.steeringSensitivity.toFixed(2);

    this.volumeSlider.value = s.effectsVolume;
    this.root.querySelector('[data-volume-value]').textContent =
      Math.round(s.effectsVolume * 100);

    this.toggles.forEach((toggle) => {
      toggle.checked = Boolean(s[toggle.dataset.toggle]);
    });
  }

  /** Apply one field and let the rest of the game hear about it. */
  setting(field, value) {
    if (this.settings) {
      this.settings.set(field, value);
    }
  }

  onRootClick(event) {
    const scheme = event.target.closest('[data-scheme]');
    if (scheme) {
      this.setting(scheme.dataset.scheme);
      return;
    }

    const quality = event.target.closest('[data-quality]');
    if (quality) {
      this.setting('quality', quality.dataset.quality);
      return;
    }

    const back = event.target.closest('[data-back]');
    if (back) {
      this.showHome();
    }
  }

  onRootKeydown(event) {
    if (event.code === 'Escape') {
      this.showHome();
    }
  }

  showHome() {
    if (this.visible) {
      this.hide();
    }
  }

  dispose() {
    this.unsubscribeSettings?.();
    this.unsubscribeSettings = null;
    this.backButton.removeEventListener('click', this.backClick);
    this.root.removeEventListener('click', this.onRootClick);
    this.root.removeEventListener('keydown', this.onRootKeydown);
    this.root.remove();
  }
}
