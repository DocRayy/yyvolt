/**
 * Camera mode definitions.
 *
 * CameraRig owns one real PerspectiveCamera and blends between these modes.
 * Keys are deliberately absent: controls.config.js is the single source of
 * truth for bindings, and each camera binding points at a mode id.
 *
 * Offsets are in the car's local space where a mount is used. The chase values
 * are world-space metres, kept on the toy scale of the room.
 */

export const CAMERA_LIMITS = Object.freeze({
  near: 0.03,
  far: 60,
  // Narrow screens get a wider view without changing the authored per-mode FOV.
  portraitFovBoost: 14,
});

export const CAMERA_BLEND_SECONDS = 0.5;

/**
 * Menu camera drift. This is deliberately outside CAMERA_MODES: it is not a
 * selectable view during a race, just a slow establishing orbit over the room
 * while the player is choosing to start.
 */
export const MENU_CAMERA = Object.freeze({
  centerX: 0,
  centerZ: 0,
  radiusX: 4.0,
  radiusZ: 3.2,
  height: 2.55,
  lookHeight: 0.85,
  speed: 0.052,
  startAngle: 0.72,
  fov: 56,
});

export const CAMERA_MODES = Object.freeze([
  {
    id: 'cockpit',
    name: 'Cockpit',
    fov: 75,
    damping: 14,
    shake: 0.25,
    mount: 'cockpitEye',
    lookPitch: -0.04,
    headYawGain: 0.0025,
    headPitchGain: 0.0035,
    headMaxYaw: 0.055,
    headMaxPitch: 0.032,
    headDamping: 8,
  },
  {
    id: 'tcam',
    name: 'T-cam',
    fov: 70,
    damping: 16,
    shake: 0.3,
    mount: 'tcam',
    lookPitch: -0.075,
  },
  {
    id: 'nose',
    name: 'Nose',
    fov: 85,
    damping: 18,
    shake: 0.5,
    mount: 'nose',
    lookPitch: -0.12,
  },
  {
    id: 'chase',
    name: 'Chase',
    fov: 62,
    damping: 7,
    shake: 0.35,
    distance: 1.35,
    height: 0.55,
    lookAhead: 0.65,
    lookHeight: 0.12,
    lookDamping: 10,
    fovSpeed: 14,
    maxFov: 80,
    fovDamping: 5,
    boostShake: 0.45,
    collisionMargin: 0.14,
    collisionOriginHeight: 0.18,
    collisionMinDistance: 0.2,
  },
  {
    id: 'wheel',
    name: 'Wheel',
    fov: 60,
    damping: 12,
    shake: 0.2,
    mount: 'wheelCam',
    // Look back along the left flank: the front wheel is the foreground and
    // the body/rear of the car recedes behind it.
    lookYaw: 3.78,
    lookPitch: -0.08,
  },
  {
    id: 'broadcast',
    name: 'Broadcast',
    fov: 38,
    damping: 5,
    shake: 0,
    lookAhead: 0.1,
    lookHeight: 0.13,
    lookDamping: 7,
    referenceDistance: 4.2,
    minFov: 24,
    maxFov: 52,
    fovDamping: 4,
    idealDistance: 3.6,
    switchMargin: 0.7,
    minHold: 1.6,
    scanInterval: 0.35,
    blockedPenalty: 3,
    visibilityMargin: 0.16,
    // Fixed trackside positions inside the room. The visibility ray rejects a
    // shot when furniture sits between it and the car.
    shots: Object.freeze([
      Object.freeze({
        id: 'bookshelf',
        position: Object.freeze([3.9, 2.05, -4.35]),
      }),
      Object.freeze({
        id: 'bed',
        position: Object.freeze([-2.15, 1.15, -0.78]),
      }),
      Object.freeze({
        id: 'desk',
        position: Object.freeze([5.1, 0.45, -2.7]),
      }),
      Object.freeze({
        id: 'toybox',
        position: Object.freeze([4.15, 1.45, 4.4]),
      }),
      Object.freeze({
        id: 'door',
        position: Object.freeze([-3.9, 1.6, 4.55]),
      }),
    ]),
  },
  {
    id: 'aerial',
    name: 'Aerial',
    fov: 55,
    damping: 4.5,
    shake: 0,
    height: 7,
    lookAhead: 0.35,
    lookHeight: 0.1,
    lookDamping: 7,
  },
]);

export const CAMERA_SHAKE = Object.freeze({
  speedFloor: 0.25,
  speedRange: 0.75,
  frequency: 26,
  position: 0.009,
  rotation: 0.008,
  decay: 6,
  max: 1.4,
});

export const DEFAULT_CAMERA_ID = 'chase';

export const CAMERA_BY_ID = Object.freeze(
  Object.fromEntries(CAMERA_MODES.map((mode) => [mode.id, mode])),
);
