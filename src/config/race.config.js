/**
 * Race format, start-light choreography, and HUD readout tuning.
 *
 * The lap count lives here because both LapTimer and the timing tower need the
 * same number. Start-light timings are deliberately gathered in one place so the
 * visible lamps and the synthesized beeps can never drift apart.
 */
export const RACE = Object.freeze({
  laps: 3,

  countdown: Object.freeze({
    lightCount: 5,
    // A short pause after the menu disappears lets the player settle before
    // the first red lamp. The gap between lamps is the F1 rhythm.
    firstLightDelay: 0.45,
    lightInterval: 0.62,
    // The hold after the fifth lamp is intentionally variable, like a real
    // start, but stays inside a fair window for a keyboard player.
    lightsOutMin: 0.65,
    lightsOutMax: 1.15,
    hideDelay: 0.18,
  }),

  hud: Object.freeze({
    // The car's top speed is 7.2 world units/s. At 18 km/h per unit the
    // readout lands around 130 km/h, which reads like a toy F1 car without
    // pretending the room is a full-size circuit.
    speedScale: 18,
    timingUpdateHz: 30,
    minimapUpdateHz: 30,
    minimap: Object.freeze({
      samples: 180,
      paddingRatio: 0.1,
      lineWidthRatio: 0.028,
      carSizeRatio: 0.085,
      minPaddingPx: 6,
      minLineWidthPx: 2,
      minCarSizePx: 6,
    }),
  }),

  storage: Object.freeze({
    bestLapKey: 'yyvolt.bestLap',
  }),
});
