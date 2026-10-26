/**
 * Top-center status toast.
 *
 * Ordinary messages stay neutral. Warnings get the kerb-red edge and personal
 * bests the livery-yellow edge, so the accent always means something. The toast
 * never takes pointer input and disappears on the same short timer every time.
 */
import { TOAST } from '../config/constants.js';

export class Toast {
  constructor(bus) {
    this.element = document.createElement('div');
    this.element.className = 'toast';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    this.element.setAttribute('aria-atomic', 'true');
    document.body.append(this.element);

    this.timer = null;
    this.unsubscribe = bus.on('ui:toast', (payload) => {
      this.show(payload?.message ?? payload, payload?.tone);
    });
  }

  show(message, tone = 'default') {
    if (!message) return;

    this.element.textContent = message;
    this.element.classList.toggle('is-warning', tone === 'warning');
    this.element.classList.toggle('is-best', tone === 'best');
    this.element.classList.add('is-visible');
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.element.classList.remove('is-visible');
      this.timer = null;
    }, TOAST.durationMs);
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    window.clearTimeout(this.timer);
    this.timer = null;
    this.element.remove();
  }
}
