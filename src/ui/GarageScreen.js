/**
 * src/ui/GarageScreen.js
 *
 * The player-car garage: opened from the main menu ("Garage"). The selected
 * car sits on a slow turntable in the scene, with plain text tabs (F3 / F2 /
 * F1), flat thin stat bars (Top speed, Acceleration, Handling, Boost) and a
 * row of 8 flat square colour swatches. "Select" saves { type, colour } to
 * localStorage "yyvolt:v2:car".
 *
 * UI follows the global hard rules: solid navy panels, plain sentence-case
 * copy, no gradients or chrome, safe area and clamp()-based sizing.
 *
 * The 3D turntable lives in the scene (it is a Group added to this.scene).
 * The DOM overlay provides the controls; the preview label marks where the
 * model sits in the 3D view.
 */

import { CarFactory } from '../car/CarFactory.js';
import { CARS } from '../config/cars.config.js';
import { COLORS } from '../config/colors.config.js';

const MARKUP = `
  <div class="garage" role="dialog" aria-modal="true" aria-labelledby="garage-title">
    <header class="garage__head">
      <h1 class="garage__title" id="garage-title">Garage</h1>
      <button class="garage__back" type="button" data-back>Back</button>
    </header>

    <div class="garage__body">
      <!-- Preview: the selected car on a slow turntable (3D in the scene). -->
      <section class="garage__preview">
        <span class="garage__preview-label">Selected car</span>
        <div class="garage__turntable" data-turntable></div>
        <p class="garage__note">Turntable rotates slowly. Drag to rotate if needed.</p>
      </section>

      <!-- Controls -->
      <div class="garage__controls">
        <div class="garage__tabs" role="tablist">
          <button type="button" class="garage__tab" data-car="F1">F1</button>
          <button type="button" class="garage__tab" data-car="F2">F2</button>
          <button type="button" class="garage__tab" data-car="F3">F3</button>
        </div>

        <div class="garage__stats">
          <div class="garage__stat">
            <span class="garage__stat-label">Top speed</span>
            <div class="garage__bar"><span class="garage__bar-fill" data-bar-top></span></div>
            <span class="garage__stat-value" data-value-top>1.00</span>
          </div>
          <div class="garage__stat">
            <span class="garage__stat-label">Acceleration</span>
            <div class="garage__bar"><span class="garage__bar-fill" data-bar-accel></span></div>
            <span class="garage__stat-value" data-value-accel>1.00</span>
          </div>
          <div class="garage__stat">
            <span class="garage__stat-label">Handling</span>
            <div class="garage__bar"><span class="garage__bar-fill" data-bar-handling></span></div>
            <span class="garage__stat-value" data-value-handling>1.00</span>
          </div>
          <div class="garage__stat">
            <span class="garage__stat-label">Boost</span>
            <div class="garage__bar"><span class="garage__bar-fill" data-bar-boost></span></div>
            <span class="garage__stat-value" data-value-boost>1.00</span>
          </div>
        </div>

        <div class="garage__colors">
          <span class="garage__color-label">Colour</span>
          <div class="garage__swatches" data-swatches></div>
        </div>

        <button class="garage__select" type="button" data-select>Select</button>
      </div>
    </div>
  </div>
`;


export class GarageScreen {
  /** @param {{ bus: import('../../core/EventBus.js').EventBus, car: import('../../car/ToyF1Car.js').ToyF1Car, scene: THREE.Scene, textures: import('../../world/TextureFactory.js').TextureFactory, touch?: boolean }} opts */
  constructor({ bus, car, scene, textures, touch = false } = {}) {
    if (!bus) throw new Error('GarageScreen needs an EventBus.');
    if (!scene) throw new Error('GarageScreen needs a scene.');
    if (!textures) throw new Error('GarageScreen needs textures.');

    this.bus = bus;
    this.car = car;
    this.textures = textures;
    this.scene = scene;
    this.isTouch = Boolean(touch);
    this.visible = false;

    // The selected car type and colour (default F1 + yellow).
    this.typeId = 'F1';
    this.colorId = 'yellow';

    // The 3D car model on a slow turntable.
    this.turntable = new THREE.Group();
    this.turntable.name = 'Garage turntable';
    this.turntable.rotation.order = 'YXZ';
    this.turntable.add(this.createModel(this.typeId, this.colorId).group);
    this.scene.add(this.turntable);

    // The DOM overlay with the controls.
    this.root = document.createElement('div');
    this.root.className = 'garage';
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'garage-title');
    this.root.inert = true;
    this.root.innerHTML = MARKUP;

    this.backButton = this.root.querySelector('[data-back]');
    this.previewLabel = this.root.querySelector('.garage__preview-label');
    this.turntableEl = this.root.querySelector('[data-turntable]');
    this.tabButtons = Array.from(this.root.querySelectorAll('[data-car]'));
    this.barTop = this.root.querySelector('[data-bar-top]');
    this.barAccel = this.root.querySelector('[data-bar-accel]');
    this.barHandling = this.root.querySelector('[data-bar-handling]');
    this.barBoost = this.root.querySelector('[data-bar-boost]');
    this.valueTop = this.root.querySelector('[data-value-top]');
    this.valueAccel = this.root.querySelector('[data-value-accel]');
    this.valueHandling = this.root.querySelector('[data-value-handling]');
    this.valueBoost = this.root.querySelector('[data-value-boost]');
    this.swatchButtons = [];
    this.swatchesWrap = this.root.querySelector('[data-swatches]');
    this.selectButton = this.root.querySelector('[data-select]');

    // Build the colour swatches.
    for (const colour of COLORS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'garage__swatch';
      button.dataset.colour = colour.id;
      button.style.background = colour.hex;
      button.setAttribute('aria-label', `${colour.name} colour`);
      this.swatchesWrap.appendChild(button);
      this.swatchButtons.push(button);
    }

    // Let the saved car config drive the initial view.
    this.refreshFromSaved();

    // Event handling.
    this.backClick = () => this.hide();
    this.backButton.addEventListener('click', this.backClick);
    this.tabButtons.forEach((button) => {
      button.addEventListener('click', () => this.setCar(button.dataset.car));
    });
    this.selectButton.addEventListener('click', () => this.select());

    document.body.append(this.root);

    // The preview is the 3D turntable in the scene, not the DOM.
    this.turntableEl.style.background = 'none';
    this.turntableEl.style.border = 'none';
    this.turntableEl.innerHTML = '';
  }

  /** Open the panel on top of the current screen. */
  show() {
    if (this.visible) return;
    this.visible = true;
    this.visibilize(true);
    this.refreshStats();
    if (this.backButton) this.backButton.focus({ preventScroll: true });
  }

  /** Close the panel and return focus to the screen behind it. */
  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.root.inert = true;
    this.root.classList.remove('is-visible');
    this.root.setAttribute('aria-hidden', 'true');
    if (this.root.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  /** Shared visibility wiring; the panel is gated to a single open state. */
  visibilize(visible) {
    this.root.inert = !visible;
    this.root.classList.toggle('is-visible', visible);
    this.root.setAttribute('aria-hidden', String(!visible));
  }

  /** Dispose the screen and free the model and turntable. */
  dispose() {
    this.backButton.removeEventListener('click', this.backClick);
    this.tabButtons.forEach((button) => {
      button.removeEventListener('click', () => this.setCar(button.dataset.car));
    });
    this.selectButton.removeEventListener('click', this.select.bind(this));
    this.root.remove();
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    if (this.turntable) {
      this.scene.remove(this.turntable);
      this.turntable = null;
    }
  }

  /** Rotate the slow turntable every frame. */
  update(dt) {
    if (dt <= 0) return;
    // A slow, deliberate turn: 0.4 rad/s, frame-rate independent.
    this.turntable.rotation.y += dt * 0.4;
  }

  /** Create the model for a class, reusing the same factory as the game. */
  createModel(typeId, colourId) {
    return new CarFactory(this.textures).create(typeId, colourId);
  }

  /** Switch to a different car class, disposing the old model. */
  setCar(carId) {
    if (carId === this.typeId) return;
    this.typeId = carId;
    if (this.model) {
      this.model.dispose();
    }
    if (this.turntable) {
      this.scene.remove(this.turntable);
    }
    this.model = this.createModel(this.typeId, this.colorId);
    this.turntable.clear();
    this.turntable.add(this.model.group);
    this.scene.add(this.turntable);
    this.refreshStats();
    this.refreshSwatches();
  }

  /** Change the car colour; the model swaps materials in place. */
  setColour(colourId) {
    this.colorId = colourId;
    if (this.model) {
      const colour = COLORS[colourId];
      if (colour) this.model.setColor(colour.hex);
    }
    this.refreshSwatches();
  }

  /** Persist the selection and hand the new car to the game. */
  select() {
    try {
      localStorage.setItem('yyvolt:v2:car', JSON.stringify({ type: this.typeId, colour: this.colorId }));
    } catch {
      // Storage can be full or blocked (private mode). The fallback defaults keep
      // the game playable; a failed save is non-fatal.
    }
    // Tell the game to switch the car now.
    this.bus.emit('garage:select', { type: this.typeId, colour: this.colorId });
    this.hide();
  }

  /** Copy the saved {type, colour} into the preview model and UI. */
  refreshFromSaved() {
    try {
      const raw = localStorage.getItem('yyvolt:v2:car');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.type === 'string' && typeof parsed.colour === 'string') {
          this.typeId = parsed.type;
          this.colorId = parsed.colour;
        }
      }
    } catch {
      // Missing or corrupt save falls back to defaults.
    }
    if (this.model) {
      this.model.dispose();
    }
    this.model = this.createModel(this.typeId, this.colorId);
    this.turntable.clear();
    this.turntable.add(this.model.group);
    this.scene.add(this.turntable);
    this.setColour(this.colorId);
  }

  /** Fill the stat bars from the car class multipliers. */
  refreshStats() {
    const car = CARS[this.typeId] ?? CARS.F1;
    this.valueTop.textContent = car.maxSpeed.toFixed(2);
    this.valueAccel.textContent = car.accel.toFixed(2);
    this.valueHandling.textContent = car.steer.toFixed(2);
    this.valueBoost.textContent = car.boost.toFixed(2);
    this.barTop.style.width = `${(car.maxSpeed * 100).toFixed(1)}%`;
    this.barAccel.style.width = `${(car.accel * 100).toFixed(1)}%`;
    this.barHandling.style.width = `${(car.steer * 100).toFixed(1)}%`;
    this.barBoost.style.width = `${(car.boost * 100).toFixed(1)}%`;
  }

  refreshSwatches() {
    this.swatchButtons.forEach((button) => {
      button.classList.toggle('is-active', button.dataset.colour === this.colorId);
    });
  }
}
