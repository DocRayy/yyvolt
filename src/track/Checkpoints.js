/**
 * Ordered checkpoint gates around the lap.
 *
 * Gate 0 is the start/finish line under the arch. A lap only counts after the
 * other six gates have been crossed in order, then gate 0 again. The update
 * method is allocation-free so Phase 5 can call it from the fixed physics step.
 */
import { Vector3 } from 'three';
import { TRACK } from '../config/track.config.js';

export class Checkpoints {
  constructor(trackPath) {
    this.trackPath = trackPath;
    this.halfWidth = trackPath.halfWidth - TRACK.checkpoints.halfWidthMargin;
    this.gates = TRACK.checkpoints.us.map((u, index) => {
      const frame = trackPath.getFrameAt(u);
      return {
        index,
        u,
        position: frame.position.clone(),
        tangent: frame.tangent.clone(),
        side: frame.side.clone(),
        halfWidth: this.halfWidth,
      };
    });

    this.nextIndex = 1;
    this.lap = 0;
    this.passed = 0;

    this.previousOffset = 0;
    this.currentOffset = 0;
    this.lateral = 0;
    this.result = {
      checkpoint: -1,
      lapComplete: false,
      wrongWay: false,
      lap: 0,
      nextIndex: 1,
    };
  }

  getGate(index) {
    return this.gates[index] ?? null;
  }

  getNextGate() {
    return this.gates[this.nextIndex];
  }

  /**
   * The gate the car most recently cleared. R respawns here, so a reset never
   * sends the player back to the start line after a clean sector.
   */
  getLastGate() {
    const index =
      (this.nextIndex - 1 + this.gates.length) % this.gates.length;
    return this.gates[index];
  }

  /**
   * Test the swept segment previous -> current against every gate. Returns a
   * reused result object; consumers should read it immediately.
   */
  update(previous, current) {
    const result = this.result;
    result.checkpoint = -1;
    result.lapComplete = false;
    result.wrongWay = false;
    result.lap = this.lap;
    result.nextIndex = this.nextIndex;

    for (const gate of this.gates) {
      const prevOffset = this.previousOffset =
        (previous.x - gate.position.x) * gate.tangent.x +
        (previous.y - gate.position.y) * gate.tangent.y +
        (previous.z - gate.position.z) * gate.tangent.z;
      const currOffset = this.currentOffset =
        (current.x - gate.position.x) * gate.tangent.x +
        (current.y - gate.position.y) * gate.tangent.y +
        (current.z - gate.position.z) * gate.tangent.z;

      if (prevOffset === currOffset) continue;

      const lateral = this.lateral =
        (current.x - gate.position.x) * gate.side.x +
        (current.y - gate.position.y) * gate.side.y +
        (current.z - gate.position.z) * gate.side.z;
      if (Math.abs(lateral) > gate.halfWidth) continue;

      const forward = prevOffset < 0 && currOffset >= 0;
      const backward = prevOffset >= 0 && currOffset < 0;
      if (!forward && !backward) continue;

      if (!forward) {
        result.wrongWay = true;
        continue;
      }

      if (gate.index !== this.nextIndex) continue;

      if (gate.index === 0) {
        this.lap += 1;
        this.passed = 0;
        this.nextIndex = 1;
        result.lapComplete = true;
      } else {
        this.passed += 1;
        this.nextIndex = (this.nextIndex + 1) % this.gates.length;
        result.checkpoint = gate.index;
      }

      result.lap = this.lap;
      result.nextIndex = this.nextIndex;
    }

    return result;
  }

  /** True when the car's velocity points against the next gate. */
  isWrongWay(velocity) {
    const gate = this.getNextGate();
    if (!gate) return false;
    return velocity.dot(gate.tangent) < -0.25;
  }

  reset() {
    this.nextIndex = 1;
    this.lap = 0;
    this.passed = 0;
  }
}
