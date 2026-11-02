# Folder structure (follow exactly)
```
yyvolt/
├─ AGENTS.md
├─ index.html
├─ package.json
├─ vite.config.js
└─ src/
   ├─ main.js
   ├─ config/
   │  ├─ constants.js             # physics, colors, sizes, tuning numbers
   │  ├─ cameras.config.js        # per-camera FOV, offsets, damping
   │  ├─ lighting.config.js       # day & night presets (colors, intensities)
   │  └─ controls.config.js       # single source of truth for key bindings
   ├─ core/
   │  ├─ Game.js                  # orchestrator
   │  ├─ GameState.js             # BOOT → MENU → COUNTDOWN → RACING → PAUSED → FINISHED
   │  ├─ FixedTimestep.js         # fixed physics step + render interpolation
   │  ├─ QualityManager.js        # auto quality scaling (pixel ratio, shadows, bloom)
   │  ├─ DeviceProfile.js         # detects touch/mobile, picks the starting quality preset
   │  └─ EventBus.js
   ├─ input/
   │  ├─ InputManager.js          # merges keyboard + touch into one smoothed input state
   │  └─ TouchControls.js         # on-screen steering and pedals (touch devices only)
   ├─ world/
   │  ├─ Room.js
   │  ├─ Furniture.js
   │  ├─ Props.js
   │  ├─ Window.js                # window with procedural sky (day gradient / night stars)
   │  ├─ TextureFactory.js
   │  └─ EnvironmentMap.js        # PMREM from a procedural scene for reflections
   ├─ lighting/
   │  ├─ LightingRig.js           # all lights, created once, never recreated
   │  └─ DayNightController.js    # smooth blend between day and night presets
   ├─ track/
   │  ├─ TrackPath.js
   │  ├─ TrackBuilder.js
   │  ├─ TrackLights.js           # emissive LED edge strips (night mode)
   │  └─ Checkpoints.js
   ├─ car/
   │  ├─ ToyF1Car.js
   │  ├─ CarModel.js              # includes headlights, tail lights, camera mount points
   │  ├─ CarPhysics.js
   │  └─ Effects.js
   ├─ camera/
   │  ├─ CameraRig.js             # owns the one real camera, blends between modes
   │  └─ modes/
   │     ├─ CockpitCamera.js
   │     ├─ TCamCamera.js
   │     ├─ NoseCamera.js
   │     ├─ ChaseCamera.js
   │     ├─ WheelCamera.js
   │     ├─ BroadcastCamera.js
   │     └─ AerialCamera.js
   ├─ postfx/
   │  └─ PostProcessing.js        # subtle bloom on real emitters, light vignette
   ├─ audio/
   │  ├─ AudioManager.js
   │  └─ SoundSynth.js
   ├─ gameplay/
   │  ├─ LapTimer.js
   │  └─ Collectibles.js
   ├─ ui/
   │  ├─ HUD.js                   # timing tower, speed readout, boost bar, badges
   │  ├─ StartLights.js           # F1 start-light gantry
   │  ├─ ControlsPanel.js         # top-right shortcuts panel
   │  ├─ Menu.js                  # main menu, pause, result
   │  ├─ Toast.js
   │  ├─ Minimap.js
   │  └─ styles/
   │     ├─ theme.css             # design tokens + design plan comment
   │     ├─ hud.css
   │     ├─ menu.css
   │     └─ mobile.css            # touch layout, safe areas, small-screen overrides
   └─ utils/
      └─ math.js                  # clamp, lerp, damp, smoothstep
```

v2 adds new folders (environments/, car models, settings, select screens). See V2-SPEC.md.

## v2 additions (see docs/v2/*.md for details)
```
config/   cars.config.js, colors.config.js, environments.config.js
core/     Settings.js
input/    SteeringWheelControl.js
track/    TrackValidator.js, TrackCollider.js
car/      CarFactory.js, models/ (F1Model.js, F2Model.js, F3Model.js)
environments/  Environment.js, EnvironmentManager.js, BedroomEnvironment.js,
               MonacoEnvironment.js, SilverstoneEnvironment.js, BakuEnvironment.js,
               shared/ (Barriers, Grandstand, Buildings, Trees, WaterPlane, SkyDome, StreetLamps, AsphaltTexture)
ui/       SettingsScreen.js, GarageScreen.js, TrackSelectScreen.js
scripts/  validate-tracks.mjs   (npm script: check:tracks)
```
