# YYVOLT

A premium toy-scale Formula 1 racing game that takes place in one kid's bedroom.
You drive a plastic F1 car across a bedroom circuit, past the bed, desk, bookshelf,
toy box, and under the bed frame. The presentation borrows the language of an F1
television broadcast and the material feel of molded toy plastic.

The project uses Vite and vanilla JavaScript. There are no downloaded models,
textures, or audio files: every mesh is built from three primitives, every texture
is painted with a canvas, and every sound is synthesized with the Web Audio API.

## Run it

Requirements: Node.js 20.19 or newer and a browser with WebGL 2.

```bash
npm install
npm run dev
```

Open the URL Vite prints, normally `http://127.0.0.1:5173`.

```bash
npm run build     # production bundle in dist/
npm run preview   # serve the production bundle locally
```

On Windows PowerShell, if script execution is restricted, use `npm.cmd run dev`
and `npm.cmd run build`.

## Controls

| Action | Keys |
| --- | --- |
| Accelerate | W or Up |
| Brake and reverse | S or Down |
| Steer | A / D or Left / Right |
| Handbrake and drift | Space |
| Boost | Shift |
| Reset to last checkpoint | R |
| Cockpit, T-cam, nose, chase, wheel, broadcast, aerial | 1 to 7 |
| Cycle camera | C |
| Day / night | L |
| Mute / background music | M / B |
| Pause | P or Esc |
| Show or hide the controls panel | H |
| Fullscreen | F |

The controls panel, menu, and pause screen all read the same binding table in
`src/config/controls.config.js`. Change a key once and it updates everywhere.

### Touch

Phones and tablets use an on-screen layout built for two thumbs:

- Left thumb: two large steering pads with analog, smoothed output.
- Right thumb: Gas, Brake, Boost, and Drift. Gas is the largest button; every
  control is at least 56 px with a 12 px gap.
- Top edge: Pause, Camera, and Day/Night, each at least 44 px.
- The compact Controls button under the minimap opens a short in-race help panel.
  The desktop keyboard panel is not shown on touch devices.

Every control uses Pointer Events and tracks its own `pointerId`, so steering and
pedals work at the same time. `InputManager` merges keyboard and touch into one
input state, and `CarPhysics` consumes only the merged throttle, brake, steer,
handbrake, and boost values. The game never branches on device type in physics.

The pause screen also contains two optional settings:

- Tilt steering: off by default. On iOS it asks for motion permission after the
  tap, reports a missing sensor instead of failing silently, and falls back to
  the steering pads.
- Vibration: on where supported. Boost starts, collisions, and setting changes
  use short pulses through `navigator.vibrate`; the row is hidden when the API is
  unavailable.

Touch layout numbers and pulse durations live in `src/config/touch.config.js`.
The visual rules are in `src/ui/styles/mobile.css`.

## Architecture at a glance

```
index.html              boot shell and canvas
src/main.js             starts Game and owns the loading overlay
src/core/Game.js        renderer, scene, loop, system wiring
src/core/EventBus.js    the only cross-module communication channel
src/core/FixedTimestep.js  60 Hz simulation with render interpolation
src/core/DeviceProfile.js  touch/mobile detection and starting quality
src/core/QualityManager.js adaptive graphics tiers
```

`Game` builds the world once and then runs one animation loop:

1. Advance the fixed-step simulation (car physics, race rules, collisions).
2. Interpolate the car transform for the render clock.
3. Update effects, day/night blending, audio, cameras, HUD, and quality monitoring.
4. Render the scene through the post-processing composer.

Modules do not reach into each other to change state. They emit and listen to
events such as `camera:changed`, `daynight:changed`, `lap:complete`,
`car:collide`, and `boost:start` on the shared `EventBus`.

### Main systems

| Area | Entry point | Notes |
| --- | --- | --- |
| World | `src/world/` | Room shell, furniture, props, generated textures, window sky, PMREM environment |
| Lighting | `src/lighting/` | One lighting rig, day/night presets blended over 1.5 seconds |
| Track | `src/track/` | Closed Catmull-Rom circuit, ribbon mesh, LED edges, ordered checkpoints |
| Car | `src/car/` | Procedural toy F1 model, camera mounts, arcade physics, effects |
| Cameras | `src/camera/` | One real camera, seven selectable modes, 0.5 s eased transitions |
| Gameplay | `src/gameplay/` | Three-lap timing, checkpoints, collectibles, race lifecycle |
| Audio | `src/audio/` | Synthesized engine, tyres, impacts, UI, ambience, music |
| Input | `src/input/` | Keyboard and Pointer Events merged into one smoothed input state |
| UI | `src/ui/` | HUD, start lights, minimap, controls panel, menus, toasts |
| Post | `src/postfx/` | Bloom, vignette, tone mapping, sRGB output |

## Rendering

The renderer uses ACES Filmic tone mapping, sRGB output, PCF shadows, and a
pixel-ratio cap. Shadow maps are cached because the room is static; the car's
shadow is refreshed at a low rate only while it moves.

`PostProcessing` builds one `EffectComposer` chain:

```
RenderPass -> UnrealBloomPass -> Vignette ShaderPass -> OutputPass
```

Bloom is deliberately restricted to real emitters. The high-pass threshold sits
above ordinary lamplit plaster, so the room stays warm and matte instead of
turning into a neon scene. Vignette is a very weak multiply, applied in linear
HDR before `OutputPass` performs tone mapping and sRGB conversion.

At boot, `Game.prewarm()` renders the room through every camera in both lighting
states with the full post chain active. This compiles the shaders behind the
loading screen, so switching camera or day/night during a race does not cause a
compile hitch.

### Adaptive quality

`QualityManager` samples average frame rate after a short warmup. If the game
stays below 50 FPS for three seconds, it steps down one tier:

| Tier | Pixel ratio cap | Shadow map | Bloom |
| --- | --- | --- | --- |
| High | 2.0 | 2048 | On |
| Medium | 1.5 | 1024 | On, 65% strength |
| Mobile (shown as Medium) | 1.5 | 1024 | Off |
| Low | 1.0 | 512 | Off |

The internal `mobile` preset is labeled "Medium" for the player because it keeps
the same resolution and shadow budget as the desktop middle tier; the difference
is that mobile bloom stays off. Phones step from `mobile` to `low`, not through
the desktop `medium` tier.

It never steps back up automatically; a resolution or shadow change during a
race is more distracting than a little headroom. Each downgrade shows a neutral
toast such as "Graphics set to medium".

The presets and monitor thresholds live in `src/config/quality.config.js`.
`DeviceProfile` chooses the starting tier before the renderer exists: High on
desktop, Mobile on phones and tablets, or Low on very constrained mobile
hardware. That decision also disables antialiasing, caps the mobile light budget
at one practical lamp plus one headlight, and reduces dust and skid emission.
The same frame-rate monitor continues from that starting point.

Phones play in landscape. If the viewport turns portrait, `Game` holds the
render loop and simulation and `AudioManager` suspends the context behind the
"Rotate your device to play" message. Turning the device back resumes the same
race without a catch-up physics step.

The touch HUD uses `clamp()`/`vmin` sizing, `100dvh`, and
`env(safe-area-inset-*)` on every edge element. Under 700 px the timing tower
drops Last and Delta, the minimap shrinks, and the speed plate stays centered in
the gap between the two thumb clusters. Menu, pause, and result screens become a
single column with full-width buttons and no horizontal scrolling.

## Tuning

Most numbers a designer wants to change are in `src/config/`.

| File | What it controls |
| --- | --- |
| `constants.js` | Renderer limits, room shell, furniture layout, props, light shadow limits |
| `car.config.js` | Car dimensions, physics, boost, lights, camera mounts, effects |
| `track.config.js` | Control points, track width, kerbs, arch, LED strips, checkpoints |
| `cameras.config.js` | Per-camera FOV, damping, offsets, shake, broadcast shots |
| `controls.config.js` | Every keyboard binding and the generated controls UI |
| `lighting.config.js` | Day and night light presets, window colours, bloom strengths |
| `postfx.config.js` | Bloom threshold/radius and vignette falloff |
| `quality.config.js` | Quality tiers and automatic downgrade thresholds |
| `touch.config.js` | Touch pad sizes, gaps, tilt dead zone/timeout, vibration pulses |
| `audio.config.js` | Synth levels, engine ranges, ambience and music timing |
| `race.config.js` | Lap count, HUD update rate, speed unit scale, race rules |

Units are world units and seconds. The bedroom is roughly 12 x 3.5 x 10 units.
Speed shown in the HUD is converted by `RACE.hud.speedScale`; the car's internal
speed remains in world units per second.

## Adding a camera mode

1. Add an entry to `CAMERA_MODES` in `src/config/cameras.config.js` with a unique
   `id`, display `name`, `fov`, and any mode-specific numbers.
2. Create a mode class in `src/camera/modes/` exposing:
   - `enter()`
   - `exit()`
   - `update(dt, carState, outPose)`
   - optional `snap()`
3. Import it in `src/camera/CameraRig.js`, add it to the `modes` object, and add a
   binding in `controls.config.js` if it needs its own key.
4. Add a mount point in `CarModel.buildMounts()` only if the view is attached to
   the car. `CameraRig` handles the 0.5 s pose/FOV blend and the camera toast.

The boot pre-warm uses `CameraRig.order`, so a registered mode is warmed
automatically.

## Assets and audio

- Textures are generated at runtime by `src/world/TextureFactory.js` and by
  individual props that need a special canvas.
- The environment map is a PMREM generated from three's procedural
  `RoomEnvironment`; no HDR file is loaded.
- All sounds are synthesized by `SoundSynth`, `Ambience`, and `MusicLoop`.
  The `AudioContext` is created on the first user gesture.
- Fonts are loaded from Google Fonts with system fallbacks, so the game still
  works offline.

## Performance notes

- Do not create vectors, materials, geometries, or lights inside render or fixed
  update loops. Reuse the pre-allocated instances.
- Prefer `InstancedMesh` for repeated track and room details. Static room meshes
  are collapsed once by `StaticBatcher`.
- Keep dynamic shadow-casting lights low. The rig uses one shadow-casting key
  light; practical lamps are point lights without shadows.
- If a new effect needs a shader, create its material during boot so the pre-warm
  pass can compile it.
- Check the production build after changes:

```bash
npm.cmd run build
```

The only expected warning is Vite's note that the single three.js bundle is
larger than 700 kB. The game is one route by design.

## Troubleshooting

**The screen is black or boot stops.** The browser or GPU may not support WebGL.
Use a current browser with hardware acceleration enabled. The loading screen
reports a boot failure if initialisation throws.

**The game is slow.** Wait a few seconds: adaptive quality should step down. If
it stays slow at Low, close other GPU-heavy tabs or check that hardware
acceleration is on.

**No sound.** Browsers require a click or key press before audio can start.
Press a key or click Start race, then check that M is not muting the master bus.
On a phone or tablet, the first tap on Start race unlocks audio.

**Touch controls do not appear.** They are shown only when the browser reports a
coarse pointer. A touch-enabled laptop with a mouse keeps the desktop layout by
design; use the keyboard panel there.

**Tilt steering does nothing.** Enable it in the pause screen, keep the device in
landscape, and allow motion access if the browser asks. If the device has no
orientation sensor, the row disappears and the steering pads remain available.

**A key does nothing.** Confirm the binding in `src/config/controls.config.js`;
the controls panel and menu are generated from that file.
