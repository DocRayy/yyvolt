/**
 * Race HUD: timing tower, speed and boost, minimap, camera and day/night.
 *
 * The HUD reads the live car and LapTimer each render tick but owns no gameplay
 * state. Values are written only when they change, and the changing numbers use
 * tabular figures so the layout never jitters. Buttons are the only elements
 * that accept pointer input; the rest of the layer ignores it.
 */
import { RACE } from '../config/race.config.js';
import { formatDelta, formatLapTime } from '../utils/time.js';
import { Minimap } from './Minimap.js';

const SUN_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="4.2"></circle>
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"></path>
  </svg>
`;

const MOON_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.3 8.3 0 1 0 10.2 10.2Z"></path>
  </svg>
`;

const HUD_MARKUP = `
  <section
    class="hud__timing"
    data-layout-zone="topLeft"
    aria-label="Lap timing"
  >
    <div class="timing">
      <div class="timing__row timing__row--lap">
        <span class="timing__label">Lap</span>
        <span class="timing__value" data-timing="lap">1 / 3</span>
      </div>
      <div class="timing__row timing__row--current">
        <span class="timing__label">Current</span>
        <span class="timing__value" data-timing="current">0:00.000</span>
      </div>
      <div class="timing__row timing__row--last">
        <span class="timing__label">Last</span>
        <span class="timing__value" data-timing="last">—</span>
      </div>
      <div class="timing__row timing__row--best">
        <span class="timing__label">Best</span>
        <span class="timing__value" data-timing="best">—</span>
      </div>
      <div class="timing__row timing__row--delta">
        <span class="timing__label">Delta</span>
        <span class="timing__value" data-timing="delta">—</span>
      </div>
    </div>
  </section>

  <div class="hud__speed" data-layout-zone="bottomCenter">
    <div class="speed" aria-label="Speed and boost">
      <div class="speed__readout">
        <span class="speed__value" data-speed>0</span>
        <span class="speed__unit">km/h</span>
      </div>
      <div
        class="speed__boost"
        role="progressbar"
        aria-label="Boost energy"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="100"
      >
        <span class="speed__boost-fill" data-boost></span>
      </div>
    </div>
  </div>

  <div class="hud__fps" data-fps-row>
    <span class="hud__fps__label">FPS</span>
    <span class="hud__fps__value" data-fps>60</span>
  </div>

  <div class="hud__buttons" data-layout-zone="topBar">
    <button
      class="hud-button hud-button--pause"
      type="button"
      aria-label="Pause race"
    >
      <span class="hud-button__value">Pause</span>
    </button>
    <button
      class="hud-button hud-button--camera"
      type="button"
      aria-label="Change camera. Current camera: Chase."
    >
      <span class="hud-button__label">Camera</span>
      <span class="hud-button__value" data-camera>Chase</span>
    </button>
    <button
      class="hud-button hud-button--daynight"
      type="button"
      aria-label="Switch to night mode"
    >
      <span class="hud-button__icon" data-daynight-icon>${SUN_ICON}</span>
      <span class="hud-button__value" data-daynight>Day</span>
    </button>
  </div>
`;

export class HUD {
  constructor({ bus, car, cameraRig, lapTimer, trackPath } = {}) {
    if (!bus || !car || !lapTimer) {
      throw new Error('HUD needs a bus, car, and LapTimer.');
    }

    this.bus = bus;
    this.car = car;
    this.cameraRig = cameraRig;
    this.lapTimer = lapTimer;
    this.visible = false;
    this.timingAccumulator = 1;
    this.speedValue = null;
    this.boostValue = -1;

    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.setAttribute('aria-label', 'Race HUD');
    this.root.setAttribute('aria-hidden', 'true');
    this.root.inert = true;
    this.root.innerHTML = HUD_MARKUP;

    this.lapValue = this.root.querySelector('[data-timing="lap"]');
    this.currentValue = this.root.querySelector('[data-timing="current"]');
    this.lastValue = this.root.querySelector('[data-timing="last"]');
    this.bestValue = this.root.querySelector('[data-timing="best"]');
    this.deltaValue = this.root.querySelector('[data-timing="delta"]');
    this.deltaRow = this.root.querySelector('.timing__row--delta');
    this.speedValueElement = this.root.querySelector('[data-speed]');
    this.boostBar = this.root.querySelector('.speed__boost');
    this.boostFill = this.root.querySelector('[data-boost]');
    this.cameraButton = this.root.querySelector('.hud-button--camera');
    this.cameraValue = this.root.querySelector('[data-camera]');
    this.pauseButton = this.root.querySelector('.hud-button--pause');
    this.dayNightButton = this.root.querySelector('.hud-button--daynight');
    this.dayNightValue = this.root.querySelector('[data-daynight]');
    this.dayNightIcon = this.root.querySelector('[data-daynight-icon]');

    this.fpsRow = this.root.querySelector('[data-fps-row]');
    this.speedValueElement = this.root.querySelector('[data-speed]');
    this.showFps = false;
    this.frameTimes = new Float64Array(60);
    this.frameIndex = 0;
    this.frameCount = 0;
    this.lastFrame = performance.now();
    this.minimap = new Minimap({ trackPath, car });
    this.root.append(this.minimap.wrapper);

    this.cameraClick = () => {
      this.bus.emit('ui:click');
      this.bus.emit('camera:cycle');
    };
    this.pauseClick = () => {
      this.bus.emit('ui:click');
      this.bus.emit('input:action', { action: 'system.pause', code: null });
    };
    this.dayNightClick = () => {
      this.bus.emit('ui:click');
      this.bus.emit('daynight:toggle');
    };
    this.cameraButton.addEventListener('click', this.cameraClick);
    this.pauseButton.addEventListener('click', this.pauseClick);
    this.dayNightButton.addEventListener('click', this.dayNightClick);

    this.setCamera(cameraRig?.currentMode?.name ?? 'Chase');
    this.setDayNight('day');
    this.setVisible(false);
    document.body.append(this.root);

    this.unsubscribeState = bus.on('state:changed', ({ current }) => {
      // Pause and result use full menu screens; leaving the timing tower behind
      // them adds noise without adding live information.
      this.setVisible(current === 'COUNTDOWN' || current === 'RACING');
    });
    this.unsubscribeCamera = bus.on('camera:changed', ({ name }) => {
      this.setCamera(name);
    });
    this.unsubscribeDayNight = bus.on('daynight:changed', ({ mode }) => {
      this.setDayNight(mode);
    });
  }

  setFpsEnabled(enabled) {
    if (enabled === this.showFps) return;
    this.showFps = Boolean(enabled);
    this.fpsRow.hidden = !enabled;
    if (enabled) {
      this.lastFrame = performance.now();
      this.frameIndex = 0;
      this.frameCount = 0;
    }
  }

  setVisible(visible) {
    if (visible === this.visible) return;

    this.visible = visible;
    this.root.classList.toggle('is-visible', visible);
    this.root.setAttribute('aria-hidden', String(!visible));
    this.root.inert = !visible;

    if (visible) {
      this.timingAccumulator = 1;
      this.boostValue = -1;
      this.speedValue = null;
    }
  }

  setCamera(name) {
    if (!name) return;
    if (this.cameraValue.textContent !== name) {
      this.cameraValue.textContent = name;
    }
    this.cameraButton.setAttribute(
      'aria-label',
      `Change camera. Current camera: ${name}.`,
    );
  }

  setDayNight(mode) {
    const night = mode === 'night';
    const label = night ? 'Night' : 'Day';
    this.dayNightValue.textContent = label;
    this.dayNightIcon.innerHTML = night ? MOON_ICON : SUN_ICON;
    this.dayNightButton.setAttribute(
      'aria-label',
      night ? 'Switch to day mode' : 'Switch to night mode',
    );
  }

  update(dt) {
    if (!this.visible) return;

    this.updateSpeed();
    this.minimap.update(dt);

    this.timingAccumulator += dt;
    if (this.timingAccumulator < 1 / RACE.hud.timingUpdateHz) return;
    this.timingAccumulator = 0;
    this.updateTiming();
  }

  updateTiming() {
    const timer = this.lapTimer;
    const lap = Math.min(timer.lap, timer.laps);
    this.setText(this.lapValue, `${lap} / ${timer.laps}`);
    this.setText(this.currentValue, formatLapTime(timer.currentTime));
    this.setText(this.lastValue, formatLapTime(timer.lastLap));
    this.setText(this.bestValue, formatLapTime(timer.best));

    const delta = timer.lastDelta;
    this.setText(this.deltaValue, formatDelta(delta));
    const faster = Number.isFinite(delta) && delta < -0.0005;
    const slower = Number.isFinite(delta) && delta > 0.0005;
    this.deltaRow.classList.toggle('is-faster', faster);
    this.deltaRow.classList.toggle('is-slower', slower);
  }

  updateSpeed() {
    const physics = this.car.physics;
    const speed = Math.round(
      Math.abs(physics.speed) * RACE.hud.speedScale,
    );
    if (speed !== this.speedValue) {
      this.speedValue = speed;
      this.speedValueElement.textContent = String(speed);
    }

    const boost = Math.max(0, Math.min(physics.boostEnergy, 1));
    if (Math.abs(boost - this.boostValue) > 0.002) {
      this.boostValue = boost;
      this.boostFill.style.transform = `scaleX(${boost.toFixed(3)})`;
      this.boostBar.setAttribute(
        'aria-valuenow',
        String(Math.round(boost * 100)),
      );
    }
  }

  setText(element, value) {
    if (element.textContent !== value) element.textContent = value;
  }

  updateFps() {
    this.fillFpsBuffer();
    if (!this.showFps) return;

    const total = this.frameCount;
    let sum = 0;
    for (let i = 0; i < total; i += 1) sum += this.frameTimes[i];
    const fps = total / sum;
    const text = String(Math.round(fps));
    if (this.fpsValue.textContent !== text) {
      this.fpsValue.textContent = text;
    }
  }

  fillFpsBuffer() {
    const now = performance.now();
    const frameTime = now - this.lastFrame;
    this.lastFrame = now;
    if (frameTime > 0) {
      this.frameTimes[this.frameIndex] = frameTime;
      this.frameIndex = (this.frameIndex + 1) % this.frameTimes.length;
      this.frameCount = Math.min(this.frameCount + 1, this.frameTimes.length);
    }
  }

  dispose() {
    this.unsubscribeState?.();
    this.unsubscribeCamera?.();
    this.unsubscribeDayNight?.();
    this.unsubscribeState = null;
    this.unsubscribeCamera = null;
    this.unsubscribeDayNight = null;
    this.cameraButton.removeEventListener('click', this.cameraClick);
    this.pauseButton.removeEventListener('click', this.pauseClick);
    this.dayNightButton.removeEventListener('click', this.dayNightClick);
    this.minimap.dispose();
    this.root.remove();
  }
}
