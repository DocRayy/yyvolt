/**
 * Screen-edge speed streaks shown only while boost is active.
 *
 * The lines are an SVG overlay generated once at boot. They are deliberately
 * static: the action is the boost, so the overlay only fades in and out instead
 * of adding another looping animation. pointer-events stays off so it never
 * steals a touch or click from the game.
 */
import { CAR } from '../config/car.config.js';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export class SpeedLines {
  constructor({ car } = {}) {
    if (!car) throw new Error('SpeedLines needs the car.');

    this.car = car;
    this.wrapper = null;
    this.visible = false;
    this.randomState = 0x51ed270b;

    if (typeof document !== 'undefined') this.createOverlay();
  }

  random() {
    this.randomState = (this.randomState * 1664525 + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }

  createOverlay() {
    const wrapper = document.createElement('div');
    wrapper.className = 'speed-lines';
    wrapper.setAttribute('aria-hidden', 'true');

    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');

    for (let i = 0; i < CAR.effects.speedLineCount; i += 1) {
      const edge = i % 4;
      const along = 4 + this.random() * 92;
      const length = 2.5 + this.random() * 6;
      const drift = (this.random() - 0.5) * 4;
      const line = document.createElementNS(SVG_NAMESPACE, 'line');

      if (edge === 0) {
        line.setAttribute('x1', along);
        line.setAttribute('y1', 0);
        line.setAttribute('x2', along + drift);
        line.setAttribute('y2', length);
      } else if (edge === 1) {
        line.setAttribute('x1', along);
        line.setAttribute('y1', 100);
        line.setAttribute('x2', along + drift);
        line.setAttribute('y2', 100 - length);
      } else if (edge === 2) {
        line.setAttribute('x1', 0);
        line.setAttribute('y1', along);
        line.setAttribute('x2', length);
        line.setAttribute('y2', along + drift);
      } else {
        line.setAttribute('x1', 100);
        line.setAttribute('y1', along);
        line.setAttribute('x2', 100 - length);
        line.setAttribute('y2', along + drift);
      }

      line.setAttribute('stroke', 'currentColor');
      line.setAttribute('stroke-width', '0.22');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', (0.25 + this.random() * 0.55).toFixed(2));
      svg.append(line);
    }

    wrapper.append(svg);
    document.body.append(wrapper);
    this.wrapper = wrapper;
  }

  update() {
    if (!this.wrapper) return;

    const active = this.car.physics.boostActive;
    if (active === this.visible) return;
    this.visible = active;
    this.wrapper.classList.toggle('is-active', active);
  }

  dispose() {
    this.wrapper?.remove();
    this.wrapper = null;
  }
}
