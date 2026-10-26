/**
 * Lo-fi background loop with a look-ahead scheduler.
 *
 * A 78 BPM, four-bar progression: Fmaj7, Am7, Dm7, G7. Pads, a soft bass,
 * brushed snare, kick, and quiet hats are all synthesized. Scheduling notes a
 * fraction of a second ahead keeps musical time independent of render timing
 * while still pausing cleanly when the game loop stops.
 */
import { AUDIO } from '../config/audio.config.js';

const STEPS_PER_BAR = 16;
const BARS = 4;
const LOOP_STEPS = STEPS_PER_BAR * BARS;
const CHORDS = Object.freeze([
  { pad: [53, 57, 60, 64], bass: 41 },
  { pad: [57, 60, 64, 67], bass: 45 },
  { pad: [50, 53, 57, 60], bass: 38 },
  { pad: [55, 59, 62, 65], bass: 43 },
]);

function midiToHz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class MusicLoop {
  constructor({ context, output, noiseBuffer, enabled = true }) {
    if (!context || !output || !noiseBuffer) {
      throw new Error('MusicLoop needs a context, output, and noise buffer.');
    }

    this.context = context;
    this.output = output;
    this.noiseBuffer = noiseBuffer;
    this.enabled = enabled;
    this.stepDuration = 60 / AUDIO.music.bpm / 4;
    this.barDuration = this.stepDuration * STEPS_PER_BAR;
    this.step = 0;
    this.nextTime = context.currentTime + 0.1;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) return;

    // Re-enter at a clean boundary instead of dumping missed steps into the
    // current buffer after a pause or a long disabled stretch.
    this.step = 0;
    this.nextTime = this.context.currentTime + 0.06;
  }

  update() {
    if (!this.enabled) return;

    const now = this.context.currentTime;
    if (this.nextTime < now - 0.25) {
      this.nextTime = now + 0.05;
      this.step = 0;
    }

    const horizon = now + AUDIO.music.lookahead;
    while (this.nextTime < horizon) {
      this.scheduleStep(this.step, this.nextTime);
      this.nextTime += this.stepDuration;
      this.step = (this.step + 1) % LOOP_STEPS;
    }
  }

  scheduleStep(step, start) {
    const bar = Math.floor(step / STEPS_PER_BAR) % BARS;
    const local = step % STEPS_PER_BAR;

    if (local === 0) this.pad(bar, start);
    if (local === 0 || local === 8) this.bass(CHORDS[bar].bass, start);
    if (local === 0 || local === 8) this.kick(start);
    if (local === 4 || local === 12) this.snare(start);
    if (local % 2 === 0) {
      this.hat(start, local % 4 === 0 ? 1 : 0.6);
    }
  }

  pad(bar, start) {
    const ctx = this.context;
    const chord = CHORDS[bar];
    const duration = this.barDuration;
    const filter = ctx.createBiquadFilter();
    const bus = ctx.createGain();

    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    filter.Q.value = 0.4;
    bus.gain.setValueAtTime(0.0001, start);
    bus.gain.linearRampToValueAtTime(
      AUDIO.music.padGain,
      start + 0.42,
    );
    bus.gain.setValueAtTime(
      AUDIO.music.padGain,
      start + duration - 0.7,
    );
    bus.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    bus.connect(filter);
    filter.connect(this.output);

    for (const midi of chord.pad) {
      const oscillator = ctx.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.value = midiToHz(midi);
      oscillator.detune.value = (Math.random() - 0.5) * 8;
      oscillator.connect(bus);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.05);
    }
  }

  bass(midi, start) {
    this.note(midiToHz(midi), start, 0.62, AUDIO.music.bassGain, 'triangle');
  }

  note(frequency, start, duration, gain, type) {
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.output);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  kick(start) {
    const ctx = this.context;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(112, start);
    oscillator.frequency.exponentialRampToValueAtTime(44, start + 0.15);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(
      AUDIO.music.kickGain,
      start + 0.006,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    oscillator.connect(envelope);
    envelope.connect(this.output);
    oscillator.start(start);
    oscillator.stop(start + 0.24);
  }

  snare(start) {
    this.noise(start, 0.12, {
      type: 'bandpass',
      frequency: 1750,
      q: 0.75,
      gain: AUDIO.music.snareGain,
    });
  }

  hat(start, accent) {
    this.noise(start, 0.04, {
      type: 'highpass',
      frequency: 5900,
      q: 0.7,
      gain: AUDIO.music.hatGain * accent,
    });
  }

  noise(start, duration, { type, frequency, q, gain }) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();

    source.buffer = this.noiseBuffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + 0.004);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.output);
    source.start(start, Math.random() * 0.8);
    source.stop(start + duration + 0.01);
  }

  dispose() {
    this.enabled = false;
  }
}
