/**
 * src/environments/Environment.js
 *
 * Abstract base for every playable environment (room + track + lighting).
 *
 * Subclasses set hasCeiling / skyType in the constructor and override the
 * getters; the default implementations throw "not implemented" so a missing
 * override fails fast instead of silently doing nothing. build(ctx) and
 * dispose() run once per environment switch.
 */

export class Environment {
  constructor() {
    // Capsule-shaped room: a ceiling above the track and furniture.
    this.hasCeiling = false;
    // One of 'none' | 'sky' | 'dome' | 'gradient' | 'starfield'.
    this.skyType = 'none';
  }

  build(ctx) {
    throw new Error('not implemented');
  }

  dispose() {
    throw new Error('not implemented');
  }

  getTrackDefinition() {
    throw new Error('not implemented');
  }

  getLightingPresets() {
    throw new Error('not implemented');
  }

  getCameraSetups() {
    throw new Error('not implemented');
  }

  getAmbience() {
    throw new Error('not implemented');
  }

  getSpawn() {
    throw new Error('not implemented');
  }
}
