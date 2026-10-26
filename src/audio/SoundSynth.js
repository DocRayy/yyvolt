/**
 * Procedural sound source for the game.
 *
 * Every sound is built from oscillators and a shared white-noise buffer, so the
 * project stays asset-free. One-shots open and close their own short gain
 * envelope; the engine and tyre layers return small controllers whose
 * parameters are only ever smoothed, never stepped, to avoid clicks.
 */
import { AUDIO } from '../config/audio.config.js';
import { clamp } from '../utils/math.js';

export class SoundSynth {
  constructor({ context, output }) {
    if (!context || !output) {
      throw new Error('SoundSynth needs an AudioContext and an output node.');
    }

    this.context = context;
    this.output = output;
    this.noiseBuffer = this.createNoiseBuffer(2);
  }

  now() {
    return this.context.currentTime;
  }

  createNoiseBuffer(seconds) {
    const length = Math.floor(this.context.sampleRate * seconds);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    // A little smoothing turns harsh white noise into a softer hiss; it is
    // cheap, deterministic enough for ambience, and works for tyres and hats.
    let previous = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * 0.35 + white * 0.65;
      data[i] = previous;
    }
    return buffer;
  }

  /**
   * Exponential attack/decay envelope. The 0.0001 floor is Web Audio's
   * required non-zero target for exponential ramps.
   */
  applyEnvelope(param, start, peak, duration, attack, release) {
    const attackTime = Math.min(attack, duration * 0.4);
    const releaseTime = Math.min(release, duration * 0.4);
    const end = start + duration;
    const safePeak = Math.max(peak, 0.0001);

    param.setValueAtTime(0.0001, start);
    param.exponentialRampToValueAtTime(safePeak, start + attackTime);
    param.setValueAtTime(safePeak, end - releaseTime);
    param.exponentialRampToValueAtTime(0.0001, end);
  }

  tone(
    frequency,
    start,
    duration,
    {
      type = 'sine',
      gain = 0.05,
      attack = 0.008,
      release = 0.06,
      endFrequency = null,
    } = {},
  ) {
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    if (endFrequency !== null) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(1, endFrequency),
        start + duration,
      );
    }

    this.applyEnvelope(envelope.gain, start, gain, duration, attack, release);
    oscillator.connect(envelope);
    envelope.connect(this.output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  noiseBurst(
    start,
    duration,
    {
      type = 'bandpass',
      frequency = 1000,
      endFrequency = null,
      q = 1,
      gain = 0.06,
      attack = 0.006,
      release = 0.08,
    } = {},
  ) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (endFrequency !== null) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, endFrequency),
        start + duration,
      );
    }

    this.applyEnvelope(envelope.gain, start, gain, duration, attack, release);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.output);
    source.start(start, Math.random() * 0.7);
    source.stop(start + duration + 0.03);
  }

  arpeggio(frequencies, start, spacing, duration, gain, type = 'triangle') {
    frequencies.forEach((frequency, index) => {
      this.tone(frequency, start + index * spacing, duration, {
        type,
        gain,
        release: 0.08,
      });
    });
  }

  click() {
    this.tone(1250, this.now(), 0.035, {
      type: 'triangle',
      gain: 0.022,
      release: 0.02,
    });
  }

  checkpoint(index = 0) {
    const t = this.now();
    const base = 760 + Math.min(index, 7) * 32;
    this.tone(base, t, 0.07, { gain: 0.045, release: 0.04 });
    this.tone(base * 1.5, t + 0.055, 0.09, { gain: 0.035, release: 0.05 });
  }

  lap() {
    this.arpeggio([523.25, 659.25, 783.99, 1046.5], this.now(), 0.1, 0.2, 0.05);
  }

  pickup(kind) {
    const notes =
      kind === 'nitro'
        ? [440, 554.37, 659.25]
        : [659.25, 987.77, 1318.51];
    this.arpeggio(notes, this.now(), 0.06, 0.15, 0.042);
  }

  collision(strength = 1) {
    const amount = clamp(Number.isFinite(strength) ? strength : 1, 0.15, 1.4);
    const t = this.now();
    this.tone(108, t, 0.24, {
      type: 'sine',
      gain: 0.16 * amount,
      endFrequency: 38,
      release: 0.1,
    });
    this.noiseBurst(t, 0.14, {
      type: 'lowpass',
      frequency: 420,
      gain: 0.075 * amount,
      q: 0.7,
      release: 0.08,
    });
  }

  boost() {
    const t = this.now();
    this.noiseBurst(t, 0.45, {
      type: 'bandpass',
      frequency: 480,
      endFrequency: 2400,
      gain: 0.08,
      q: 1.1,
      attack: 0.03,
      release: 0.26,
    });
    this.tone(150, t, 0.2, {
      type: 'sawtooth',
      gain: 0.028,
      endFrequency: 92,
      release: 0.1,
    });
  }

  startLight() {
    const t = this.now();
    this.tone(700, t, 0.12, {
      type: 'square',
      gain: 0.038,
      release: 0.05,
    });
    this.tone(1400, t, 0.07, {
      type: 'sine',
      gain: 0.012,
      release: 0.04,
    });
  }

  go() {
    const t = this.now();
    this.tone(990, t, 0.4, {
      type: 'square',
      gain: 0.052,
      release: 0.18,
    });
    this.tone(1485, t, 0.34, {
      type: 'sine',
      gain: 0.025,
      release: 0.16,
    });
  }

  /** Continuous engine layer: two detuned saws through a speed-following filter. */
  createEngine() {
    const ctx = this.context;
    const settings = AUDIO.engine;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const first = ctx.createOscillator();
    const second = ctx.createOscillator();

    gain.gain.value = 0;
    filter.type = 'lowpass';
    filter.frequency.value = settings.cutoffMin;
    filter.Q.value = 1.15;

    first.type = 'sawtooth';
    first.frequency.value = settings.idleHz;
    first.detune.value = -settings.detune;
    second.type = 'sawtooth';
    second.frequency.value = settings.idleHz;
    second.detune.value = settings.detune;

    first.connect(filter);
    second.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    first.start();
    second.start();

    return {
      set(speedRatio, throttle, boost, active) {
        const t = ctx.currentTime;
        const smoothing = settings.smoothing;
        const frequency =
          settings.idleHz +
          clamp(speedRatio, 0, 1.2) * (settings.maxHz - settings.idleHz) +
          boost * 18;
        const cutoff =
          settings.cutoffMin +
          clamp(speedRatio, 0, 1.2) *
            (settings.cutoffMax - settings.cutoffMin) +
          throttle * 380 +
          boost * 420;
        const level = active
          ? settings.gain * (0.55 + speedRatio * 0.6 + throttle * 0.28) +
            boost * settings.boostGain
          : 0;

        first.frequency.setTargetAtTime(frequency, t, smoothing);
        second.frequency.setTargetAtTime(frequency, t, smoothing);
        filter.frequency.setTargetAtTime(cutoff, t, smoothing);
        gain.gain.setTargetAtTime(level, t, 0.1);
      },

      dispose() {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0, t, 0.04);
        first.stop(t + 0.25);
        second.stop(t + 0.25);
      },
    };
  }

  /** Continuous tyre layer: looping noise through a band-pass hiss. */
  createSkid() {
    const ctx = this.context;
    const settings = AUDIO.skid;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = this.noiseBuffer;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = settings.filterMin;
    filter.Q.value = settings.q;
    gain.gain.value = 0;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);
    source.start();

    return {
      set(amount) {
        const t = ctx.currentTime;
        const level = clamp(amount, 0, 1);
        gain.gain.setTargetAtTime(level * settings.gain, t, 0.06);
        filter.frequency.setTargetAtTime(
          settings.filterMin + level * (settings.filterMax - settings.filterMin),
          t,
          0.08,
        );
      },

      dispose() {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setTargetAtTime(0, t, 0.04);
        source.stop(t + 0.15);
      },
    };
  }
}
