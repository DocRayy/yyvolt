/**
 * Settings core for V2.
 *
 * Single source of truth for the player's preferences. Values are resolved
 * from localStorage on construction, validated into a safe range, and
 * persisted on every change. Every mutation emits "settings:changed" with the
 * full settings object so UI and modules can react without sharing code.
 *
 * Storage is always wrapped in try/catch and never blocks the game: a missing,
 * unreadable, or corrupted slot falls back to the safe defaults.
 */
import { EventBus } from './EventBus.js';

/** localStorage key, versioned under the V2 namespace. */
export const STORAGE_KEY = 'yyvolt:v2:settings';

/** Safe defaults when the slot is empty, corrupted, or unavailable. */
export const DEFAULT_SETTINGS = Object.freeze({
  controlScheme: 'wheel', // wheel | buttons | tilt (touch only)
  steeringSensitivity: 1, // 0.6 to 1.4
  vibration: true, // haptics
  music: true, // background music
  effectsVolume: 1, // 0 to 1
  quality: 'auto', // auto | low | medium | high
  showFps: false, // overclock the HUD FPS readout
});

/** Bound value into [min, max], or the fallback when it is unusable. */
const NUMBER = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
};

const BOOLEAN = (value) => Boolean(value);

const VALID = (value, list) => (list.includes(value) ? value : list[0]);

export class Settings {
  constructor(bus) {
    if (!bus) throw new Error('Settings needs an EventBus.');
    this.bus = bus;
    this.data = { ...DEFAULT_SETTINGS };

    // Load once, at construction, so UI and modules can read it before any
    // state is simulated. Failures are silent and fall back to defaults.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          this.data = { ...DEFAULT_SETTINGS, ...parsed };
        } catch {
          // Corrupted save: fall back to defaults below.
        }
      }
    } catch {
      // Storage unavailable (private mode, file://, SSR): keep defaults.
    }

    this.data = this.normalize(this.data);
    this.save();
  }

  /** Return a copy of the current settings. */
  get() {
    return { ...this.data };
  }

  /** Set one field, persist, and notify every listener. */
  set(field, value) {
    if (field === null || field === undefined) return;
    const next = { ...this.data, [field]: value };
    this.data = this.normalize(next);
    this.save();
    this.emit();
  }

  /**
   * Replace the whole object. Used when several fields change at once.
   * Keeps the object shape validated and consistent.
   */
  replace(next) {
    this.data = this.normalize(next);
    this.save();
    this.emit();
  }

  normalize(data) {
    return {
      controlScheme: VALID(data.controlScheme, ['wheel', 'buttons', 'tilt']),
      steeringSensitivity: NUMBER(data.steeringSensitivity, 0.6, 1.4, 1),
      vibration: BOOLEAN(data.vibration),
      music: BOOLEAN(data.music),
      effectsVolume: NUMBER(data.effectsVolume, 0, 1, 1),
      quality: VALID(data.quality, ['auto', 'low', 'medium', 'high']),
      showFps: BOOLEAN(data.showFps),
    };
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // Storage may be unavailable or full; keep the in-memory value.
    }
  }

  emit() {
    this.bus.emit('settings:changed', { ...this.data });
  }
}
