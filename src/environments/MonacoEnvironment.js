/**
 * src/environments/MonacoEnvironment.js
 *
 * Monaco (Monte Carlo) circuit layout for V2-5a.
 *
 * Layout order, clockwise from the start/finish straight: Sainte Devote (right
 * 90 degrees), climb uphill, Massenet (left), Casino Square (right then left),
 * Mirabeau (right), the Grand Hotel hairpin (very tight left), Portier (right),
 * a straight tunnel, the harbor chicane (left-right), Tabac (right), the
 * swimming pool chicanes (left-right, right-left), La Rascasse (right),
 * Antony Noghes (right), back to the start/finish straight.
 *
 * Width 3-4 x CAR_WIDTH. Mild hill. Target lap ~60 s at the F1 car by tuning
 * the track scale.
 */

import { Environment } from './Environment.js';
import { TrackPath } from '../track/TrackPath.js';
import { TrackBuilder } from '../track/TrackBuilder.js';
import { TrackLights } from '../track/TrackLights.js';
import { Checkpoints } from '../track/Checkpoints.js';
import { TrackCollider } from '../track/TrackCollider.js';
import { Barriers } from './shared/Barriers.js';
import { Buildings } from './shared/Buildings.js';
import { Trees } from './shared/Trees.js';
import { WaterPlane } from './shared/WaterPlane.js';
import { SkyDome } from './shared/SkyDome.js';
import { YachtHulls } from './shared/YachtHulls.js';
import { StreetLamps } from './shared/StreetLamps.js';
import { ToyF1Car } from '../car/ToyF1Car.js';
import { Collectibles } from '../gameplay/Collectibles.js';
import { Effects } from '../car/Effects.js';
import { LapTimer } from '../gameplay/LapTimer.js';
import { LightingRig } from '../lighting/LightingRig.js';
import { DayNightController } from '../lighting/DayNightController.js';
import { CameraRig } from '../camera/CameraRig.js';
import { EnvironmentMap } from '../world/EnvironmentMap.js';
import { ENVIRONMENT } from '../config/constants.js';
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, PlaneGeometry, ConeGeometry, InstancedMesh, Vector3, Quaternion } from 'three';
import { CAMERA_MODES } from '../config/cameras.config.js';

export class MonacoEnvironment extends Environment {
  constructor() {
    super();
    // The room has a ceiling above the track and furniture.
    this.hasCeiling = true;
    this.skyType = 'none';
  }

  build(ctx) {
    const { bus, textures, renderer, profile, scene } = ctx;

    // --- Track ---
    this.trackPath = new TrackPath();
    this.track = new TrackBuilder(this.trackPath, textures);
    this.trackLights = new TrackLights(this.trackPath);
    this.checkpoints = new Checkpoints(this.trackPath);
    this.collider = new TrackCollider(this.trackPath, { bus });

    // --- Barriers: visible guardrails aligned with the TrackCollider walls ---
    this.barriers = new Barriers(this.trackPath, textures);

    // --- Scenery: harbour, buildings, trees, hillside ---
    this.buildScenery({ isMobile: profile.isMobile });

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
      lampAnchors: this.furniture?.lampAnchors ?? [],
      maxDynamicLights: profile.maxDynamicLights,
    });
    scene.add(this.lighting.group);

    this.dayNight = new DayNightController({
      bus,
      lighting: this.lighting,
      window: this.room?.window ?? null,
      furniture: this.furniture ?? null,
      nightDecor: this.nightDecor ?? null,
      trackLights: this.trackLights,
      car: this.car,
      renderer,
      scene,
    });

    this.cameraRig = new CameraRig({
      car: this.car,
      bus,
      room: this.room ?? null,
      blockers: [
        this.room?.group ?? new Group(),
        this.furniture?.group ?? new Group(),
        this.props?.group ?? new Group(),
      ],
    });

    this.environment = new EnvironmentMap(renderer);
    scene.environment = this.environment.create();
    scene.environmentIntensity = ENVIRONMENT.intensity;
  }

  /** Build the harbour, buildings, trees, hillside, and sky. */
  buildScenery({ isMobile }) {
    // --- Sky ---
    this.skyDome = new SkyDome(isMobile);
    this.group.add(this.skyDome.group);

    // --- Water ---
    this.water = new WaterPlane({ isMobile });
    this.group.add(this.water.group);

    // --- Yachts ---
    this.yachts = new YachtHulls({ isMobile });
    this.group.add(this.yachts.group);

    // --- Buildings: pastel blocks, hotels, and the casino ---
    this.buildings = new Buildings({ isMobile });
    this.group.add(this.buildings.group);

    // --- Trees: pines on the hillside ---
    this.trees = new Trees({ isMobile });
    this.group.add(this.trees.group);

    // --- Street lamps along the harbour front ---
    this.streetLamps = new StreetLamps({ isMobile });
    this.group.add(this.streetLamps.group);

    // --- Covered tunnel with lights ---
    this.buildCoveredTunnel();

    // --- Casino at Casino Square ---
    this.buildCasino();

    // --- Pine hillside (reuse Trees; place extra trees near the Grand Hotel
    //     hairpin which sits on a slight rise) ---
    this.buildPineHillside();
  }

  /** A low roof covering the tunnel section, with an emissive lit strip. */
  buildCoveredTunnel() {
    const tunnelU = 0.42; // ~42% along the track, matches the tunnel section
    const tunnelZ = 11.5;
    const roof = new Mesh(
      new BoxGeometry(3.6, 0.8, 3.0),
      new MeshStandardMaterial({
        color: 0x3a4a5a,
        roughness: 0.7,
        metalness: 0.05,
        transparent: true,
        opacity: 0.55,
      }),
    );
    roof.position.set(0, 1.8, tunnelZ + 0.5);
    roof.castShadow = false;
    roof.receiveShadow = true;
    this.group.add(roof);

    // Lit strip running along the tunnel roof.
    const lightStrip = new Mesh(
      new PlaneGeometry(3.6, 0.06),
      new MeshStandardMaterial({
        color: 0xffc20e,
        emissive: 0xffc20e,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.7,
      }),
    );
    lightStrip.rotation.x = -Math.PI / 2;
    lightStrip.position.set(0, 1.7, tunnelZ + 1.0);
    lightStrip.castShadow = false;
    this.group.add(lightStrip);
  }

  /** A pastel casino block near Casino Square. */
  buildCasino() {
    const casinoMat = new MeshStandardMaterial({
      color: 0xf0d8d0,
      roughness: 0.55,
      metalness: 0.02,
    });
    const casino = new Mesh(
      new BoxGeometry(1.15, 1.05, 0.75),
      casinoMat,
    );
    casino.position.set(0, 0.52, 5.5);
    casino.castShadow = true;
    casino.receiveShadow = true;
    this.group.add(casino);

    // Glass windows using the shared pastel window texture.
    const winMat = new MeshStandardMaterial({
      map: this.textures.createPastelWindows(),
      roughness: 0.35,
      metalness: 0.01,
    });
    const winFrame = new MeshStandardMaterial({
      color: 0xe8d8c8,
      roughness: 0.5,
    });
    const flatW = 1.15 / 4;
    const flatD = 0.75 / 2;
    const floorH = 1.05 / 4;
    for (let f = 0; f < 4; f += 1) {
      const fy = f * floorH + floorH / 2;
      for (let w = 0; w < 4; w += 1) {
        const wx = -1.15 / 2 + flatW / 2 + flatW * w;
        const wz = -0.75 / 2 + flatD / 2;
        // Frame
        const frame = new Mesh(
          new BoxGeometry(1, 0.045, flatD - 0.01),
          winFrame,
        );
        frame.position.set(wx, fy + 0.022, wz - flatD / 2 + flatD / 4);
        frame.castShadow = true;
        this.group.add(frame);
        const frame2 = new Mesh(
          new BoxGeometry(flatW - 0.01, 0.045, 1),
          winFrame,
        );
        frame2.position.set(wx - flatW / 2 + flatW / 4, fy + 0.022, wz);
        frame2.castShadow = true;
        this.group.add(frame2);
        // Pane
        const pane = new Mesh(
          new PlaneGeometry(flatW - 0.03, flatD - 0.03),
          winMat,
        );
        pane.position.set(wx, fy + 0.065, wz);
        pane.rotation.x = -Math.PI / 2;
        pane.castShadow = false;
        pane.receiveShadow = true;
        this.group.add(pane);
      }
    }
    // Striped awning
    const awning = new Mesh(
      new PlaneGeometry(1.27, 0.08),
      new MeshStandardMaterial({
        color: 0xffc20e,
        roughness: 0.45,
      }),
    );
    awning.rotation.x = -Math.PI / 2;
    awning.position.set(0, 0.96, 0.345);
    awning.castShadow = false;
    awning.receiveShadow = true;
    this.group.add(awning);
  }

  /** Pine trees on the hillside near the Grand Hotel hairpin. */
  buildPineHillside() {
    // A single Trees instance for the hillside.
    const hillsideTrees = new Trees({ isMobile: false });
    this.group.add(hillsideTrees.group);
    this.trees = hillsideTrees;

    // Extra individual pines near the Grand Hotel hairpin.
    const extras = [
      { x: 2.2, z: 8.2 },
      { x: 2.8, z: 8.6 },
      { x: 3.0, z: 9.0 },
      { x: 2.5, z: 9.4 },
      { x: 1.8, z: 8.0 },
      { x: 3.2, z: 7.6 },
      { x: 2.6, z: 9.8 },
      { x: 2.0, z: 7.4 },
    ];
    const pineGeo = new ConeGeometry(0.2, 0.4, 4);
    const pineMat = new MeshStandardMaterial({
      color: 0x2d4a2d,
      roughness: 0.9,
      flatShading: true,
    });
    for (let i = 0; i < extras.length; i += 1) {
      const e = extras[i];
      // Host tree is a quick instantiation
      const host = new InstancedMesh(pineGeo, pineMat, 1);
      host.castShadow = true;
      host.receiveShadow = true;
      host.frustumCulled = false;
      const temp = new Vector3();
      const scale = new Vector3(1, 1, 1);
      temp.set(e.x, 0.6, e.z);
      this.matrix.compose(temp, new Quaternion(), scale);
      host.setMatrixAt(0, this.matrix);
      host.instanceMatrix.needsUpdate = true;
      this.group.add(host);
    }
  }

  dispose() {
    this.room?.dispose?.();
    this.furniture?.dispose?.();
    this.props?.dispose?.();
    this.nightDecor?.dispose?.();
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
    this.barriers?.dispose?.();
    this.skyDome?.dispose?.();
    this.water?.dispose?.();
    this.yachts?.dispose?.();
    this.buildings?.dispose?.();
    this.trees?.dispose?.();
    this.room = null;
    this.furniture = null;
    this.props = null;
    this.nightDecor = null;
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
    this.skyDome = null;
    this.water = null;
    this.yachts = null;
    this.buildings = null;
    this.trees = null;
  }

  getTrackDefinition() {
    return {
      id: 'monaco',
      name: 'Monaco',
      width: 1.68,
      samples: 600,
      curveTension: 0.5,
      points: [
        // 0 Start/finish straight, heading south (-Z)
        [-40, 0.02, 0],
        [-20, 0.02, 0],
        [0, 0.02, 0],
        [20, 0.02, 0],
        [40, 0.02, 0],
        // Loop (clockwise from right end, x = 40)
        [40, 0.05, 4],
        [30, 0.08, 8],
        [20, 0.10, 12],
        [10, 0.11, 15],
        [0, 0.11, 16],
        [-10, 0.10, 15.5],
        [-18, 0.08, 14],
        [-24, 0.06, 12],
        // Grand Hotel hairpin: tight U-turn (radius ~2.8), the tightest corner
        [-22, 0.06, 10],
        [-20, 0.07, 7],
        [-18, 0.08, 4],
        [-16, 0.09, 1],
        [-14, 0.10, -2],
        [-12, 0.11, -5],
        [-10, 0.11, -8],
        [-8, 0.10, -10],
        [-6, 0.09, -10.8],
        [-4, 0.08, -10.5],
        [0, 0.09, -9.5],
        [4, 0.10, -7.5],
        [8, 0.10, -5],
        [12, 0.10, -2.5],
        [16, 0.10, 0],
        [20, 0.10, 2.5],
        [24, 0.10, 5],
        [28, 0.10, 7.5],
        [32, 0.10, 10],
        [36, 0.10, 12.2],
        [40, 0.10, 14],
        [40, 0.02, 0],
      ],
    };
  }

  /** Monaco lighting presets. Day: warm Mediterranean sun, clear sky.
   * Night: warm street lamps, lit windows, yacht lights, restrained bloom.
   */
  getLightingPresets() {
    return {
      day: Object.freeze({
        label: 'Day',
        keyLight: {
          color: 0xfff2dc, // warm sand
          intensity: 3.4,
          position: [-3.5, 4.2, -6.5],
          target: [0, 0.6, 1.2],
        },
        hemisphere: {
          sky: 0xdfeaf5,
          ground: 0xe8dccb,
          intensity: 0.9,
        },
        ambient: { color: 0xfff4e6, intensity: 0.35 },
        roomFill: {
          color: 0xfff6e8,
          intensity: 0.4,
          position: [4.5, 3.5, -2],
          target: [0, 1, 1],
        },
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
        exposure: 1.05,
        bloomStrength: 0.1,
      }),
      night: Object.freeze({
        label: 'Night',
        keyLight: {
          color: 0x8a94a6, // cool gray-blue
          intensity: 0.18,
          position: [-3.5, 4.2, -6.5],
          target: [0, 0.6, 1.2],
        },
        hemisphere: {
          sky: 0x2a3b5c,
          ground: 0x0a1220,
          intensity: 0.18,
        },
        ambient: { color: 0x1a2438, intensity: 0.05 },
        roomFill: {
          color: 0x22385c,
          intensity: 0.09,
          position: [4.5, 3.5, -2],
          target: [0, 1, 1],
        },
        deskLamp: { color: 0xffb968, intensity: 2.6 },
        bedsideLamp: { color: 0xffb968, intensity: 2.2 },
        ledStrip: { color: 0xffc20e, intensity: 2.5 },
        fairyLights: { color: 0xffd48a, intensity: 2.2 },
        nightLight: { color: 0xffb968, intensity: 2.2 },
        carHeadlights: { intensity: 1.6 },
        carTailLights: { intensity: 0.9 },
        window: {
          skyTop: 0x081226,
          skyBottom: 0x1a2c4a,
          starsOpacity: 1,
        },
        environmentIntensity: 0.08,
        exposure: 1.0,
        bloomStrength: 0.55,
      }),
    };
  }

  getCameraSetups() {
    // Build the same mode list as CAMERA_MODES, plus Monaco-specific broadcast
    // trackside positions. The broadcast shots reject furniture between the
    // camera and the car to avoid clipping into buildings and grandstands.
    const monacoShots = [
      Object.freeze({
        id: 'sainte-devote',
        position: Object.freeze([2.4, 1.2, 8.8]),
      }),
      Object.freeze({
        id: 'grand-hotel',
        position: Object.freeze([-1.2, 1.0, 9.3]),
      }),
      Object.freeze({
        id: 'portier',
        position: Object.freeze([-0.8, 0.9, 11.2]),
      }),
      Object.freeze({
        id: 'harbor-chicane',
        position: Object.freeze([1.8, 1.1, 12.8]),
      }),
      Object.freeze({
        id: 'tabac',
        position: Object.freeze([2.4, 1.2, 11.8]),
      }),
    ];
    const base = CAMERA_MODES.map((mode) => ({
      ...mode,
      shots: mode.id === 'broadcast' ? [...mode.shots, ...monacoShots] : mode.shots,
    }));
    return base;
  }

  /** Synthesized ambience: harbor water (low-pass noise) and distant crowd
   * (filtered random bursts). Web Audio only, no external assets. */
  getAmbience() {
    return {
      type: 'webaudio',
      params: {
        water: {
          frequency: 0.1,
          bandpass: 600,
          gain: 0.3,
        },
        crowd: {
          frequency: 0.25,
          bandpass: 2500,
          gain: 0.12,
          burstInterval: 4.0,
        },
      },
    };
  }

  getSpawn() {
    const frame = this.trackPath.getFrameAt(0);
    return {
      position: frame.position.clone(),
      tangent: frame.tangent.clone(),
    };
  }
}
