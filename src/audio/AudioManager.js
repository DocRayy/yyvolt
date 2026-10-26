/**
 * AudioContext owner and game-event router.
 *
 * The context is created lazily from the first pointer/key gesture, because
 * browsers refuse to start audio before user activation. Once unlocked, this
 * class wires the synthesizers to the game's EventBus, keeps the engine and
 * tyre layers fed from the car each render tick, and fades the music bus and
 * master bus instead of cutting them.
 *
 * Start lights are expected to emit "countdown:light" (one per red lamp) and
 * "countdown:go". Menu buttons should emit "ui:click" for their tick. The
 * Phase 9 UI owns their timing and wiring; audio only reacts.
 */
import { CAR } from '../config/car.config.js';
import { AUDIO } from '../config/audio.config.js';
import { clamp } from '../utils/math.js';
import { Ambience } from './Ambience.js';
import { MusicLoop } from './MusicLoop.js';
import { SoundSynth } from './SoundSynth.js';

export class AudioManager {
  constructor({ bus, car }) {
    if (!bus) throw new Error('AudioManager needs an EventBus.');

    this.bus = bus;
    this.car = car ?? null;
    this.context = null;
    this.synth = null;
    this.engine = null;
    this.skid = null;
    this.ambience = null;
    this.music = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.ambienceBus = null;

    this.muted = false;
    this.musicOn = true;
    this.engineActive = true;
    this.dayNightMode = 'day';
    this.disposed = false;
    this.disabled = false;
    // Orientation and tab visibility both need a silent context, but they are
    // separate reasons. Orientation owns this flag; document.hidden stays
    // handled by the browser event.
    this.interrupted = false;
    this.unsubscribers = [];

    this.handleGesture = () => this.unlock();
    this.handleVisibility = () => this.syncVisibility();
    window.addEventListener('pointerdown', this.handleGesture, {
      passive: true,
    });
    window.addEventListener('keydown', this.handleGesture);
    document.addEventListener('visibilitychange', this.handleVisibility);

    this.bindEvents();
  }

  bindEvents() {
    const on = this.bus.on.bind(this.bus);
    this.unsubscribers.push(
      on('input:action', ({ action } = {}) => {
        if (action === 'audio.mute') this.toggleMute();
        if (action === 'audio.music') this.toggleMusic();
      }),
      on('ui:click', () => this.synth?.click()),
      on('checkpoint:passed', ({ checkpoint } = {}) => {
        this.synth?.checkpoint(checkpoint);
      }),
      on('lap:complete', () => this.synth?.lap()),
      on('collectible:collected', ({ kind } = {}) => this.synth?.pickup(kind)),
      on('car:collide', ({ strength } = {}) => this.synth?.collision(strength)),
      on('boost:start', () => this.synth?.boost()),
      on('countdown:light', () => this.synth?.startLight()),
      on('countdown:go', () => this.synth?.go()),
      on('daynight:changed', ({ mode } = {}) => {
        this.dayNightMode = mode === 'night' ? 'night' : 'day';
        this.ambience?.setMode(this.dayNightMode);
      }),
      on('state:changed', ({ current } = {}) => {
        this.engineActive = current !== 'PAUSED' && current !== 'BOOT';
      }),
    );
  }

  /**
   * Safe to call on every gesture. It creates the graph once, then only resumes
   * when a browser interruption (tab switch, iOS) left the context suspended.
   */
  async unlock() {
    if (this.disposed || this.disabled) return;

    if (!this.context) {
      const Context = window.AudioContext ?? window.webkitAudioContext;
      if (!Context) {
        this.disabled = true;
        return;
      }

      try {
        this.context = new Context();
        this.buildGraph();
      } catch {
        this.context = null;
        this.disabled = true;
        return;
      }
    }

    if (document.hidden || this.interrupted) {
      this.context.suspend().catch(() => {});
      return;
    }

    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        // A future gesture will retry; no need to surface this to the player.
      }
    }
  }

  buildGraph() {
    const ctx = this.context;
    const now = ctx.currentTime;

    this.master = ctx.createGain();
    // Fade the whole graph in after the first gesture. The context often
    // resumes on the same tick, and an instant ambience/music onset can pop.
    this.master.gain.setValueAtTime(0, now);
    this.master.gain.linearRampToValueAtTime(
      this.muted ? 0 : AUDIO.masterVolume,
      now + 0.25,
    );

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = AUDIO.compressor.threshold;
    compressor.knee.value = AUDIO.compressor.knee;
    compressor.ratio.value = AUDIO.compressor.ratio;
    compressor.attack.value = AUDIO.compressor.attack;
    compressor.release.value = AUDIO.compressor.release;

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = AUDIO.sfxVolume;
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicOn ? AUDIO.musicVolume : 0;
    this.ambienceBus = ctx.createGain();
    this.ambienceBus.gain.value = AUDIO.ambienceVolume;

    const musicFilter = ctx.createBiquadFilter();
    musicFilter.type = 'lowpass';
    musicFilter.frequency.value = AUDIO.music.lowpass;
    musicFilter.Q.value = 0.35;

    this.sfxBus.connect(compressor);
    this.musicBus.connect(musicFilter);
    musicFilter.connect(compressor);
    this.ambienceBus.connect(compressor);
    compressor.connect(this.master);
    this.master.connect(ctx.destination);

    this.synth = new SoundSynth({ context: ctx, output: this.sfxBus });
    this.engine = this.synth.createEngine();
    this.skid = this.synth.createSkid();
    this.ambience = new Ambience({
      context: ctx,
      output: this.ambienceBus,
      noiseBuffer: this.synth.noiseBuffer,
      mode: this.dayNightMode,
    });
    this.music = new MusicLoop({
      context: ctx,
      output: this.musicBus,
      noiseBuffer: this.synth.noiseBuffer,
      enabled: this.musicOn,
    });
  }

  /**
   * Stop or restart the context for a non-visibility interruption, currently
   * the portrait rotate gate. The caller owns the reason; this class combines
   * it with document.hidden so either condition keeps audio silent.
   */
  setInterrupted(interrupted) {
    this.interrupted = Boolean(interrupted);
    this.syncVisibility();
  }

  syncVisibility() {
    if (!this.context || this.context.state === 'closed') return;

    if (document.hidden || this.interrupted) {
      this.context.suspend().catch(() => {});
    } else {
      this.context.resume().catch(() => {});
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : AUDIO.masterVolume,
        now,
        AUDIO.fade.mute / 3,
      );
    }
    this.bus.emit('ui:toast', {
      message: this.muted ? 'Audio muted' : 'Audio on',
    });
  }

  toggleMusic() {
    this.musicOn = !this.musicOn;
    this.music?.setEnabled(this.musicOn);
    if (this.musicBus) {
      const now = this.context.currentTime;
      this.musicBus.gain.cancelScheduledValues(now);
      this.musicBus.gain.setTargetAtTime(
        this.musicOn ? AUDIO.musicVolume : 0,
        now,
        AUDIO.fade.music / 3,
      );
    }
    this.bus.emit('ui:toast', {
      message: this.musicOn ? 'Music on' : 'Music off',
    });
  }

  /** Called once per render frame; continuous sources read the car here. */
  update() {
    if (!this.context || this.context.state !== 'running' || !this.engine) {
      return;
    }

    const physics = this.car?.physics;
    if (physics) {
      const speedRatio = clamp(
        Math.abs(physics.speed) / CAR.physics.maxSpeed,
        0,
        1.2,
      );
      const onTrack = this.car.surfaceResult?.onTrack ?? false;
      const handbrake =
        physics.handbrake * clamp(Math.abs(physics.speed) / 2.5, 0, 1);
      const skidAmount = onTrack
        ? clamp(
            (Math.abs(physics.lateralSpeed) - AUDIO.skid.threshold) /
              AUDIO.skid.span +
              handbrake * 0.8,
            0,
            1,
          )
        : 0;

      this.engine.set(
        speedRatio,
        physics.throttle,
        physics.boostActive ? 1 : 0,
        this.engineActive,
      );
      this.skid.set(skidAmount);
    }

    this.music?.update();
    this.ambience?.update();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers.length = 0;
    window.removeEventListener('pointerdown', this.handleGesture);
    window.removeEventListener('keydown', this.handleGesture);
    document.removeEventListener('visibilitychange', this.handleVisibility);

    this.engine?.dispose();
    this.skid?.dispose();
    this.ambience?.dispose();
    this.music?.dispose();
    this.engine = null;
    this.skid = null;
    this.ambience = null;
    this.music = null;

    this.sfxBus?.disconnect();
    this.musicBus?.disconnect();
    this.ambienceBus?.disconnect();
    this.master?.disconnect();
    this.sfxBus = null;
    this.musicBus = null;
    this.ambienceBus = null;
    this.master = null;

    if (this.context && this.context.state !== 'closed') {
      this.context.close().catch(() => {});
    }
    this.context = null;
    this.synth = null;
  }
}
