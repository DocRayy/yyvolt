import { CarModel } from './models/F1Model.js';
import { F2Model } from './models/F2Model.js';
import { F3Model } from './models/F3Model.js';

const CAR_CONFIG_KEY = 'yyvolt:v2:car';

/**
 * Read the saved {type, color} for the player car. Never throws: on a missing
 * or corrupt save it falls back to the default (F1 + yellow).
 */
export function loadCarConfig() {
  try {
    const raw = localStorage.getItem(CAR_CONFIG_KEY);
    if (!raw) return { type: 'F1', color: 'yellow' };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === 'string' && typeof parsed.color === 'string') {
      return { type: parsed.type, color: parsed.color };
    }
    return { type: 'F1', color: 'yellow' };
  } catch {
    return { type: 'F1', color: 'yellow' };
  }
}

/**
 * Write the saved {type, color} for the player car. Never throws; a failed
 * persistence is non-fatal and the defaults still work.
 */
export function saveCarConfig({ type, color }) {
  try {
    localStorage.setItem(CAR_CONFIG_KEY, JSON.stringify({ type, color }));
  } catch {
    // Storage can be full or blocked (private mode). The fallback defaults keep
    // the game playable; a failed save is non-fatal.
  }
}

/**
 * Builds the visual model for a car class.
 *
 * V2-3: every classId currently resolves to the shared F1 model; F2/F3 models
 * swap in later by returning a different builder. The returned instance
 * exposes the stable interface the camera, the physics layer, and the garage
 * read, so those consumers never know which class they own.
 *
 * @param {string} typeId - F1 | F2 | F3 (F2/F3 resolve to F1 for now)
 * @param {string} colorId - key into the 8-color palette
 * @returns {F1Model}
 */
export class CarFactory {
  constructor(textures) {
    this.textures = textures;
  }

  create(typeId, colorId) {
    // F2 and F3 keep the same material language and interface as the F1; the
    // only differences are the geometry tweaks (wings, body, scales) made in
    // each model file.
    const ModelClass = typeId === 'F2' ? F2Model
      : typeId === 'F3' ? F3Model
      : CarModel;
    const model = new ModelClass(this.textures, { headlightCount: undefined });

    // Surface the V2-3 interface contract as direct properties on the model so
    // the camera, the physics layer, and the garage read identical values for
    // every class.
    model.cockpitEye = model.mounts.cockpitEye;
    model.tcam = model.mounts.tcam;
    model.nose = model.mounts.nose;
    model.wheelCam = model.mounts.wheelCam;
    model.taillights = model.taillights;

    return model;
  }
}
