/**
 * Race clock and lap bookkeeping.
 *
 * LapTimer follows the fixed simulation clock rather than wall time, so the
 * same lap is measured identically on 60, 120, and 144 Hz displays. It stores a
 * personal best in localStorage, but keeps the current race's last lap and lap
 * list separate: the timing tower can compare a fresh lap against a record set
 * in an earlier session.
 */
import { RACE } from '../config/race.config.js';

export class LapTimer {
  constructor({ bus, laps = RACE.laps } = {}) {
    if (!bus) throw new Error('LapTimer needs an EventBus.');

    this.bus = bus;
    this.laps = laps;
    this.best = this.loadBest();

    this.lap = 1;
    this.currentTime = 0;
    this.lastLap = null;
    this.lastDelta = null;
    this.lapTimes = [];
    this.totalTime = 0;
    this.running = false;
    this.finished = false;

    this.unsubscribeLap = bus.on('lap:complete', this.handleLapComplete);
  }

  /** Clear one race while keeping the all-time personal best. */
  reset() {
    this.lap = 1;
    this.currentTime = 0;
    this.lastLap = null;
    this.lastDelta = null;
    this.lapTimes = [];
    this.totalTime = 0;
    this.running = false;
    this.finished = false;
  }

  start() {
    if (!this.finished) this.running = true;
  }

  stop() {
    this.running = false;
  }

  update(dt) {
    if (!this.running || this.finished || !(dt > 0)) return;
    this.currentTime += dt;
    this.totalTime += dt;
  }

  handleLapComplete = (payload = {}) => {
    if (!this.running || this.finished) return;

    const lapTime = this.currentTime;
    if (!(lapTime > 0)) return;

    const completedLap = payload.lap ?? this.lap;
    const previousBest = this.best;
    this.lastLap = lapTime;
    this.lastDelta =
      previousBest === null ? 0 : lapTime - previousBest;
    this.lapTimes.push(lapTime);

    if (previousBest === null || lapTime < previousBest) {
      this.best = lapTime;
      this.saveBest(lapTime);

      if (previousBest !== null) {
        this.bus.emit('ui:toast', {
          message: 'New best lap',
          tone: 'best',
        });
      }
    }

    if (completedLap >= this.laps) {
      this.finished = true;
      this.running = false;
      this.currentTime = lapTime;
      this.lap = this.laps;
      this.bus.emit('race:finished', {
        laps: this.laps,
        lapTimes: [...this.lapTimes],
        best: this.best,
        totalTime: this.totalTime,
      });
      return;
    }

    this.lap = completedLap + 1;
    this.currentTime = 0;
  };

  loadBest() {
    try {
      const raw = window.localStorage.getItem(RACE.storage.bestLapKey);
      const value = Number(raw);
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  }

  saveBest(value) {
    try {
      window.localStorage.setItem(
        RACE.storage.bestLapKey,
        String(value),
      );
    } catch {
      // Private browsing and storage quotas should never stop a race.
    }
  }

  dispose() {
    this.unsubscribeLap?.();
    this.unsubscribeLap = null;
  }
}
