/**
 * Day and night room beds.
 *
 * Day is a soft filtered air tone. Night fades to a darker air layer, a quiet
 * mains-like hum, and sparse synthesized crickets. The two buses crossfade with
 * the same 1.5 s feel as the lighting blend, so the room never sounds like it
 * snapped from one preset to the other.
 */
import { AUDIO } from '../config/audio.config.js';

export class Ambience {
  constructor({ context, output, noiseBuffer, mode = 'day' }) {
    if (!context || !output || !noiseBuffer) {
      throw new Error('Ambience needs a context, output, and noise buffer.');
    }

    this.context = context;
    this.output = output;
    this.mode = mode === 'night' ? 'night' : 'day';
    this.sources = [];
    this.oscillators = [];

    this.dayBus = context.createGain();
    this.nightBus = context.createGain();
    this.dayBus.gain.value = this.mode === 'day' ? 1 : 0;
    this.nightBus.gain.value = this.mode === 'night' ? 1 : 0;
    this.dayBus.connect(output);
    this.nightBus.connect(output);

    this.buildDay(noiseBuffer);
    this.buildNight(noiseBuffer);

    this.nextChirp = context.currentTime + 0.8;
    if (this.mode === 'night') {
      this.nextChirp = context.currentTime + 0.25;
    }
  }

  buildDay(noiseBuffer) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 820;
    filter.Q.value = 0.35;
    gain.gain.value = AUDIO.ambience.dayNoise;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.dayBus);
    source.start();
    this.sources.push(source);
  }

  buildNight(noiseBuffer) {
    const ctx = this.context;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();
    const humGain = ctx.createGain();
    const hum = ctx.createOscillator();
    const harmonic = ctx.createOscillator();

    source.buffer = noiseBuffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 360;
    filter.Q.value = 0.5;
    noiseGain.gain.value = AUDIO.ambience.nightNoise;

    source.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.nightBus);
    source.start();
    this.sources.push(source);

    hum.type = 'sine';
    hum.frequency.value = 55;
    harmonic.type = 'sine';
    harmonic.frequency.value = 110;
    humGain.gain.value = AUDIO.ambience.nightHum;
    hum.connect(humGain);
    harmonic.connect(humGain);
    humGain.connect(this.nightBus);
    hum.start();
    harmonic.start();
    this.oscillators.push(hum, harmonic);

    // Crickets share a quiet bus; each chirp is three very short high tones.
    this.cricketBus = ctx.createGain();
    this.cricketBus.gain.value = 1;
    this.cricketBus.connect(this.nightBus);
  }

  setMode(mode) {
    if (mode !== 'day' && mode !== 'night') return;
    this.mode = mode;
    const now = this.context.currentTime;
    const timeConstant = AUDIO.fade.ambience / 3;
    this.dayBus.gain.setTargetAtTime(mode === 'day' ? 1 : 0, now, timeConstant);
    this.nightBus.gain.setTargetAtTime(
      mode === 'night' ? 1 : 0,
      now,
      timeConstant,
    );

    if (mode === 'night') {
      this.nextChirp = Math.min(this.nextChirp, now + 0.45);
    }
  }

  update() {
    if (!this.cricketBus || this.mode !== 'night') return;

    const now = this.context.currentTime;
    if (this.nextChirp > now + AUDIO.ambience.chirpLookahead) return;

    this.chirp(Math.max(this.nextChirp, now + 0.02));
    this.nextChirp += this.delay();
  }

  delay() {
    const { cricketMinDelay, cricketMaxDelay } = AUDIO.ambience;
    return (
      cricketMinDelay + Math.random() * (cricketMaxDelay - cricketMinDelay)
    );
  }

  chirp(start) {
    const ctx = this.context;
    const gain = AUDIO.ambience.cricket;
    const base = 4200 + Math.random() * 380;

    for (let i = 0; i < 3; i += 1) {
      const at = start + i * 0.055;
      const oscillator = ctx.createOscillator();
      const envelope = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(base + i * 90, at);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(gain, at + 0.006);
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);

      oscillator.connect(envelope);
      envelope.connect(this.cricketBus);
      oscillator.start(at);
      oscillator.stop(at + 0.04);
    }
  }

  dispose() {
    for (const source of this.sources) source.stop();
    for (const oscillator of this.oscillators) oscillator.stop();
    this.dayBus.disconnect();
    this.nightBus.disconnect();
    this.cricketBus?.disconnect();
    this.sources.length = 0;
    this.oscillators.length = 0;
  }
}
