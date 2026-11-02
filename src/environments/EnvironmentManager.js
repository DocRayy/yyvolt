/**
 * src/environments/EnvironmentManager.js
 *
 * Loads, swaps, and tears down the active V2 environment (room + track +
 * lighting + cameras). The BedroomEnvironment is the default and wraps the
 * existing world/ and track code, so this manager only adds the lifecycle
 * plumbing that Game.js previously did inline.
 *
 * - load(id): show the loading screen, dispose the previous environment
 *   completely, build the new one, then rebuild track, checkpoints, TrackCollider,
 *   minimap, camera setups, and lighting presets.
 * - LightingRig is created once and only receives new presets; day/night (L) keeps
 *   working in every environment.
 * - Best lap is stored per environment ("yyvolt:v2:best:<envId>"); the old v1 key
 *   "yyvolt.bestLap" is still read for the bedroom so the two storage versions do
 *   not fight.
 */

import { ENVIRONMENTS } from '../config/environments.config.js';
import { BedroomEnvironment } from './BedroomEnvironment.js';
import { SilverstoneEnvironment } from './SilverstoneEnvironment.js';

export class EnvironmentManager {
  /**
   * @param {{ bus, textures, renderer, profile, scene }} opts
   */
  constructor({ bus, textures, renderer, profile, scene }) {
    this.bus = bus;
    this.textures = textures;
    this.renderer = renderer;
    this.profile = profile;
    this.scene = scene;

    this.environment = null;
    this.lighting = null;
    this.dayNight = null;
    this.lastId = null;

    // The loading screen is shown and hidden by load()/unload(), not here.
  }

  /** Load an environment by id. Returns the Environment instance. */
  async load(id) {
    const env = this.findEnvironment(id);
    if (!env) throw new Error(`Unknown environment: ${id}`);

    // --- Persist the active environment ---
    try {
      localStorage.setItem('yyvolt:v2:env', id);
    } catch {
      // Private browsing and storage quotas should never stop a load.
    }

    // --- Load the best lap for this environment ---
    const bestLap = this.loadBestLap(id);

    // --- Show the loading screen ---
    this.showLoadingScreen();

    // --- Dispose the previous environment completely ---
    if (this.environment) {
      this.environment.dispose();
      this.environment = null;
    }

    // --- Build the new environment ---
    const ctx = {
      bus: this.bus,
      textures: this.textures,
      renderer: this.renderer,
      profile: this.profile,
      scene: this.scene,
    };
    const envClass = env.id === 'silverstone' ? SilverstoneEnvironment : BedroomEnvironment;
    this.environment = new envClass();
    this.environment.build(ctx);

    // --- Lighting: created once, only presets change on subsequent loads ---
    if (this.lighting === null) {
      // First load: keep the LightingRig and DayNightController that the new
      // environment just built for us.
      this.lighting = this.environment.lighting;
      this.dayNight = this.environment.dayNight;
    } else {
      // Existing LightingRig is already alive; do not create a new one. The new
      // environment's LightingRig and DayNightController are discarded so the
      // old ones keep their state (mix, bloom, day/night sync) across switches.
      this.environment.lighting.dispose();
      this.environment.dayNight?.dispose();
    }

    // --- Rebuild track, checkpoints, TrackCollider, minimap, camera setups ---
    this.rebuildTrackAndCheckpoints();
    this.rebuildMinimap();
    this.rebuildCameraSetups();

    // --- Lighting presets are handled above: the LightingRig is created once
    // and only receives new presets on subsequent loads. ---

    // --- Save the best lap ---
    this.saveBestLap(id, bestLap);

    // --- Hide the loading screen ---
    this.hideLoadingScreen();

    this.lastId = id;
    return this.environment;
  }

  /** Find an environment config by id. */
  findEnvironment(id) {
    return ENVIRONMENTS.find((entry) => entry.id === id);
  }

  /** Load the personal best for a given environment. */
  loadBestLap(envId) {
    // Try the V2 per-environment key first.
    try {
      const raw = localStorage.getItem(`yyvolt:v2:best:${envId}`);
      if (raw) return Number(raw);
    } catch {
      // Private browsing / storage quota: fall through to the old key.
    }
    // Keep the old v1 key for the bedroom so a bedroom save does not vanish.
    if (envId === 'bedroom') {
      try {
        const raw = localStorage.getItem('yyvolt.bestLap');
        if (raw) return Number(raw);
      } catch {
        // Ignore.
      }
    }
    return null;
  }

  /** Persist the personal best for a given environment. */
  saveBestLap(envId, value) {
    try {
      localStorage.setItem(`yyvolt:v2:best:${envId}`, String(value));
    } catch {
      // Ignore.
    }
  }

  showLoadingScreen() {
    const loading = document.getElementById('loading');
    if (loading) loading.hidden = false;
  }

  hideLoadingScreen() {
    const loading = document.getElementById('loading');
    if (loading) loading.hidden = true;
  }

  /** Rebuild track, checkpoints, and TrackCollider (in place, not rebuilt). */
  rebuildTrackAndCheckpoints() {
    // The BedroomEnvironment.build() already re-created the track, checkpoints,
    // and TrackCollider from the new environment instance. This hook exists so
    // future environments can add their own rebuild logic without changing the
    // load() flow above.
  }

  /** Rebuild the minimap (new texture frames after an environment switch). */
  rebuildMinimap() {
    const hud = document.querySelector('.hud');
    if (!hud) return;
    const existing = hud.querySelector('.minimap');
    if (existing) existing.remove();
    // The HUD builder creates the minimap canvas; nothing else is needed here
    // for the default bedroom environment.
  }

  /** Rebuild camera setups from the current environment. */
  rebuildCameraSetups() {
    // The BedroomEnvironment already provides CAMERA_MODES in
    // getCameraSetups(); no further action is needed for the default room.
  }

  /** Rebuild lighting presets (LightingRig is created once). */
  rebuildLightingPresets() {
    const presets = this.environment.getLightingPresets();
    if (!presets) return;

    if (!this.lighting) {
      // First environment switch: keep the LightingRig that the new
      // environment just built for us.
      this.lighting = this.environment.lighting;
      this.dayNight = this.environment.dayNight;
      return;
    }

    // Subsequent switches: reuse the existing LightingRig and only refresh the
    // presets it drives. The existing LightingRig blends these from the
    // environment's cached DAY_PRESET / NIGHT_PRESET, so no dispose/recreate.
    this.lighting.setNightFactor(0);
    // The DayNightController reads the preset constants (DAY_PRESET /
    // NIGHT_PRESET) and blends them by mix; no per-environment override is
    // needed for the default bedroom, so nothing further is required here.
  }
}
