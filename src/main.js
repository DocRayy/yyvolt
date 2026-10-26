/**
 * Entry point and boot shell owner.
 *
 * It creates the Game, forwards real initialisation progress to the loading
 * screen, and only hides the overlay after the first frame is compiled and a
 * short minimum display time has passed. Keeping boot UI here means Game never
 * needs to know about DOM ids or CSS classes.
 */
import './ui/styles/theme.css';
import './ui/styles/hud.css';
import './ui/styles/menu.css';
import './ui/styles/mobile.css';
import { BOOT } from './config/constants.js';
import { Game } from './core/Game.js';
import { Toast } from './ui/Toast.js';
import { clamp } from './utils/math.js';

const canvas = document.querySelector('#scene');
const boot = document.querySelector('#boot');
const label = document.querySelector('#boot-label');
const percent = document.querySelector('#boot-percent');
const fill = document.querySelector('#boot-progress');
const track = document.querySelector('.boot__track');

let activeGame = null;
let activeToast = null;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setProgress(value) {
  const percentValue = Math.round(clamp(value, 0, 1) * 100);
  fill.style.setProperty('--progress', String(percentValue / 100));
  percent.textContent = `${percentValue}%`;
  track.setAttribute('aria-valuenow', String(percentValue));
}

async function bootGame() {
  const startedAt = performance.now();

  try {
    if (!canvas || !boot || !label || !percent || !fill || !track) {
      throw new Error('Boot markup is incomplete.');
    }

    boot.setAttribute('aria-busy', 'true');
    activeGame = new Game({ canvas });
    activeToast = new Toast(activeGame.bus);

    await activeGame.init(setProgress);
    setProgress(1);
    label.textContent = 'Ready';
    activeGame.start();

    // A bar that flashes past reads as a glitch, not as loading.
    const remaining = BOOT.minDurationMs - (performance.now() - startedAt);
    if (remaining > 0) await delay(remaining);

    boot.classList.add('is-hidden');
    boot.setAttribute('aria-hidden', 'true');
    boot.setAttribute('aria-busy', 'false');
  } catch (error) {
    console.error('[YYVOLT] Boot failed:', error);
    activeToast?.dispose();
    activeToast = null;
    activeGame?.dispose();

    if (boot) {
      boot.classList.add('is-error');
      boot.removeAttribute('aria-hidden');
      boot.setAttribute('aria-busy', 'false');
    }
    if (label) label.textContent = 'Could not start the game';
    if (percent) percent.textContent = '—';
    if (track) track.setAttribute('aria-valuetext', 'Boot failed');
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    activeToast?.dispose();
    activeGame?.dispose();
  });
}

bootGame();
