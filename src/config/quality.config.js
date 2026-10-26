/**
 * Adaptive quality tiers.
 *
 * The manager moves down one tier at a time. It never steps back up on its own:
 * a visible resolution or shadow change during a race is worse than a little
 * headroom. DeviceProfile picks `high` on desktop and the dedicated `mobile`
 * tier on phones and tablets before the renderer is created.
 */
export const QUALITY = Object.freeze({
  startLevel: 'high',
  order: Object.freeze(['high', 'medium', 'low']),

  // Mobile starts behind the desktop curve: no bloom, a 1.5 pixel-ratio cap,
  // and a 1024 shadow map. It can still step down to low if the frame rate
  // cannot settle, but never jumps back up automatically.
  mobileStartLevel: 'mobile',
  mobileOrder: Object.freeze(['mobile', 'low']),
  mobileMaxDynamicLights: 2,

  presets: Object.freeze({
    high: Object.freeze({
      label: 'High',
      maxPixelRatio: 2,
      shadowMapSize: 2048,
      bloom: true,
      bloomScale: 1,
    }),
    medium: Object.freeze({
      label: 'Medium',
      maxPixelRatio: 1.5,
      shadowMapSize: 1024,
      bloom: true,
      bloomScale: 0.65,
    }),
    mobile: Object.freeze({
      // The player sees the same "Medium" label as the desktop middle tier.
      // Internally this is a separate preset because mobile bloom stays off.
      label: 'Medium',
      maxPixelRatio: 1.5,
      shadowMapSize: 1024,
      bloom: false,
      bloomScale: 0,
    }),
    low: Object.freeze({
      label: 'Low',
      maxPixelRatio: 1,
      shadowMapSize: 512,
      bloom: false,
      bloomScale: 0,
    }),
  }),

  monitor: Object.freeze({
    // Shader compilation and the first room frames are not representative.
    warmupSeconds: 2.5,
    // Give a change time to settle before judging the next tier.
    settleSeconds: 2,
    sampleSeconds: 1,
    downgradeBelowFps: 50,
    downgradeWindowSeconds: 3,
    // A tab return can produce a huge delta; never let it poison the average.
    maxFrameDelta: 0.25,
  }),
});
