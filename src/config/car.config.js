/**
 * Toy F1 car dimensions, arcade handling, and visual tuning.
 *
 * The car is intentionally larger than a strict scale model: a 0.66-unit car on
 * a 1.2-unit toy track reads clearly from the chase and broadcast cameras. All
 * handling values are acceleration / damping terms rather than forces, because
 * this is an arcade car with no physics engine. World units are metres.
 */
export const CAR = Object.freeze({
  dimensions: Object.freeze({
    // Main hardpoints shared by the model, wheels, and ground probes.
    wheelbase: 0.38,
    frontAxleZ: -0.19,
    rearAxleZ: 0.19,
    wheelX: 0.15,
    wheelRadius: 0.064,
    wheelWidth: 0.055,
    bodyWidth: 0.16,
    noseTipZ: -0.385,
    rearTipZ: 0.3,
    groundProbe: 0.19,
  }),

  physics: Object.freeze({
    // Speed is in world units/s. A full lap is about 25 units, so 7.2 sits in
    // the sweet spot between toy-scale drama and a readable 3-lap race.
    maxSpeed: 7.2,
    maxReverseSpeed: 2.4,
    engineAcceleration: 9.5,
    // The engine torque curve fades to zero at maxSpeed. A power curve keeps
    // acceleration strong through the mid range without letting the car creep
    // past its nominal top speed.
    engineFalloffPower: 4,
    reverseAcceleration: 5.5,
    brakeDeceleration: 16,
    handbrakeDeceleration: 3.2,

    rollingDrag: 0.32,
    aeroDrag: 0.014,
    offTrackDrag: 1.1,
    rugDrag: 2.4,

    gripTrack: 8.5,
    gripFloor: 4.6,
    gripRug: 5.4,
    handbrakeGripScale: 0.22,

    steerMax: 0.58,
    // At top speed the steering target shrinks by this fraction, which keeps
    // the car stable without making low-speed hairpins feel heavy.
    speedSteerReduction: 0.45,
    steerInLambda: 6.5,
    steerOutLambda: 9.5,
    throttleLambda: 7,
    brakeLambda: 10,
    handbrakeLambda: 9,

    // Yaw is deliberately not a bicycle-model 1 / wheelbase response: at toy
    // scale that spins the car absurdly fast. A larger virtual turn radius
    // gives clean, controllable arcade cornering.
    turnRadius: 1.15,
    maxYawRate: 3.4,
    handbrakeYawBoost: 1.18,
    maxLateralSpeed: 4.5,

    groundPitchLambda: 20,
    boostMaxSpeed: 10.2,
    boostAcceleration: 7.5,
    boostDrain: 0.28,
    boostRefill: 0.09,
    boostMinEnergy: 0.04,

    // Body motion is a spring-damper on a child group, so wheels stay planted.
    pitchGain: 0.0055,
    rollGain: 0.0085,
    maxPitch: 0.075,
    maxRoll: 0.11,
    pitchStiffness: 120,
    pitchDamping: 15,
    rollStiffness: 110,
    rollDamping: 14,

    // The shadow map is static for the room; the car requests a refresh at a
    // low fixed rate only while it is moving.
    shadowSpeedThreshold: 0.15,
    shadowUpdateInterval: 0.12,
  }),

  /** Tyre dust, skid marks, boost flame, and screen-edge speed lines. */
  effects: Object.freeze({
    // Mobile keeps the same pools but emits less often, so no asset or buffer
    // rebuild is needed when a tablet starts the game.
    mobile: Object.freeze({
      dustRateScale: 0.55,
      skidSpacingScale: 1.8,
    }),
    dust: Object.freeze({
      maxParticles: 64,
      sprayRate: 18,
      slipRate: 46,
      offTrackRate: 26,
      slipThreshold: 0.55,
      offTrackSpeed: 0.8,
      lifeMin: 0.45,
      lifeMax: 0.85,
      sizeMin: 0.06,
      sizeMax: 0.13,
      rise: 0.22,
      spread: 0.45,
      drag: 1.8,
      alpha: 0.38,
      color: 0xc7b8a2,
    }),
    skid: Object.freeze({
      maxMarks: 260,
      spacing: 0.06,
      width: 0.05,
      length: 0.17,
      alpha: 0.34,
      color: 0x2a211a,
      slip: 0.9,
      speed: 1.4,
      lift: 0.006,
    }),
    flame: Object.freeze({
      outerColor: 0xf4511e,
      innerColor: 0xffc20e,
      outerRadius: 0.075,
      outerLength: 0.3,
      innerRadius: 0.04,
      innerLength: 0.18,
      y: 0.12,
      z: 0.3,
      flicker: 32,
    }),
    speedLineCount: 28,
  }),

  lights: Object.freeze({
    color: 0xfff1cf,
    tailColor: 0xff2f38,
    distance: 6.5,
    angle: 0.46,
    penumbra: 0.55,
    decay: 1.6,
    lensEmissive: 2.4,
    brakeMultiplier: 2.4,
  }),

  /** Local-space camera mounts. Phase 6 reads these instead of guessing. */
  mounts: Object.freeze({
    cockpitEye: Object.freeze([0, 0.168, 0.028]),
    tcam: Object.freeze([0, 0.285, 0.18]),
    nose: Object.freeze([0, 0.16, -0.22]),
    // Ahead of the left-front wheel so the lens can look back along the body.
    wheelCam: Object.freeze([-0.22, 0.085, -0.29]),
    chase: Object.freeze([0, 0.38, 0.58]),
  }),

  /** Headlight and tail-light anchor positions, local to the body group. */
  lightAnchors: Object.freeze({
    headlights: Object.freeze([
      Object.freeze([-0.07, 0.075, -0.3]),
      Object.freeze([0.07, 0.075, -0.3]),
    ]),
    headlightTarget: Object.freeze([0, 0.02, -2.6]),
    tail: Object.freeze([0, 0.115, 0.287]),
  }),
});
