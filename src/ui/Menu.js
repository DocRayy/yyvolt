/**
 * Main menu and its focused controls reference.
 *
 * The menu is a solid navy block over the drifting room, not a full-screen
 * blurred overlay. Start race is the primary action; Controls opens the same
 * generated reference used by the pause screen. Pause and result live in their
 * own classes because only one of the three overlays is visible at a time.
 */
import { formatLapTime } from '../utils/time.js';
import {
  buildControlGroupsMarkup,
  buildTouchHelpMarkup,
} from './ControlList.js';

const BOLT = `
  <svg class="menu__bolt" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"></path>
  </svg>
`;

const MENU_MARKUP = `
  <div class="menu__panel" role="dialog" aria-modal="true" aria-labelledby="menu-title">
    <div class="menu__home" data-view="home">
      <header class="menu__head">
        <h1 class="menu__brand" id="menu-title">
          <span>YYVOLT</span>
          ${BOLT}
        </h1>
        <p class="menu__tagline">Three laps around the bedroom.</p>
      </header>

      <p class="menu__best">
        <span class="menu__best-label">Personal best</span>
        <span class="menu__best-value" data-best>—</span>
      </p>

      <div class="menu__actions">
        <button class="menu-button menu-button--primary" type="button" data-start>
          Start race
        </button>
        <button class="menu-button menu-button--secondary" type="button" data-controls>
          Controls
        </button>
      </div>

      <p class="menu__note">Enter starts the race.</p>
    </div>

    <div class="menu__controls" data-view="controls" hidden>
      <header class="menu__controls-head">
        <h2 class="menu__controls-title" id="menu-controls-title">Controls</h2>
        <button class="menu-button menu-button--quiet" type="button" data-back>
          Back
        </button>
      </header>
      <div class="control-list" data-groups></div>
    </div>
  </div>
`;

export class Menu {
  constructor({ bus, lapTimer, touch = false } = {}) {
    if (!bus) throw new Error('Menu needs an EventBus.');

    this.bus = bus;
    this.lapTimer = lapTimer ?? null;
    this.visible = false;
    this.controlsOpen = false;
    this.isTouch = touch;

    this.root = document.createElement('div');
    this.root.className = 'menu';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.inert = true;
    this.root.innerHTML = MENU_MARKUP;

    this.panel = this.root.querySelector('.menu__panel');
    this.home = this.root.querySelector('[data-view="home"]');
    this.controls = this.root.querySelector('[data-view="controls"]');
    this.startButton = this.root.querySelector('[data-start]');
    this.controlsButton = this.root.querySelector('[data-controls]');
    this.backButton = this.root.querySelector('[data-back]');
    this.bestValue = this.root.querySelector('[data-best]');
    this.groupsElement = this.root.querySelector('[data-groups]');
    this.groupsElement.innerHTML = this.isTouch
      ? buildTouchHelpMarkup()
      : buildControlGroupsMarkup();

    this.startClick = () => this.startRace();
    this.controlsClick = () => this.showControls();
    this.backClick = () => this.showHome();
    this.handleKeyDown = this.onKeyDown.bind(this);

    this.startButton.addEventListener('click', this.startClick);
    this.controlsButton.addEventListener('click', this.controlsClick);
    this.backButton.addEventListener('click', this.backClick);
    window.addEventListener('keydown', this.handleKeyDown);

    this.unsubscribeState = bus.on('state:changed', ({ current }) => {
      if (current === 'MENU') this.show();
      else this.hide();
    });

    document.body.append(this.root);
  }

  show() {
    if (this.visible) return;

    this.visible = true;
    this.root.inert = false;
    this.root.classList.add('is-visible');
    this.root.setAttribute('aria-hidden', 'false');
    this.showHome();
    this.updateBest();
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

  showHome() {
    this.controlsOpen = false;
    this.panel.classList.remove('is-controls');
    this.panel.setAttribute('aria-labelledby', 'menu-title');
    this.home.hidden = false;
    this.controls.hidden = true;
    if (!this.isTouch) this.startButton.focus({ preventScroll: true });
  }

  showControls() {
    this.controlsOpen = true;
    this.panel.classList.add('is-controls');
    this.panel.setAttribute('aria-labelledby', 'menu-controls-title');
    this.home.hidden = true;
    this.controls.hidden = false;
    if (!this.isTouch) this.backButton.focus({ preventScroll: true });
  }

  updateBest() {
    const best = this.lapTimer?.best ?? null;
    this.bestValue.textContent = formatLapTime(best);
  }

  startRace() {
    if (!this.visible || this.controlsOpen) return;
    this.bus.emit('ui:click');
    this.bus.emit('race:start-request');
  }

  onKeyDown(event) {
    if (!this.visible) return;

    if (event.code === 'Escape' && this.controlsOpen) {
      event.preventDefault();
      this.bus.emit('ui:click');
      this.showHome();
      return;
    }

    if (
      event.code === 'Enter' &&
      !this.controlsOpen &&
      !this.isInteractive(event.target)
    ) {
      this.startRace();
    }
  }

  isInteractive(target) {
    return (
      target instanceof Element &&
      Boolean(target.closest('button, a, input, textarea, select, [role="button"]'))
    );
  }

  dispose() {
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    window.removeEventListener('keydown', this.handleKeyDown);
    this.startButton.removeEventListener('click', this.startClick);
    this.controlsButton.removeEventListener('click', this.controlsClick);
    this.backButton.removeEventListener('click', this.backClick);
    this.root.remove();
  }
}
