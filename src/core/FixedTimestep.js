/**
 * Fixed-timestep accumulator with render interpolation.
 *
 * Physics always advances in identical 60 Hz steps, so handling and collisions
 * do not change with monitor refresh rate. Rendering receives an alpha value in
 * [0, 1] and interpolates between the previous and current simulation state,
 * which keeps motion smooth on 120/144 Hz displays without a variable step.
 *
 * A long frame (tab wake-up, GC pause) is clamped. If the backlog would exceed
 * maxSubsteps the remainder is dropped, because replaying stale time is worse
 * than losing it: it makes the car teleport and can spiral.
 */
export class FixedTimestep {
  constructor({ step, maxSubsteps, maxFrameDelta }) {
    if (!(step > 0)) throw new Error('FixedTimestep needs a positive step.');
    if (!(maxSubsteps > 0)) {
      throw new Error('FixedTimestep needs at least one substep.');
    }

    this.step = step;
    this.maxSubsteps = maxSubsteps;
    this.maxFrameDelta = maxFrameDelta;
    this.accumulator = 0;
  }

  /**
   * Advance the simulation.
   * @param {number} frameDelta Seconds since the previous rendered frame.
   * @param {(step: number) => void} fixedUpdate Called once per fixed step.
   * @returns {number} Interpolation alpha for the renderer.
   */
  update(frameDelta, fixedUpdate) {
    const safeDelta = Math.min(Math.max(frameDelta, 0), this.maxFrameDelta);
    this.accumulator += safeDelta;

    let steps = 0;
    while (this.accumulator >= this.step && steps < this.maxSubsteps) {
      fixedUpdate(this.step);
      this.accumulator -= this.step;
      steps += 1;
    }

    if (steps === this.maxSubsteps && this.accumulator >= this.step) {
      this.accumulator = 0;
    }

    return this.accumulator / this.step;
  }

  reset() {
    this.accumulator = 0;
  }
}
