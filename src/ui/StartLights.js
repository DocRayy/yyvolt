/**
 * Five-lamp start gantry, the one deliberately loud UI moment.
 *
 * The class owns only the countdown choreography and the DOM lamps. It emits
 * "countdown:light" once per red lamp and then "countdown:go", which AudioManager
 * already uses for synthesized beeps. Game starts the race when the same go
 * signal produces "countdown:complete", so no second timer can disagree.
 */
import { RACE } from '../config/race.config.js';

export class StartLights {
  constructor({ bus } = {}) {
    if (!bus) throw new Error('StartLights needs an EventBus.');

    this.bus = bus;
    this.phase = 'idle';
    this.elapsed = 0;
    this.lit = 0;
    this.hideTimer = 0;
    this.lightsOutDelay = 0;

    this.root = document.createElement('div');
    this.root.className = 'start-lights';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.setAttribute('aria-label', 'Start lights');

    const beam = document.createElement('div');
    beam.className = 'start-lights__beam';
    this.lamps = [];
    for (let index = 0; index < RACE.countdown.lightCount; index += 1) {
      const lamp = document.createElement('span');
      lamp.className = 'start-lights__lamp';
      beam.append(lamp);
      this.lamps.push(lamp);
    }

    this.root.append(beam);
    document.body.append(this.root);

    this.unsubscribeState = bus.on('state:changed', ({ current }) => {
      if (current === 'COUNTDOWN') {
        this.start();
      } else if (current === 'MENU') {
        this.hide(true);
      } else if (current === 'RACING' && this.phase !== 'go') {
        this.hide(true);
      }
    });
  }

  start() {
    this.phase = 'lighting';
    this.elapsed = 0;
    this.lit = 0;
    this.hideTimer = 0;
    this.lightsOutDelay =
      RACE.countdown.lightsOutMin +
      Math.random() *
        (RACE.countdown.lightsOutMax - RACE.countdown.lightsOutMin);

    for (const lamp of this.lamps) lamp.classList.remove('is-lit');
    this.root.classList.add('is-visible');
    this.root.setAttribute('aria-hidden', 'false');
    this.root.setAttribute('aria-label', 'Start lights');
  }

  update(dt) {
    if (this.phase === 'idle') return;

    if (this.phase === 'go') {
      this.hideTimer -= dt;
      if (this.hideTimer <= 0) this.hide();
      return;
    }

    this.elapsed += dt;

    const target =
      this.elapsed < RACE.countdown.firstLightDelay
        ? 0
        : Math.min(
            RACE.countdown.lightCount,
            Math.floor(
              (this.elapsed - RACE.countdown.firstLightDelay) /
                RACE.countdown.lightInterval,
            ) + 1,
          );

    while (this.lit < target) {
      this.lamps[this.lit].classList.add('is-lit');
      this.bus.emit('countdown:light', {
        index: this.lit,
        total: RACE.countdown.lightCount,
      });
      this.lit += 1;
    }

    const lastLightAt =
      RACE.countdown.firstLightDelay +
      (RACE.countdown.lightCount - 1) * RACE.countdown.lightInterval;
    if (
      this.lit >= RACE.countdown.lightCount &&
      this.elapsed >= lastLightAt + this.lightsOutDelay
    ) {
      this.triggerGo();
    }
  }

  triggerGo() {
    for (const lamp of this.lamps) lamp.classList.remove('is-lit');
    this.phase = 'go';
    this.hideTimer = RACE.countdown.hideDelay;
    this.root.setAttribute('aria-label', 'Lights out');
    this.bus.emit('countdown:go');
    this.bus.emit('countdown:complete');
  }

  hide(force = false) {
    if (force && this.phase === 'idle') return;

    this.phase = 'idle';
    this.elapsed = 0;
    this.lit = 0;
    this.hideTimer = 0;
    for (const lamp of this.lamps) lamp.classList.remove('is-lit');
    this.root.classList.remove('is-visible');
    this.root.setAttribute('aria-hidden', 'true');
  }

  dispose() {
    this.unsubscribeState?.();
    this.unsubscribeState = null;
    this.root.remove();
  }
}
