/**
 * Touch steering, tilt, and haptic tuning.
 *
 * The CSS owns the physical size and spacing of the on-screen pads. These
 * numbers are the parts that affect feel: how far the phone must tilt, how much
 * a collision buzzes, and how long a permission prompt may wait for a first
 * orientation sample before the game explains that tilt is unavailable.
 */
export const TOUCH = Object.freeze({
  tilt: Object.freeze({
    // Full steering lock is reached after this much movement from the neutral
    // position captured when tilt is enabled or the race resumes.
    rangeDegrees: 18,
    deadzoneDegrees: 2.5,
    // Device orientation arrives at roughly the display refresh rate. This
    // low-pass removes sensor jitter without delaying the car noticeably.
    smoothing: 0.22,
    // iOS requires a tap to ask for permission. If the sensor never answers,
    // the settings row should stop pretending tilt is available.
    startTimeoutMs: 1600,
    // Flip if a particular device reports the screen-horizontal axis backwards.
    invert: false,
  }),

  vibration: Object.freeze({
    boostMs: 16,
    collisionMinMs: 8,
    collisionMaxMs: 34,
    // ToyF1Car emits strength in the 0 to 1.4 range (impact / max speed).
    collisionStrengthMax: 1.4,
    cooldownMs: 70,
    toggleMs: 12,
  }),
});
