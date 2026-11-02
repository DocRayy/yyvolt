/**
 * src/environments/BedroomEnvironment.js
 *
 * The default V2 environment: a toy F1 track laid across the kid's bedroom.
 *
 * Wraps the EXISTING world/ and track code. build(ctx) creates every module
 * Game.js already constructs; dispose() tears it all down again. Nothing here is
 * a rewrite of the existing world/track code: BedroomEnvironment is an adapter
 * so EnvironmentManager can swap environments without touching Game.js.
 */

import { Environment } from './Environment.js';
import { TRACK } from '../config/track.config.js';
import { DAY_PRESET, NIGHT_PRESET } from '../config/lighting.config.js';
import { CAMERA_MODES } from '../config/cameras.config.js';
import { ENVIRONMENT } from '../config/constants.js';
import { Room } from '../world/Room.js';
import { Furniture } from '../world/Furniture.js';
import { Props } from '../world/Props.js';
import { NightDecor } from '../world/NightDecor.js';
import { TrackPath } from '../track/TrackPath.js';
import { TrackBuilder } from '../track/TrackBuilder.js';
import { TrackLights } from '../track/TrackLights.js';
import { Checkpoints } from '../track/Checkpoints.js';
import { TrackCollider } from '../track/TrackCollider.js';
import { ToyF1Car } from '../car/ToyF1Car.js';
import { Collectibles } from '../gameplay/Collectibles.js';
import { Effects } from '../car/Effects.js';
import { LapTimer } from '../gameplay/LapTimer.js';
import { LightingRig } from '../lighting/LightingRig.js';
import { DayNightController } from '../lighting/DayNightController.js';
import { CameraRig } from '../camera/CameraRig.js';
import { EnvironmentMap } from '../world/EnvironmentMap.js';

export class BedroomEnvironment extends Environment {
  constructor() {
    super();
    // The room has a ceiling above the furniture and track.
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
      trackPath: sharedTrackPath = null,
    } = ctx;

    // --- World ---
    this.room = new Room(textures);
    this.furniture = new Furniture(textures);
    this.props = new Props();
    this.nightDecor = new NightDecor();

    // Static batching is done inside the existing world modules.
    batchStaticMeshes(this.room.group);
    batchStaticMeshes(this.furniture.group);
    batchStaticMeshes(this.props.group);

    scene.add(
      this.room.group,
      this.furniture.group,
      this.props.group,
      this.nightDecor.group,
    );

    // --- Track ---
    this.trackPath = sharedTrackPath ?? new TrackPath();
    this.track = new TrackBuilder(this.trackPath, textures);
    this.trackLights = new TrackLights(this.trackPath);
    this.checkpoints = new Checkpoints(this.trackPath);
    this.collider = new TrackCollider(this.trackPath, { bus });

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
      this.car.group,
      this.collectibles.group,
      this.effects.group,
    );
    scene.updateMatrixWorld(true);

    // --- Lighting + camera + environment ---
    this.lighting = new LightingRig({
      lampAnchors: this.furniture.lampAnchors,
      maxDynamicLights: profile.maxDynamicLights,
    });
    scene.add(this.lighting.group);

    this.dayNight = new DayNightController({
      bus,
      lighting: this.lighting,
      window: this.room.window,
      furniture: this.furniture,
      nightDecor: this.nightDecor,
      trackLights: this.trackLights,
      car: this.car,
      renderer,
      scene,
    });

    this.cameraRig = new CameraRig({
      car: this.car,
      bus,
      room: this.room,
      blockers: [this.room.group, this.furniture.group, this.props.group],
    });

    this.environment = new EnvironmentMap(renderer);
    scene.environment = this.environment.create();
    scene.environmentIntensity = ENVIRONMENT.intensity;
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
  }

  getTrackDefinition() {
    return TRACK;
  }

  getLightingPresets() {
    return { day: DAY_PRESET, night: NIGHT_PRESET };
  }

  getCameraSetups() {
    return CAMERA_MODES;
  }

  getAmbience() {
    return ENVIRONMENT;
  }

  getSpawn() {
    const frame = this.trackPath.getFrameAt(0);
    return { position: frame.position.clone(), tangent: frame.tangent.clone() };
  }
}
