/**
 * Result overlay shown when the third lap is complete.
 *
 * LapTimer already holds the authoritative lap list, so this view only formats
 * it. The fastest lap in the race gets the yellow row and a visible "Best" tag,
 * not colour alone. "Race again" publishes the same start request as the menu.
 */
import { GAME_STATES } from '../core/GameState.js';
import { formatLapTime } from '../utils/time.js';

const RESULT_MARKUP = `
  <div
    class="result__panel"
    role="dialog"
    aria-modal="true"
    aria-labelledby="result-title"
  >
    <header class="result__head">
      <h2 class="result__title" id="result-title">Race complete</h2>
      <p class="result__summary" data-summary></p>
    </header>

    <table class="result__table">
      <thead>
        <tr>
          <th scope="col">Lap</th>
          <th scope="col">Time</th>
        </tr>
      </thead>
      <tbody data-laps></tbody>
    </table>

    <div class="result__actions">
      <button class="menu-button menu-button--primary" type="button" data-again>
        Race again
      </button>
    </div>

    <p class="result__note">Press R to race again.</p>
  </div>
`;

export class ResultScreen {
  constructor({ bus, lapTimer, touch = false } = {}) {
    if (!bus) throw new Error('ResultScreen needs an EventBus.');

    this.bus = bus;
    this.lapTimer = lapTimer ?? null;
    this.visible = false;
    this.isTouch = touch;

    this.root = document.createElement('div');
    this.root.className = 'result';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.inert = true;
    this.root.innerHTML = RESULT_MARKUP;

    this.summary = this.root.querySelector('[data-summary]');
    this.lapsBody = this.root.querySelector('[data-laps]');
    this.againButton = this.root.querySelector('[data-again]');

    this.againClick = () => {
      this.bus.emit('ui:click');
      this.bus.emit('race:start-request');
    };
    this.againButton.addEventListener('click', this.againClick);

    this.unsubscribeState = bus.on('state:changed', ({ current }) => {
      if (current === GAME_STATES.FINISHED) this.show();
      else this.hide();
    });

    document.body.append(this.root);
  }

  show() {
    if (this.visible) return;

    this.buildResult();
    this.visible = true;
    this.root.inert = false;
    this.root.classList.add('is-visible');
    this.root.setAttribute('aria-hidden', 'false');
    if (!this.isTouch) this.againButton.focus({ preventScroll: true });
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

  buildResult() {
    const lapTimes = this.lapTimer?.lapTimes ?? [];
    const best = lapTimes.length > 0 ? Math.min(...lapTimes) : null;
    const bestIndex = best === null ? -1 : lapTimes.indexOf(best);

    this.summary.textContent =
      best === null
        ? 'No lap times were recorded.'
        : `${lapTimes.length} laps. Best lap ${formatLapTime(best)}.`;

    this.lapsBody.innerHTML = lapTimes
      .map((time, index) => {
        const isBest = index === bestIndex;
        const bestTag = isBest
          ? '<span class="result__best-tag">Best</span>'
          : '';
        return `
          <tr class="result__row${isBest ? ' result__row--best' : ''}">
            <th scope="row">Lap ${index + 1}</th>
            <td class="result__time">${formatLapTime(time)}${bestTag}</td>
          </tr>
        `;
      })
      .join('');
  }

  dispose() {
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    this.againButton.removeEventListener('click', this.againClick);
    this.root.remove();
  }
}
