/**
 * Pause overlay, touch settings, and the controls reference.
 *
 * The screen is driven entirely by PAUSED state from GameState. Resume and
 * Restart publish requests; RaceDirector owns the actual transitions so the UI
 * can never leave the car simulated while the clock is stopped. On touch
 * devices the keyboard note is replaced by tilt and vibration controls, and the
 * Controls view explains the on-screen pads instead of showing key caps.
 */
import { GAME_STATES } from '../core/GameState.js';
import {
  buildControlGroupsMarkup,
  buildTouchHelpMarkup,
} from './ControlList.js';

const PAUSE_MARKUP = `
  <div
    class="pause__panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="pause-title"
  >
    <div class="pause__view" data-view="actions">
      <header class="pause__head">
        <h2 class="pause__title" id="pause-title">Paused</h2>
        <p class="pause__summary">The race clock is stopped.</p>
      </header>

      <div class="pause__actions">
        <button class="menu-button menu-button--primary" type="button" data-resume>
          Resume
        </button>
        <button class="menu-button menu-button--secondary" type="button" data-restart>
          Restart
        </button>
        <button class="menu-button menu-button--secondary" type="button" data-controls>
          Controls
        </button>
      </div>

      <div class="touch-settings" data-touch-settings hidden>
        <p class="touch-settings__title">Touch settings</p>
        <button
          class="menu-button menu-button--secondary touch-setting"
          type="button"
          data-tilt
          aria-pressed="false"
        >
          <span>Tilt steering</span>
          <span class="touch-setting__state" data-tilt-state>Off</span>
        </button>
        <button
          class="menu-button menu-button--secondary touch-setting"
          type="button"
          data-vibration
          aria-pressed="false"
        >
          <span>Vibration</span>
          <span class="touch-setting__state" data-vibration-state>On</span>
        </button>
        <p class="touch-settings__status" data-touch-status role="status"></p>
      </div>

      <p class="pause__note">P or Esc resumes the race.</p>
    </div>

    <div class="pause__view" data-view="controls" hidden>
      <header class="menu__controls-head">
        <h2 class="menu__controls-title" id="pause-controls-title">Controls</h2>
        <button class="menu-button menu-button--quiet" type="button" data-back>
          Back
        </button>
      </header>
      <div class="control-list" data-groups></div>
    </div>
  </div>
`;

export class PauseScreen {
  constructor({ bus, touch = false } = {}) {
    if (!bus) throw new Error('PauseScreen needs an EventBus.');

    this.bus = bus;
    this.visible = false;
    this.isTouch = touch;

    this.root = document.createElement('div');
    this.root.className = 'pause';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.inert = true;
    this.root.innerHTML = PAUSE_MARKUP;

    this.panel = this.root.querySelector('.pause__panel');
    this.actionsView = this.root.querySelector('[data-view="actions"]');
    this.controlsView = this.root.querySelector('[data-view="controls"]');
    this.resumeButton = this.root.querySelector('[data-resume]');
    this.restartButton = this.root.querySelector('[data-restart]');
    this.controlsButton = this.root.querySelector('[data-controls]');
    this.backButton = this.root.querySelector('[data-back]');
    this.groupsElement = this.root.querySelector('[data-groups]');
    this.groupsElement.innerHTML = this.isTouch
      ? buildTouchHelpMarkup()
      : buildControlGroupsMarkup();

    this.settings = this.root.querySelector('[data-touch-settings]');
    this.tiltSetting = this.root.querySelector('[data-tilt]');
    this.tiltState = this.root.querySelector('[data-tilt-state]');
    this.vibrationSetting = this.root.querySelector('[data-vibration]');
    this.vibrationState = this.root.querySelector('[data-vibration-state]');
    this.touchStatus = this.root.querySelector('[data-touch-status]');
    this.settings.hidden = !this.isTouch;

    this.resumeClick = () => {
      this.bus.emit('ui:click');
      this.bus.emit('race:resume-request');
    };
    this.restartClick = () => {
      this.bus.emit('ui:click');
      this.bus.emit('race:restart-request');
    };
    this.controlsClick = () => {
      this.bus.emit('ui:click');
      this.showControls();
    };
    this.backClick = () => {
      this.bus.emit('ui:click');
      this.showActions();
    };
    this.tiltClick = () => {
      this.bus.emit('ui:click');
      this.bus.emit('touch:tilt-toggle');
    };
    this.vibrationClick = () => {
      this.bus.emit('ui:click');
      this.bus.emit('touch:vibration-toggle');
    };

    this.resumeButton.addEventListener('click', this.resumeClick);
    this.restartButton.addEventListener('click', this.restartClick);
    this.controlsButton.addEventListener('click', this.controlsClick);
    this.backButton.addEventListener('click', this.backClick);
    this.tiltSetting.addEventListener('click', this.tiltClick);
    this.vibrationSetting.addEventListener('click', this.vibrationClick);

    this.unsubscribeState = bus.on('state:changed', ({ current }) => {
      if (current === GAME_STATES.PAUSED) this.show();
      else this.hide();
    });
    this.unsubscribeSettings = bus.on('touch:settings', (settings) => {
      this.updateTouchSettings(settings);
    });

    document.body.append(this.root);
  }

  show() {
    if (this.visible) return;

    this.visible = true;
    this.showActions();
    this.root.inert = false;
    this.root.classList.add('is-visible');
    this.root.setAttribute('aria-hidden', 'false');
    if (this.isTouch) this.bus.emit('touch:settings-request');
    if (!this.isTouch) this.resumeButton.focus({ preventScroll: true });
  }

  hide() {
    if (!this.visible) return;

    this.visible = false;
    if (this.root.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    this.root.inert = true;
    this.root.classList.remove('is-visible');
    this.root.setAttribute('aria-hidden', 'true');
  }

  showActions() {
    this.panel.classList.remove('is-controls');
    this.panel.setAttribute('aria-labelledby', 'pause-title');
    this.actionsView.hidden = false;
    this.controlsView.hidden = true;
    if (this.visible && !this.isTouch) {
      this.resumeButton.focus({ preventScroll: true });
    }
  }

  showControls() {
    this.panel.classList.add('is-controls');
    this.panel.setAttribute('aria-labelledby', 'pause-controls-title');
    this.actionsView.hidden = true;
    this.controlsView.hidden = false;
    if (!this.isTouch) this.backButton.focus({ preventScroll: true });
  }

  updateTouchSettings(settings = {}) {
    if (!this.isTouch) return;

    const tiltSupported = settings.tiltSupported === true;
    const vibrationSupported = settings.vibrationSupported === true;
    this.tiltSetting.hidden = !tiltSupported;
    this.vibrationSetting.hidden = !vibrationSupported;
    this.settings.hidden = !tiltSupported && !vibrationSupported;

    this.tiltSetting.disabled = settings.tiltPending === true;
    this.tiltSetting.setAttribute(
      'aria-pressed',
      String(settings.tiltEnabled === true),
    );
    this.tiltState.textContent =
      settings.tiltPending === true
        ? 'Requesting'
        : settings.tiltEnabled === true
          ? 'On'
          : 'Off';

    this.vibrationSetting.setAttribute(
      'aria-pressed',
      String(settings.vibrationEnabled === true),
    );
    this.vibrationState.textContent =
      settings.vibrationEnabled === true ? 'On' : 'Off';
    this.touchStatus.textContent = settings.tiltError ?? '';
  }

  dispose() {
    this.unsubscribeState?.();
    this.unsubscribeSettings?.();
    this.unsubscribeState = null;
    this.unsubscribeSettings = null;
    this.resumeButton.removeEventListener('click', this.resumeClick);
    this.restartButton.removeEventListener('click', this.restartClick);
    this.controlsButton.removeEventListener('click', this.controlsClick);
    this.backButton.removeEventListener('click', this.backClick);
    this.tiltSetting.removeEventListener('click', this.tiltClick);
    this.vibrationSetting.removeEventListener('click', this.vibrationClick);
    this.root.remove();
  }
}
