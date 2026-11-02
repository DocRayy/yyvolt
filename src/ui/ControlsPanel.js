/**
 * Persistent control reference.
 *
 * On desktop this is the top-right keyboard map: a quick reminder while
 * driving, foldable with H, with a yellow edge on the active camera row and
 * inverted key caps while a key is held. On a coarse-pointer device it becomes
 * one small Controls button under the minimap that opens a short explanation of
 * the touch pads. It appears during RACING only, so it can never collide with
 * the start-light gantry.
 */
import { GAME_STATES } from '../core/GameState.js';
import {
  buildControlGroupsMarkup,
  TOUCH_QUICK_HELP_MARKUP,
} from './ControlList.js';

const PANEL_MARKUP = `
  <aside
    class="controls-panel"
    aria-labelledby="controls-panel-title"
    aria-hidden="true"
  >
    <header class="controls-panel__head">
      <h2 class="controls-panel__title" id="controls-panel-title">Controls</h2>
      <button
        class="controls-panel__toggle"
        type="button"
        aria-expanded="true"
        aria-controls="controls-panel-body"
      >
        Hide
      </button>
    </header>
    <div class="controls-panel__body" id="controls-panel-body" data-body>
      <div class="control-list controls-panel__list" data-groups></div>
    </div>
  </aside>
`;

const TOUCH_PANEL_MARKUP = `
  <aside
    class="controls-panel controls-panel--touch"
    data-layout-zone="controlsPanel"
    aria-label="Touch controls"
    aria-hidden="true"
  >
    <button
      class="controls-panel__toggle controls-panel__toggle--touch"
      type="button"
      aria-expanded="false"
      aria-controls="touch-controls-body"
    >
      Controls
    </button>
    <div class="controls-panel__body" id="touch-controls-body" data-body hidden>
      <h2 class="controls-panel__title">Touch controls</h2>
      ${TOUCH_QUICK_HELP_MARKUP}
    </div>
  </aside>
`;

export class ControlsPanel {
  constructor({ bus, cameraRig, touch = false } = {}) {
    if (!bus) throw new Error('ControlsPanel needs an EventBus.');

    this.bus = bus;
    this.cameraRig = cameraRig ?? null;
    this.touch = touch;
    this.allowed = false;
    this.collapsed = false;

    const template = document.createElement('template');
    template.innerHTML = this.touch ? TOUCH_PANEL_MARKUP : PANEL_MARKUP;
    this.panel = template.content.firstElementChild;
    this.toggleButton = this.panel.querySelector('.controls-panel__toggle');
    this.body = this.panel.querySelector('[data-body]');

    if (!this.touch) {
      this.panel.querySelector('[data-groups]').innerHTML =
        buildControlGroupsMarkup();
    }

    this.keyElements = [
      ...this.panel.querySelectorAll('.control-key'),
    ];
    this.cameraRows = [
      ...this.panel.querySelectorAll('.control-row[data-camera-id]'),
    ];

    this.toggleClick = () => {
      this.bus.emit('ui:click');
      this.setCollapsed(!this.collapsed);
    };
    this.toggleButton.addEventListener('click', this.toggleClick);
    document.body.append(this.panel);

    this.unsubscribers = [
      bus.on('state:changed', ({ current }) => {
        this.setAllowed(current === GAME_STATES.RACING);
      }),
      bus.on('input:action', this.handleAction),
      bus.on('input:keystate', this.handleKeyState),
      bus.on('camera:changed', ({ id }) => this.setActiveCamera(id)),
    ];

    this.setActiveCamera(cameraRig?.currentId);
    this.setCollapsed(this.touch);
    this.setAllowed(false);
  }

  setAllowed(allowed) {
    if (allowed === this.allowed) return;

    this.allowed = allowed;
    this.panel.classList.toggle('is-visible', allowed);
    this.panel.setAttribute('aria-hidden', String(!allowed));
    this.panel.inert = !allowed;

    if (!allowed) {
      // The touch help is a quick reference, not a panel that should reappear
      // over the car after a pause.
      if (this.touch) this.setCollapsed(true);
      if (this.panel.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    }
  }

  setCollapsed(collapsed) {
    if (collapsed === this.collapsed) {
      this.updateToggleState();
      return;
    }

    this.collapsed = collapsed;
    this.panel.classList.toggle('is-collapsed', collapsed);
    this.body.hidden = collapsed;
    this.updateToggleState();
  }

  updateToggleState() {
    this.toggleButton.textContent = this.touch
      ? this.collapsed
        ? 'Controls'
        : 'Hide'
      : this.collapsed
        ? 'Show'
        : 'Hide';
    this.toggleButton.setAttribute(
      'aria-expanded',
      String(!this.collapsed),
    );
  }

  setActiveCamera(id) {
    if (!id) return;

    for (const row of this.cameraRows) {
      const active = row.dataset.cameraId === id;
      row.classList.toggle('is-active', active);
      if (active) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    }
  }

  handleKeyState = ({ code, pressed } = {}) => {
    if (!code) return;

    for (const key of this.keyElements) {
      const codes = key.dataset.codes?.split(' ') ?? [];
      if (codes.includes(code)) key.classList.toggle('is-pressed', pressed);
    }
  };

  handleAction = ({ action } = {}) => {
    if (action !== 'system.controls' || !this.allowed) return;
    this.setCollapsed(!this.collapsed);
  };

  dispose() {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers.length = 0;
    this.toggleButton.removeEventListener('click', this.toggleClick);
    this.panel.remove();
  }
}
