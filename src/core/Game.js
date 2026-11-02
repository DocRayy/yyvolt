/**
 * Game owns the renderer, scene, input foundation, and single animation loop.
 *
 * The bedroom is composed from independent world modules. The car runs on the
 * fixed-step loop; CameraRig updates on the render clock after the car's render
 * transform is written, so every camera sees the same interpolated car pose.
 * The 1.5 s lighting blend also runs on the render clock for smoothness.
 */
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  PCFShadowMap,
  Scene,
  SRGBColorSpace,
  Timer,
  WebGLRenderer,
} from 'three';
import { AudioManager } from '../audio/AudioManager.js';
import { CameraRig } from '../camera/CameraRig.js';
import { GarageScreen } from '../ui/GarageScreen.js';
import { TrackSelectScreen } from '../ui/TrackSelectScreen.js';
import { CAR } from '../config/car.config.js';
import { COLORS, ENVIRONMENT, RENDERER, TIMING } from '../config/constants.js';
import { DAY_PRESET } from '../config/lighting.config.js';
import { InputManager } from '../input/InputManager.js';
import { TouchControls } from '../input/TouchControls.js';
import { DayNightController } from '../lighting/DayNightController.js';
import { LightingRig } from '../lighting/LightingRig.js';
import { EnvironmentMap } from '../world/EnvironmentMap.js';
import { Furniture } from '../world/Furniture.js';
import { NightDecor } from '../world/NightDecor.js';
import { Props } from '../world/Props.js';
import { Room } from '../world/Room.js';
import { batchStaticMeshes } from '../world/StaticBatcher.js';
import { TextureFactory } from '../world/TextureFactory.js';
import { Checkpoints } from '../track/Checkpoints.js';
import { TrackBuilder } from '../track/TrackBuilder.js';
import { TrackCollider } from '../track/TrackCollider.js';
import { TrackLights } from '../track/TrackLights.js';
import { TrackPath } from '../track/TrackPath.js';
import { ToyF1Car } from '../car/ToyF1Car.js';
import { Effects } from '../car/Effects.js';
import { Collectibles } from '../gameplay/Collectibles.js';
import { LapTimer } from '../gameplay/LapTimer.js';
import { RaceDirector } from '../gameplay/RaceDirector.js';
import { PostProcessing } from '../postfx/PostProcessing.js';
import { ControlsPanel } from '../ui/ControlsPanel.js';
import { Settings } from '../core/Settings.js';
import { SettingsScreen } from '../ui/SettingsScreen.js';
import { HUD } from '../ui/HUD.js';
import { LayoutDebug } from '../ui/LayoutDebug.js';
import { Menu } from '../ui/Menu.js';
import { PauseScreen } from '../ui/PauseScreen.js';
import { ResultScreen } from '../ui/ResultScreen.js';
import { RotatePrompt } from '../ui/RotatePrompt.js';
import { StartLights } from '../ui/StartLights.js';
import { DeviceProfile } from './DeviceProfile.js';
import { EventBus } from './EventBus.js';
import { FixedTimestep } from './FixedTimestep.js';
import { GAME_STATES, GameState } from './GameState.js';
import { EnvironmentManager } from '../environments/EnvironmentManager.js';
import { QualityManager } from './QualityManager.js';

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export class Game {
  constructor({ canvas }) {
    if (!canvas) throw new Error('Game needs a canvas element.');
    this.canvas = canvas;
    this.bus = new EventBus();
    this.settings = new Settings(this.bus);
    this.profile = new DeviceProfile();
    this.state = new GameState(this.bus);
    // Coarse-pointer devices get visible controls; a touch-enabled laptop with
    // a mouse keeps the desktop layout and keyboard reference.
    this.touch = this.profile.coarsePointer
      ? new TouchControls({ bus: this.bus })
      : null;
    this.input = new InputManager({ bus: this.bus, touch: this.touch });

    // Orientation is a viewport concern, not a game state: the race can stay in
    // COUNTDOWN or RACING while the loop and audio are held behind the prompt.
    this.orientationBlocked = false;
    this.orientationSyncTimer = 0;

    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.cameraRig = null;
    this.textures = null;
    this.environment = null;
    this.environmentManager = null;
    this.room = null;
    this.furniture = null;
    this.props = null;
    this.nightDecor = null;
    this.trackPath = null;
    this.track = null;
    this.trackLights = null;
    this.collider = null;
    this.checkpoints = null;
    this.car = null;
    this.effects = null;
    this.collectibles = null;
    this.lapTimer = null;
    this.race = null;
    this.hud = null;
    this.menu = null;
    this.controlsPanel = null;
    this.pauseScreen = null;
    this.resultScreen = null;
    this.rotatePrompt = null;
    this.startLights = null;
    this.layoutDebug = null;
    this.audio = null;
    this.unsubscribeSystem = null;
    this.carShadowTimer = 0;
    this.carWasMoving = false;
    this.lighting = null;
    this.dayNight = null;
    this.postProcessing = null;
    this.quality = null;

    this.timer = new Timer();
    this.timestep = new FixedTimestep({
      step: TIMING.fixedStep,
      maxSubsteps: TIMING.maxSubsteps,
      maxFrameDelta: TIMING.maxFrameDelta,
    });

    this.running = false;
    this.disposed = false;

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  /** Build the world in visible stages so the boot bar reports real work. */
  async init(onProgress = () => {}) {
    this.reportProgress = onProgress;

    this.reportProgress(0.08);
    await nextFrame();

    this.createRenderer();
    this.createTextures();
    this.reportProgress(0.24);
    await nextFrame();

    this.createScene();
    this.reportProgress(0.48);
    await nextFrame();

    this.environmentManager = new EnvironmentManager({
      bus: this.bus,
      textures: this.textures,
      renderer: this.renderer,
      profile: this.profile,
      scene: this.scene,
    });

    await this.environmentManager.load('bedroom');
    this.reportProgress(0.64);
    await nextFrame();

    this.createPostProcessing();
    this.reportProgress(0.74);
    await nextFrame();

    this.handleResize();
    this.reportProgress(0.82);
    await nextFrame();

    // Compile the room, every camera, both lighting states, and the full post
    // chain behind the loading screen. The loading bar is still up, so a few
    // hundred milliseconds of synchronous shader work is invisible to the player.
    await this.prewarm();
    this.reportProgress(0.98);
    await nextFrame();

    // The room and car are parked during boot, so the shadow map can be cached
    // until the car starts moving. This also keeps the quality changes cheap.
    this.renderer.shadowMap.autoUpdate = false;
    this.reportProgress(1);
  }

  start() {
    if (this.running || this.disposed) return;

    this.running = true;
    this.input.connect();
    this.unsubscribeSystem = this.bus.on(
      'input:action',
      this.handleSystemAction,
    );
    this.timer.reset();
    this.timestep.reset();

    this.race = new RaceDirector({
      bus: this.bus,
      state: this.state,
      trackPath: this.trackPath,
      car: this.car,
      checkpoints: this.checkpoints,
      collectibles: this.collectibles,
      effects: this.effects,
      cameraRig: this.cameraRig,
      lapTimer: this.lapTimer,
      onReset: () => {
        this.carShadowTimer = 0;
        this.requestShadowUpdate();
      },
    });
    this.createUI();

    this.applyLoadedSettings();

    this.state.set(GAME_STATES.MENU);
    this.bus.emit('game:ready');

    // Start or hold the loop according to the first real viewport. A phone that
    // opened in portrait never renders the drifting menu behind a live race.
    this.syncOrientation({ force: true });
  }

  createUI() {
    const touch = Boolean(this.touch);

    this.hud = new HUD({
      bus: this.bus,
      car: this.car,
      cameraRig: this.cameraRig,
      lapTimer: this.lapTimer,
      trackPath: this.trackPath,
    });
    this.menu = new Menu({
      bus: this.bus,
      lapTimer: this.lapTimer,
      touch,
      settingsScreen: this.settingsScreen,
      garageScreen: this.garageScreen,
    });
    this.garageScreen = new GarageScreen({
      bus: this.bus,
      car: this.car,
      scene: this.scene,
      textures: this.textures,
      touch,
    });
    this.trackSelectScreen = new TrackSelectScreen({ bus: this.bus, touch });
    this.controlsPanel = new ControlsPanel({
      bus: this.bus,
      cameraRig: this.cameraRig,
      touch,
    });
    this.pauseScreen = new PauseScreen({
      bus: this.bus,
      touch,
      settingsScreen: this.settingsScreen,
    });
    this.resultScreen = new ResultScreen({
      bus: this.bus,
      lapTimer: this.lapTimer,
      touch,
    });
    this.rotatePrompt = new RotatePrompt({ bus: this.bus });
    this.startLights = new StartLights({ bus: this.bus });
    this.layoutDebug = new LayoutDebug();

    this.unsubscribeSettings = null;
  }

  applyLoadedSettings() {
    this.applySettings(this.settings.get());
  }

  applySettings(settings) {
    // Music and effects volume are applied to the live audio graph.
    if (typeof settings.music === 'boolean') {
      this.audio?.setMusicOn(settings.music);
    }
    if (typeof settings.effectsVolume === 'number') {
      this.audio?.setSfxVolume(settings.effectsVolume);
    }
    // Quality: "auto" is the monitor's own loop; explicit tiers are applied now.
    if (settings.quality === 'auto') {
      // Leave the monitor to choose its own tier.
    } else {
      this.quality?.setLevel?.(settings.quality);
    }
    // FPS readout visibility follows the setting.
    this.hud?.setFpsEnabled(Boolean(settings.showFps));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.running = false;

    this.renderer?.setAnimationLoop(null);
    window.clearTimeout(this.orientationSyncTimer);
    this.orientationSyncTimer = 0;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener(
      'orientationchange',
      this.handleOrientationChange,
    );
    document.removeEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);

    this.unsubscribeSystem?.();
    this.unsubscribeSystem = null;
    this.layoutDebug?.dispose();
    this.layoutDebug = null;
    this.menu?.dispose();
    this.menu = null;
    this.controlsPanel?.dispose();
    this.controlsPanel = null;
    this.pauseScreen?.dispose();
    this.pauseScreen = null;
    this.resultScreen?.dispose();
    this.resultScreen = null;
    this.touch?.dispose();
    this.touch = null;
    this.rotatePrompt?.dispose();
    this.rotatePrompt = null;
    this.startLights?.dispose();
    this.startLights = null;
    this.hud?.dispose();
    this.hud = null;
    this.race?.dispose();
    this.race = null;
    this.lapTimer?.dispose();
    this.lapTimer = null;

    this.audio?.dispose();
    this.audio = null;
    this.dayNight?.dispose();
    this.dayNight = null;
    this.effects?.dispose();
    this.effects = null;
    this.collectibles?.dispose();
    this.collectibles = null;
    this.cameraRig?.dispose();
    this.cameraRig = null;
    this.quality?.dispose();
    this.quality = null;
    this.postProcessing?.dispose();
    this.postProcessing = null;
    this.camera = null;
    this.input.dispose();

    this.scene?.traverse((object) => {
      if (!object.geometry) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) material?.dispose();
    });

    this.scene && (this.scene.environment = null);
    this.textures?.dispose();
    this.environment?.dispose();
    this.timer.dispose();
    this.renderer?.dispose();
    this.bus.clear();
  }

  createRenderer() {
    const renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: RENDERER.antialias && this.profile.antialias,
      powerPreference: 'high-performance',
    });

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = DAY_PRESET.exposure;
    renderer.shadowMap.enabled = true;
    // three r186 removed PCFSoftShadowMap; PCFShadowMap is the supported soft
    // filter and avoids the engine's deprecation warning.
    renderer.shadowMap.type = PCFShadowMap;

    this.renderer = renderer;
  }

  createTextures() {
    this.textures = new TextureFactory(this.renderer);
  }

  createScene() {
    const scene = new Scene();
    scene.background = new Color(COLORS.liveryNavy);

    this.room = new Room(this.textures);
    this.furniture = new Furniture(this.textures);
    this.props = new Props();
    this.nightDecor = new NightDecor();

    // Everything here is static, so collapse it before the first render. The
    // track is built after batching because it has its own instanced details
    // and animated LED materials; the car is dynamic and must stay unbatchable.
    batchStaticMeshes(this.room.group);
    batchStaticMeshes(this.furniture.group);
    batchStaticMeshes(this.props.group);

    scene.add(
      this.room.group,
      this.furniture.group,
      this.props.group,
      this.nightDecor.group,
    );

    this.trackPath = new TrackPath();
    this.track = new TrackBuilder(this.trackPath, this.textures);
    this.trackLights = new TrackLights(this.trackPath);
    this.checkpoints = new Checkpoints(this.trackPath);
    this.collider = new TrackCollider(this.trackPath, { bus: this.bus });
    this.car = new ToyF1Car({
      trackPath: this.trackPath,
      textures: this.textures,
      checkpoints: this.checkpoints,
      collider: this.collider,
      bus: this.bus,
      maxDynamicLights: this.profile.maxDynamicLights,
    });
    this.collectibles = new Collectibles({
      trackPath: this.trackPath,
      car: this.car,
      bus: this.bus,
    });
    this.effects = new Effects({
      car: this.car,
      mobile: this.profile.isMobile,
    });
    this.lapTimer = new LapTimer({ bus: this.bus });
    scene.add(
      this.track.group,
      this.trackLights.group,
      this.car.group,
      this.collectibles.group,
      this.effects.group,
    );
    scene.updateMatrixWorld(true);

    this.lighting = new LightingRig({
      lampAnchors: this.furniture.lampAnchors,
      maxDynamicLights: this.profile.maxDynamicLights,
    });
    scene.add(this.lighting.group);

    this.dayNight = new DayNightController({
      bus: this.bus,
      lighting: this.lighting,
      window: this.room.window,
      furniture: this.furniture,
      nightDecor: this.nightDecor,
      trackLights: this.trackLights,
      car: this.car,
      renderer: this.renderer,
      scene,
    });

    // CameraRig owns the only real camera. The static groups double as chase
    // camera blockers, so the follow camera cannot sit inside the bed or a wall.
    this.cameraRig = new CameraRig({
      car: this.car,
      bus: this.bus,
      room: this.room,
      blockers: [
        this.room.group,
        this.furniture.group,
        this.props.group,
      ],
    });

    // Audio starts lazily on the first gesture, but it can be constructed now
    // so it sees every event from the moment the game is ready.
    this.audio = new AudioManager({ bus: this.bus, car: this.car });

    this.scene = scene;
    this.camera = this.cameraRig.camera;
    this.createColliderDebug();
  }

  /**
   * `?debug=colliders` draws the invisible walls so a designer can see exactly
   * where the car is allowed to go. Development tool only: no UI, no state.
   */
  createColliderDebug() {
    const requested = new URLSearchParams(window.location.search).get('debug');
    if (requested !== 'colliders' || !this.collider) return;

    const { left, right } = this.collider.getDebugEdges();
    const material = new LineBasicMaterial({ color: COLORS.liveryYellow });

    for (const edge of [left, right]) {
      const geometry = new BufferGeometry();
      geometry.setAttribute('position', new BufferAttribute(edge, 3));
      const line = new Line(geometry, material);
      line.frustumCulled = false;
      line.name = 'Collider wall';
      this.scene.add(line);
    }
  }

  createPostProcessing() {
    this.postProcessing = new PostProcessing({
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
    });
    this.postProcessing.setBloomStrength(this.dayNight.bloomStrength);

    this.quality = new QualityManager({
      bus: this.bus,
      renderer: this.renderer,
      lighting: this.lighting,
      postProcessing: this.postProcessing,
      profile: this.profile,
    });
  }

  /**
   * Render every camera in daylight and at night once, with the full bloom and
   * output chain active. Camera selection is temporary and restored before the
   * menu appears, so this only warms the shader cache.
   */
  async prewarm() {
    if (!this.postProcessing || !this.cameraRig) return;

    const originalCameraId = this.cameraRig.currentId;
    const originalMix = this.dayNight.mix;
    const cameraIds = this.cameraRig.order;
    const totalPasses = 2 * cameraIds.length;
    let pass = 0;

    // Nothing moves during boot, so one shadow build is enough.
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    for (const mix of [0, 1]) {
      this.dayNight.apply(mix);
      this.postProcessing.setBloomStrength(this.dayNight.bloomStrength);

      for (const cameraId of cameraIds) {
        this.cameraRig.select(cameraId, { instant: true, announce: false });
        this.renderer.compile(this.scene, this.camera);
        this.postProcessing.render(0);

        pass += 1;
        this.reportProgress(0.82 + (pass / totalPasses) * 0.14);
        await nextFrame();
      }
    }

    this.dayNight.apply(originalMix);
    this.postProcessing.setBloomStrength(this.dayNight.bloomStrength);
    this.cameraRig.select(originalCameraId, {
      instant: true,
      announce: false,
    });

    this.renderer.compile(this.scene, this.camera);
    this.postProcessing.render(0);
    this.requestShadowUpdate();
  }

  handleSystemAction = ({ action } = {}) => {
    if (action === 'system.fullscreen') this.toggleFullscreen();
  };

  toggleFullscreen() {
    const root = document.documentElement;

    try {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      } else {
        root.requestFullscreen?.().catch(() => {});
      }
    } catch {
      // iOS Safari does not allow fullscreen on non-video elements; the game
      // already fills the viewport, so there is nothing else to do.
    }
  }

  handleResize = () => {
    if (!this.renderer || !this.camera) return;

    this.profile.refresh();
    const width = Math.max(window.innerWidth, 1);
    const height = Math.max(window.innerHeight, 1);
    const aspect = width / height;
    let pixelRatio;

    if (this.quality) {
      pixelRatio = this.quality.setSize(width, height);
    } else {
      pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        RENDERER.maxPixelRatio,
      );
      this.renderer.setPixelRatio(pixelRatio);
      this.renderer.setSize(width, height);
      this.postProcessing?.setSize(width, height);
    }

    // CameraRig applies the portrait FOV boost itself; this only changes aspect.
    this.cameraRig.setAspect(aspect);

    this.bus.emit('renderer:resize', { width, height, pixelRatio });

    // UI may not exist yet during boot; the first start() performs this check.
    if (this.rotatePrompt) this.syncOrientation();
  };

  handleOrientationChange = () => {
    // Some browsers report the old viewport for one frame after the event.
    // Recheck after the resize queue has settled, then let the event bus move
    // the prompt without the render loop.
    window.clearTimeout(this.orientationSyncTimer);
    this.orientationSyncTimer = window.setTimeout(() => {
      this.orientationSyncTimer = 0;
      // Some mobile browsers fire orientationchange before they publish the new
      // size. Re-read it here so the canvas and camera aspect always match the
      // final viewport; handleResize also runs the orientation gate.
      this.profile.refresh();
      this.handleResize();
    }, 120);
  };

  /**
   * Phones play in landscape. While the viewport is portrait, hold the race
   * exactly where it is: no simulation, no rendering, no audio. Rotating back
   * resets the clocks so the paused interval never becomes a physics step.
   */
  syncOrientation({ force = false } = {}) {
    this.profile.refresh();
    const blocked = this.profile.isMobile && this.profile.isPortrait();

    if (!force && blocked === this.orientationBlocked) return;
    this.orientationBlocked = blocked;
    this.input.reset();
    this.audio?.setInterrupted(blocked);
    this.bus.emit('orientation:blocked', { blocked, portrait: blocked });

    if (blocked || document.hidden) {
      this.renderer?.setAnimationLoop(null);
      return;
    }

    this.resumeLoop();
  }

  handleVisibilityChange = () => {
    if (!this.renderer || !this.running) return;

    if (document.hidden) {
      this.input.reset();
      this.renderer.setAnimationLoop(null);
      return;
    }

    // The device may have rotated while the tab was hidden, so re-evaluate the
    // gate instead of blindly starting the loop.
    this.syncOrientation({ force: true });
  };

  /** Resume only when neither the tab nor the orientation gate is holding it. */
  resumeLoop() {
    if (!this.running || this.disposed) return;
    if (document.hidden || this.orientationBlocked) return;
    if (!this.renderer) return;

    this.timer.reset();
    this.timestep.reset();
    this.quality?.resetMonitor();
    this.renderer.setAnimationLoop(this.render);
  }

  handleContextMenu = (event) => {
    // Long-press menus would interrupt steering on a phone.
    event.preventDefault();
  };

  /** Ask the renderer to rebuild the cached shadow map on the next frame. */
  requestShadowUpdate() {
    if (this.renderer) this.renderer.shadowMap.needsUpdate = true;
  }

  /**
   * The shadow map is cached for the room, so a moving car needs a low-rate
   * refresh. Stop refreshing as soon as it is parked; one final update settles
   * the shadow at the resting spot.
   */
  updateCarShadow(delta) {
    if (!this.car) return;

    const moving =
      Math.abs(this.car.physics.speed) > CAR.physics.shadowSpeedThreshold;

    if (moving) {
      this.carShadowTimer += delta;
      if (this.carShadowTimer >= CAR.physics.shadowUpdateInterval) {
        this.carShadowTimer = 0;
        this.requestShadowUpdate();
      }
    } else if (this.carWasMoving) {
      this.carShadowTimer = 0;
      this.requestShadowUpdate();
    }

    this.carWasMoving = moving;
  }

  fixedUpdate = (step) => {
    this.race?.fixedUpdate(step, this.input);
  };

  render = (timestamp) => {
    if (!this.renderer) return;

    this.timer.update(timestamp);
    const delta = this.timer.getDelta();
    const alpha = this.timestep.update(delta, this.fixedUpdate);
    this.car?.updateRender(alpha, delta);
    this.collectibles?.update(delta);
    this.effects?.update(delta);
    this.updateCarShadow(delta);
    this.dayNight?.update(delta);
    this.postProcessing?.setBloomStrength(this.dayNight?.bloomStrength ?? 0);
    this.audio?.update();
    this.cameraRig?.update(delta);
    this.hud?.update(delta);
    this.startLights?.update(delta);
    this.touch?.update?.(delta);
    this.quality?.update(delta);

    if (this.postProcessing) {
      this.postProcessing.render(delta);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
