/**
 * src/ui/TrackSelectScreen.js
 *
 * Track selection screen: flat cards with the name, location, a track outline
 * drawn from the centreline on a canvas, length, and best lap. Landscape phone:
 * one row of cards, horizontal scroll with snap. Button: "Start race".
 *
 * Currently only the Bedroom card exists; the panel layout is ready for more
 * tracks once track definitions are added to src/config/track.config.js.
 */

import { ENVIRONMENTS } from '../config/environments.config.js';
import { BEDROOM_TRACK } from '../config/track.config.js';
import { MonacoEnvironment } from '../environments/MonacoEnvironment.js';
import { SilverstoneEnvironment } from '../environments/SilverstoneEnvironment.js';

export class TrackSelectScreen {
  /**
   * @param {{ bus, touch }} opts
   */
  constructor({ bus, touch = false }) {
    this.bus = bus;
    this.touch = touch;
    this.selectedIndex = 0;
    this.selectedTrack = null;

    this.container = null;
    this.cards = [];
    this.canvases = [];
    this.startButton = null;
    this.scrollContainer = null;
  }

  /** Render the screen into the container element and return it. */
  render(container) {
    this.container = container;

    // --- Outer shell: solid navy, chamfered corners, bottom pill. ---
    this.container.innerHTML = `
      <div class="track-select">
        <div class="track-select__header">
          <h1 class="track-select__title">Track select</h1>
          <p class="track-select__subtitle">Choose where you race today.</p>
        </div>

        <div class="track-select__scroll">
          <div class="track-select__cards">
            ${this.renderCards()}
          </div>
        </div>

        <button class="track-select__start">Start race</button>
      </div>
    `;

    this.scrollContainer = this.container.querySelector('.track-select__scroll');
    this.cardsContainer = this.container.querySelector('.track-select__cards');
    this.startButton = this.container.querySelector('.track-select__start');

    // --- Build the track outline canvas for each card. ---
    this.card = this.cardsContainer.querySelector('.track-select__card');
    this.canvas = document.createElement('canvas');
    this.canvas.width = 320;
    this.canvas.height = 160;
    this.drawCenterline();
    this.card.appendChild(this.canvas);

    // --- Wire the start button. ---
    this.startButton.addEventListener('click', () => {
      this.bus.emit('track:select', { id: this.selectedTrackId });
    });

    // --- Landscape phone: horizontal scroll with snap. ---
    this.setupScroll();

    // --- Keyboard accessible: focus the start button on load. ---
    this.startButton.focus();

    return this.container;
  }

  /** Build cards for every registered environment. */
  renderCards() {
    return ENVIRONMENTS.map((env, index) => {
      const track = this.getTrackDefinition(env.id);
      // Calculate track length from the centreline samples.
      let length = 0;
      const points = track.points;
      for (let i = 1; i < points.length; i += 1) {
        const dx = points[i][0] - points[i - 1][0];
        const dz = points[i][2] - points[i - 1][2];
        length += Math.sqrt(dx * dx + dz * dz);
      }
      const lengthKm = (length / 1000).toFixed(2);
      this.selectedTrackId = env.id;

      // Best lap: read from localStorage (yyvolt:v2:best:<envId>, with fallback
      // to the old v1 key yyvolt.bestLap).
      let bestLap = '—';
      try {
        const v2 = localStorage.getItem(`yyvolt:v2:best:${env.id}`);
        if (v2) bestLap = v2;
        else {
          const legacy = localStorage.getItem('yyvolt.bestLap');
          if (legacy) bestLap = legacy;
        }
      } catch {
        // Private browsing / storage quota: leave as em dash.
      }

      return `
        <div class="track-select__card" data-index="${index}">
          <div class="track-select__details">
            <div class="track-select__row">
              <span class="label">Name</span>
              <span class="value">${env.name}</span>
            </div>
            <div class="track-select__row">
              <span class="label">Location</span>
              <span class="value">${env.location}</span>
            </div>
            <div class="track-select__row">
              <span class="label">Length</span>
              <span class="value">${lengthKm} km</span>
            </div>
            <div class="track-select__row">
              <span class="label">Best lap</span>
              <span class="value">${bestLap}</span>
            </div>
          </div>
          <canvas class="track-select__canvas"></canvas>
          <button class="track-select__start">Start race</button>
        </div>
      `;
    }).join('\n');
  }

  /** Return the track definition for a given environment id. */
  getTrackDefinition(envId) {
    if (envId === 'monaco') {
      return new MonacoEnvironment().getTrackDefinition();
    }
    if (envId === 'silverstone') {
      return new SilverstoneEnvironment().getTrackDefinition();
    }
    // Default to Bedroom for any unknown id.
    return new MonacoEnvironment().getTrackDefinition(); // fallback
  }

  /** Draw the centreline onto an offscreen canvas. */
  drawCenterline() {
    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Track colour from the design palette.
    ctx.strokeStyle = 'rgb(244, 81, 30)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    const points = this.selectedTrack ? this.selectedTrack.points : BEDROOM_TRACK.points;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][2]);
    for (let i = 1; i < points.length; i += 1) {
      ctx.lineTo(points[i][0], points[i][2]);
    }
    ctx.stroke();
  }

  setupScroll() {
    const container = this.scrollContainer;
    container.style.overflowX = 'auto';
    container.style.overflowY = 'hidden';
    container.style.scrollSnapType = 'x mandatory';
    container.style.display = 'flex';
    container.style.gap = '12px';
    container.style.padding = '12px';
    container.style.webkitOverflowScrolling = 'touch';

    const card = this.card;
    card.style.scrollSnapAlign = 'start';
    card.style.flex = '0 0 70vw';
    card.style.maxWidth = '70vw';
    card.style.minWidth = '320px';
    card.style.opacity = '1';
  }

  /** Show the screen inside a container. */
  show() {
    // The screen is expected to be mounted by the screen controller.
    if (this.container && this.container.isConnected) return;
    const root = document.getElementById('screen-root');
    if (root) root.appendChild(this.render(root));
  }

  /** Hide the screen. */
  hide() {
    if (this.container && this.container.isConnected) {
      this.container.remove();
      this.container = null;
    }
  }

  dispose() {
    this.hide();
  }
}
