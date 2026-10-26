/**
 * Audio levels, fades, and synthesis tuning.
 *
 * The mix is intentionally conservative: the engine should sit under the HUD,
 * music under the engine, and ambience under everything except the very quiet
 * room tone. One-shots are short and peak-limited so a boost + collision + lap
 * jingle at the same time still has headroom through the master compressor.
 */
export const AUDIO = Object.freeze({
  masterVolume: 0.72,
  sfxVolume: 0.9,
  musicVolume: 0.34,
  ambienceVolume: 0.65,

  fade: Object.freeze({
    mute: 0.12,
    music: 0.45,
    engine: 0.2,
    ambience: 1.5,
  }),

  compressor: Object.freeze({
    threshold: -16,
    knee: 10,
    ratio: 4,
    attack: 0.004,
    release: 0.22,
  }),

  engine: Object.freeze({
    idleHz: 54,
    maxHz: 248,
    detune: 8,
    cutoffMin: 430,
    cutoffMax: 2500,
    gain: 0.12,
    boostGain: 0.035,
    smoothing: 0.07,
  }),

  skid: Object.freeze({
    threshold: 0.35,
    span: 1.15,
    gain: 0.065,
    filterMin: 680,
    filterMax: 2100,
    q: 0.85,
  }),

  music: Object.freeze({
    bpm: 78,
    lookahead: 0.12,
    lowpass: 3200,
    padGain: 0.022,
    bassGain: 0.045,
    kickGain: 0.12,
    snareGain: 0.032,
    hatGain: 0.012,
  }),

  ambience: Object.freeze({
    dayNoise: 0.03,
    nightNoise: 0.026,
    nightHum: 0.008,
    cricket: 0.012,
    cricketMinDelay: 1.2,
    cricketMaxDelay: 3.1,
    chirpLookahead: 0.15,
  }),
});
