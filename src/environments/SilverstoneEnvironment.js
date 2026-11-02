/**
 * src/environments/SilverstoneEnvironment.js
 *
 * Silverstone (Southampton) circuit layout for V2. A bare-room track: the flat
 * green floor is the playing surface, the track itself supplies all barriers
 * and kerb, and the car is the only dynamic object. No buildings, no scenery,
 * no hillside: neutral defaults so a minimal render proves the track layout
 * before scenery is added.
 *
 * Layout order, clockwise from the start/finish straight: 39 control points.
 * The track is a long "straight + sweep" shape that loops back on itself.
 */

import { Environment } from './Environment.js';
import { TrackPath } from '../track/TrackPath.js';
import { TrackBuilder } from '../track/TrackBuilder.js';
import { TrackLights } from '../track/TrackLights.js';
import { Checkpoints } from '../track/Checkpoints.js';
import { TrackCollider } from '../track/TrackCollider.js';
import { Barriers } from './shared/Barriers.js';
import { Grandstand } from './shared/Grandstand.js';
import { Trees } from './shared/Trees.js';
import { SkyDome } from './shared/SkyDome.js';
import { ToyF1Car } from '../car/ToyF1Car.js';
import { Collectibles } from '../gameplay/Collectibles.js';
import { Effects } from '../car/Effects.js';
import { LapTimer } from '../gameplay/LapTimer.js';
import { LightingRig } from '../lighting/LightingRig.js';
import { DayNightController } from '../lighting/DayNightController.js';
import { CameraRig } from '../camera/CameraRig.js';
import { EnvironmentMap } from '../world/EnvironmentMap.js';
import { ENVIRONMENT } from '../config/constants.js';
import { CAMERA_MODES } from '../config/cameras.config.js';

const SILVERSTONE_POINTS = Object.freeze([
  [-36.2, 0.02, -35.6],
  [-27.4, 0.02, -35.6],
  [-18.5, 0.02, -34.6],
  [-10.1, 0.02, -31.5],
  [-1.1, 0.02, -30.9],
  [5.6, 0.02, -27.1],
  [6.1, 0.02, -20.1],
  [5.1, 0.02, -11.9],
  [4.0, 0.02, -2.9],
  [2.9, 0.02, 6.0],
  [2.6, 0.02, 14.4],
  [7.5, 0.02, 18.6],
  [14.0, 0.02, 17.4],
  [20.7, 0.02, 12.3],
  [27.3, 0.02, 6.2],
  [27.4, 0.02, -2.3],
  [23.8, 0.02, -10.3],
  [27.1, 0.02, -18.4],
  [35.3, 0.02, -21.2],
  [43.3, 0.02, -17.7],
  [44.7, 0.02, -9.5],
  [42.7, 0.02, -0.7],
  [40.8, 0.02, 8.1],
  [38.8, 0.02, 16.9],
  [36.9, 0.02, 25.6],
  [32.1, 0.02, 33.1],
  [23.7, 0.02, 35.6],
  [15.5, 0.02, 32.3],
  [7.4, 0.02, 28.4],
  [-1.2, 0.02, 25.9],
  [-8.2, 0.02, 20.3],
  [-15.4, 0.02, 15.1],
  [-23.2, 0.02, 10.6],
  [-31.1, 0.02, 6.2],
  [-38.9, 0.02, 1.7],
  [-44.2, 0.02, -5.2],
  [-43.2, 0.02, -14.1],
  [-44.7, 0.02, -22.8],
  [-43.9, 0.02, -31.4],
]);

export class SilverstoneEnvironment extends Environment {
  constructor() {
    super();
    // The room has a ceiling above the track and furniture.
    this.hasCeiling = true;
    this.skyType = 'none';
  }

  build(ctx) {
    const {
      bus,
      textures,
      renderer,
      profile,
      scene,
    } = ctx;

    // --- Track ---
    this.trackPath = new TrackPath();
    this.track = new TrackBuilder(this.trackPath, textures);
    this.trackLights = new TrackLights(this.trackPath);
    this.checkpoints = new Checkpoints(this.trackPath);
    this.collider = new TrackCollider(this.trackPath, { bus });

    // --- Barriers: visible guardrails aligned with the TrackCollider walls ---
    this.barriers = new Barriers(this.trackPath, textures);

    // --- Large flat green grass ground plane (canvas texture, no external
    // images). One PlaneGeometry stretched to cover the whole circuit. ---
    const grassCanvas = document.createElement('canvas');
    grassCanvas.width = 1024;
    grassCanvas.height = 1024;
    const grassCtx = grassCanvas.getContext('2d');
    // Base green
    grassCtx.fillStyle = '#2d6a2d';
    grassCtx.fillRect(0, 0, 1024, 1024);
    // Darker patches for variation
    for (let i = 0; i < 300; i += 1) {
      const x = ((i * 137) % 1024);
      const y = ((i * 89) % 1024);
      const r = 3 + (i % 7);
      grassCtx.fillStyle = `rgba(15, 45, 15, ${0.05 + (i % 4) * 0.04})`;
      grassCtx.fillRect(x, y, r, r);
    }
    // A few slightly lighter diagonal streaks for "grass" feel
    for (let i = 0; i < 120; i += 1) {
      const x = ((i * 263) % 1024);
      const y = ((i * 199) % 1024);
      const len = 2 + (i % 3);
      grassCtx.strokeStyle = 'rgba(45, 106, 45, 0.12)';
      grassCtx.lineWidth = 1 + (i % 2);
      grassCtx.beginPath();
      grassCtx.moveTo(x, y);
      grassCtx.lineTo(x + len, y + len);
      grassCtx.stroke();
    }
    this.grassTexture = textures.fromCanvas(grassCanvas, { clamp: true });
    this.grass = new Mesh(
      new PlaneGeometry(120, 90),
      new MeshStandardMaterial({
        map: this.grassTexture,
        roughness: 0.95,
        metalness: 0.0,
        side: 2,
      }),
    );
    this.grass.rotation.x = -Math.PI / 2;
    this.grass.position.set(0, -0.01, 0);
    this.grass.receiveShadow = true;
    this.grass.frustumCulled = false;
    scene.add(this.grass);

    // --- Sky: soft overcast sky with procedural clouds ---
    this.skyDome = new SkyDome(true);
    this.group.add(this.skyDome.group);

    // --- Distant trees and hedges: low-poly instanced pines along the
    // perimeter for depth, with flat hedge planes for the open feel. ---
    this.trees = new Trees({ isMobile: profile.isMobile });
    this.group.add(this.trees.group);

    // --- Silverstone scenery: grandstands, pit building, control tower,
    // gravel run-off patches. All placed outside the barrier line, never on
    // the road. InstancedMesh only. ---
    this.buildScenery();

    // --- Car + race support ---
    this.car = new ToyF1Car({
      trackPath: this.trackPath,
      textures,
      checkpoints: this.checkpoints,
      collider: this.collider,
      bus,
      maxDynamicLights: profile.maxDynamicLights,
    });
    this.collectibles = new Collectibles({
      trackPath: this.trackPath,
      car: this.car,
      bus,
    });
    this.effects = new Effects({ car: this.car, mobile: profile.isMobile });
    this.lapTimer = new LapTimer({ bus });

    scene.add(
      this.track.group,
      this.trackLights.group,
      this.barriers.group,
      this.car.group,
      this.collectibles.group,
      this.effects.group,
    );
    scene.updateMatrixWorld(true);

    // --- Lighting + camera + environment ---
    this.lighting = new LightingRig({
      lampAnchors: [],
      maxDynamicLights: profile.maxDynamicLights,
    });
    scene.add(this.lighting.group);

    this.dayNight = new DayNightController({
      bus,
      lighting: this.lighting,
      window: null,
      furniture: null,
      nightDecor: null,
      trackLights: this.trackLights,
      car: this.car,
      renderer,
      scene,
    });

    this.cameraRig = new CameraRig({
      car: this.car,
      bus,
      room: null,
      blockers: [this.track.group, this.barriers.group],
    });

    this.environment = new EnvironmentMap(renderer);
    scene.environment = this.environment.create();
    scene.environmentIntensity = ENVIRONMENT.intensity;
  }

  /** Silverstone scenery: grandstands, pit building, control tower, gravel
   * patches. All placed outside the barrier line using track frames as
   * reference (trackPath.getFrameAt). InstancedMesh only. */
  buildScenery() {
    const trackPath = this.trackPath;
    const textures = this.textures;
    const maxRows = 2;

    // Helper: place a grandstand on the right side of the track at a given
    // track-parameter u, using the standard barrier offset so it sits just
    // outside the red-white guardrails.
    const placeGrandstand = (u, rows = maxRows) => {
      const grandstand = new Grandstand(trackPath, textures, {
        rows,
        cols: 12,
        depth: 0.45,
        width: 2.6,
        height: 0.45,
      });
      // Get a frame near the given u to anchor the grandstand.
      const frame = trackPath.getFrameAt(u);
      const barrierOffset = 0.22 + 0.16 / 2;
      const xOff = 0.8;
      const zOff = 0.3;
      // Re-anchor: grandstand is already built with correct offsets; just add
      // a small offset along the track to position the family.
      const pos = new Vector3();
      const side = new Vector3();
      const tangent = new Vector3();
      trackPath.getFrameAt(u, frame);
      const sign = 1;
      const xBase = frame.position.x + frame.side.x * (trackPath.halfWidth + barrierOffset + xOff) * sign;
      const zBase = frame.position.z + frame.side.z * (trackPath.halfWidth + barrierOffset + zOff) * sign;
      // Rotate grandstand to face the track (rotate around Y axis).
      const angle = Math.atan2(frame.side.z, frame.side.x);
      grandstand.group.rotation.y = Math.PI - angle;
      grandstand.group.position.set(xBase, 0, zBase);
      this.group.add(grandstand.group);
      return grandstand;
    };

    // --- Grandstands ---
    // 2 near the first straight (right side), 2 near the first corners.
    placeGrandstand(0.015, 2);
    placeGrandstand(0.030, 2);
    placeGrandstand(0.14, 2);
    placeGrandstand(0.24, 2);

    // --- Pit building: simple box beside the start straight ---
    const pitCanvas = document.createElement('canvas');
    pitCanvas.width = 256;
    pitCanvas.height = 256;
    const pitCtx = pitCanvas.getContext('2d');
    pitCtx.fillStyle = '#8a6a4a';
    pitCtx.fillRect(0, 0, 256, 256);
    pitCtx.fillStyle = '#dddddd';
    pitCtx.fillRect(16, 16, 224, 224);
    for (let i = 0; i < 40; i += 1) {
      pitCtx.fillStyle = `rgba(120, 100, 80, 0.12)`;
      pitCtx.fillRect(((i * 73) % 256), ((i * 47) % 256), 4, 4);
    }
    const pitTexture = textures.fromCanvas(pitCanvas, { clamp: true });
    const pitMat = new MeshStandardMaterial({
      map: pitTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const pit = new Mesh(new BoxGeometry(3.2, 1.2, 2.4), pitMat);
    const frame0 = trackPath.getFrameAt(0.02);
    const pitX = frame0.position.x + frame0.side.x * (trackPath.halfWidth + 0.8) * 1;
    const pitZ = frame0.position.z + frame0.side.z * (trackPath.halfWidth + 0.8) * 1;
    pit.position.set(pitX, 0.6, pitZ);
    pit.castShadow = true;
    pit.receiveShadow = true;
    this.group.add(pit);

    // --- Control tower: simple box on a column beside the start straight ---
    const towerMat = new MeshStandardMaterial({
      color: 0xcccccc,
      roughness: 0.7,
      metalness: 0.1,
    });
    const towerBase = new Mesh(new BoxGeometry(0.8, 0.2, 0.8), towerMat);
    towerBase.position.set(pitX, 0.1, pitZ);
    this.group.add(towerBase);
    const towerBody = new Mesh(new BoxGeometry(0.6, 2.4, 0.6), towerMat);
    towerBody.position.set(pitX, 1.4, pitZ);
    towerBody.castShadow = true;
    towerBody.receiveShadow = true;
    this.group.add(towerBody);
    // Window strip on the tower body
    const winMat = new MeshStandardMaterial({
      color: 0x8a8a8a,
      roughness: 0.5,
    });
    for (let w = 0; w < 3; w += 1) {
      const wx = pitX + (w - 1) * 0.3 - 0.15;
      const win = new Mesh(new BoxGeometry(0.3, 0.06, 0.6), winMat);
      win.position.set(wx, 1.6, pitZ);
      win.castShadow = true;
      this.group.add(win);
    }

    // --- Gravel run-off patches: flat boxes with a gravel canvas texture,
    // placed outside the barriers at a few corner exits. ---
    const gravelCanvas = document.createElement('canvas');
    gravelCanvas.width = 128;
    gravelCanvas.height = 128;
    const gravelCtx = gravelCanvas.getContext('2d');
    gravelCtx.fillStyle = '#4a4038';
    gravelCtx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 150; i += 1) {
      gravelCtx.fillStyle = `rgba(70, 60, 50, 0.2)`;
      gravelCtx.fillRect(((i * 53) % 128), ((i * 37) % 128), 3, 3);
    }
    const gravelTexture = textures.fromCanvas(gravelCanvas, { clamp: true });
    const gravelMat = new MeshStandardMaterial({
      map: gravelTexture,
      roughness: 0.95,
      metalness: 0.0,
    });
    const gravelPatches = [
      { u: 0.15, rows: 2, cols: 3, xOff: 1.6, zOff: 0.7 },
      { u: 0.25, rows: 2, cols: 3, xOff: 1.6, zOff: 0.7 },
      { u: 0.45, rows: 1, cols: 2, xOff: 1.4, zOff: 0.6 },
    ];
    for (const g of gravelPatches) {
      const frame = trackPath.getFrameAt(g.u);
      const sign = 1;
      const xBase = frame.position.x + frame.side.x * (trackPath.halfWidth + g.xOff) * sign;
      const zBase = frame.position.z + frame.side.z * (trackPath.halfWidth + g.zOff) * sign;
      const geo = new BoxGeometry(g.cols * 0.24, 0.06, g.rows * 0.24);
      const mesh = new Mesh(gravelMat, geo);
      mesh.position.set(xBase, 0, zBase);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  dispose() {
    this.track?.dispose?.();
    this.trackPath?.dispose?.();
    this.trackLights?.dispose?.();
    this.checkpoints?.dispose?.();
    this.collider?.dispose?.();
    this.car?.dispose?.();
    this.collectibles?.dispose?.();
    this.effects?.dispose?.();
    this.lapTimer?.dispose?.();
    this.lighting?.dispose?.();
    this.dayNight?.dispose?.();
    this.cameraRig?.dispose?.();
    this.environment?.dispose?.();
    this.grass?.dispose?.();
    this.grassTexture?.dispose?.();
    this.barriers?.dispose?.();
    this.grass = null;
    this.grassTexture = null;
    this.barriers = null;
    this.skyDome?.dispose?.();
    this.skyDome = null;
    this.trees?.dispose?.();
    this.trees = null;
    this.pit = null;
    this.towerBase = null;
    this.towerBody = null;
    this.gravelPatches = null;
    this.trackPath = null;
    this.track = null;
    this.trackLights = null;
    this.checkpoints = null;
    this.collider = null;
    this.car = null;
    this.collectibles = null;
    this.effects = null;
    this.lapTimer = null;
    this.lighting = null;
    this.dayNight = null;
    this.cameraRig = null;
    this.environment = null;
    this.barriers = null;
  }

  getTrackDefinition() {
    return {
      id: 'silverstone',
      name: 'Silverstone',
      width: 1.68,
      samples: 600,
      curveTension: 0.5,
      points: SILVERSTONE_POINTS,
    };
  }

  /** Silverstone lighting presets. Day: diffuse overcast, soft shadows, light
   * fog. Night: tall floodlight towers along the straights, restrained bloom. */
  getLightingPresets() {
    return {
      day: Object.freeze({
        label: 'Day',
        keyLight: {
          color: 0xe8e8e8, // diffuse grey-white overcast
          intensity: 1.2,
          position: [0, 4, 0],
          target: [0, 0.6, 1.2],
        },
        hemisphere: {
          sky: 0xc8d8e0,
          ground: 0xb8c8b8,
          intensity: 0.5,
        },
        ambient: { color: 0xe0e0e0, intensity: 0.2 },
        roomFill: { color: 0xe0e0e0, intensity: 0.1, position: [0, 0, 0], target: [0, 0, 0] },
        deskLamp: { color: 0xffb968, intensity: 0 },
        bedsideLamp: { color: 0xffb968, intensity: 0 },
        ledStrip: { color: 0xffc20e, intensity: 0.02 },
        fairyLights: { color: 0xffd48a, intensity: 0 },
        nightLight: { color: 0xffb968, intensity: 0 },
        carHeadlights: { intensity: 0 },
        carTailLights: { intensity: 0 },
        window: {
          skyTop: 0x9cc8ee,
          skyBottom: 0xe8f3fb,
          starsOpacity: 0,
        },
        environmentIntensity: ENVIRONMENT.intensity,
        exposure: 1.0,
        fog: { near: 40, far: 200, color: 0xd8d8d8 },
        bloomStrength: 0.08,
      }),
      night: Object.freeze({
        label: 'Night',
        keyLight: {
          color: 0x8a94a6,
          intensity: 0.12,
          position: [0, 4, 0],
          target: [0, 0.6, 1.2],
        },
        hemisphere: {
          sky: 0x0a1220,
          ground: 0x0a1220,
          intensity: 0.08,
        },
        ambient: { color: 0x0a0f18, intensity: 0.03 },
        roomFill: { color: 0x0a0f18, intensity: 0.02, position: [0, 0, 0], target: [0, 0, 0] },
        deskLamp: { color: 0xffb968, intensity: 0 },
        bedsideLamp: { color: 0xffb968, intensity: 0 },
        ledStrip: { color: 0xffc20e, intensity: 0.02 },
        fairyLights: { color: 0xffd48a, intensity: 0 },
        nightLight: { color: 0xffb968, intensity: 0 },
        carHeadlights: { intensity: 1.2 },
        carTailLights: { intensity: 0.6 },
        window: {
          skyTop: 0x081226,
          skyBottom: 0x081226,
          starsOpacity: 0,
        },
        environmentIntensity: 0.04,
        exposure: 1.0,
        fog: { near: 40, far: 200, color: 0x10141c },
        bloomStrength: 0.4,
      }),
    };
  }

  /** Silverstone camera setups: 6 broadcast trackside positions around the
   * circuit plus an aerial view from the track bounding box. None of the
   * broadcast shots sit inside grandstands or the pit/control tower. */
  getCameraSetups() {
    // Broadcast shots, placed at u values chosen to avoid grandstands and the
    // pit/control tower. Grandstands sit at u ~0.015, 0.030 (banked up at the
    // start straight) and u ~0.14, 0.24 (corner exits). Pit/control tower are
    // at u ~0.02.
    const silverstoneShots = [
      Object.freeze({
        id: 'start-straight',
        position: Object.freeze([-30, 1.2, -36.5]),
      }),
      Object.freeze({
        id: 'first-corner',
        position: Object.freeze([2, 1.4, 6.5]),
      }),
      Object.freeze({
        id: 'middle-straight',
        position: Object.freeze([30, 1.2, 18]),
      }),
      Object.freeze({
        id: 'last-corner',
        position: Object.freeze([-35, 1.4, -20]),
      }),
      Object.freeze({
        id: 'full-circuit',
        position: Object.freeze([0, 1.6, 1.5]),
      }),
      Object.freeze({
        id: 'finish-line',
        position: Object.freeze([-30, 1.2, -30]),
      }),
    ];

    // Aerial view: computed from the track bounding box. The 39-point Silverstone
    // track spans x in [-44.2, 44.7] and z in [-37.3, 40.2]; center is
    // approximately (0.25, 1.45), so place the aerial camera 50 units out
    // directly over the centre, pointing straight down.
    const trackPoints = SILVERSTONE_POINTS;
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const p of trackPoints) {
      minX = Math.min(minX, p[0]);
      maxX = Math.max(maxX, p[0]);
      minZ = Math.min(minZ, p[2]);
      maxZ = Math.max(maxZ, p[2]);
    }
    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const aerial = Object.freeze({
      id: 'aerial',
      position: Object.freeze([cx, 55, cz]),
      // Point the camera straight down onto the track.
      target: Object.freeze([cx, 0, cz]),
    });

    const base = CAMERA_MODES.map((mode) => {
      const shots = mode.id === 'broadcast'
        ? [...mode.shots, ...silverstoneShots, aerial]
        : mode.shots;
      return { ...mode, shots };
    });
    return base;
  }

  /** Silverstone ambience: wind over the open straights, crowd swells near the
   * grandstands. Web Audio only, no external assets. */
  getAmbience() {
    return {
      type: 'webaudio',
      params: {
        wind: {
          frequency: 0.08,
          bandpass: 400,
          gain: 0.3,
        },
        crowd: {
          frequency: 0.25,
          bandpass: 2500,
          gain: 0.12,
          burstInterval: 3.2,
        },
      },
    };
  }

  /** Spawn on the first control point, facing along the track direction.
   * The first point is [-36.2, 0.02, -35.6]; the second is [-27.4, 0.02, -35.6],
   * so the car moves in +X direction. */
  getSpawn() {
    const frame = this.trackPath.getFrameAt(0);
    return {
      position: frame.position.clone(),
      tangent: frame.tangent.clone(),
    };
  }
}
