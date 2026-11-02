/**
 * Car classes with stat multipliers applied on top of the base constants.
 *
 * The base constants live in car.config.js (CAR_WIDTH, CAR.dimensions,
 * CAR.physics, CAR.mounts, CAR.lightAnchors). These multipliers only scale
 * the handling values; nothing there is ever rewritten.
 */

export const CARS = Object.freeze({
  F1: Object.freeze({
    /** @type {'F1'} */
    id: 'F1',
    name: 'F1',
    classLabel: 'Grand Prix',
    scale: 1.0,
    /** Max-speed multiplier over the base car. */
    maxSpeed: 1.00,
    /** Acceleration multiplier over the base car. */
    accel: 1.00,
    /** Steering multiplier over the base car. */
    steer: 1.00,
    /** Grip multiplier over the base car. */
    grip: 1.00,
    /** Boost multiplier over the base car. */
    boost: 1.00,
  }),
  F2: Object.freeze({
    id: 'F2',
    name: 'F2',
    classLabel: 'Sprint',
    scale: 1.0,
    maxSpeed: 0.90,
    accel: 0.92,
    steer: 1.05,
    grip: 1.05,
    boost: 0.90,
  }),
  F3: Object.freeze({
    id: 'F3',
    name: 'F3',
    classLabel: 'Junior',
    scale: 0.9,
    maxSpeed: 0.80,
    accel: 0.85,
    steer: 1.10,
    grip: 1.10,
    boost: 0.80,
  }),
});
