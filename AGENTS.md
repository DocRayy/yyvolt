# PROJECT: YYVOLT — a premium 3D toy F1 racing game (Three.js)

## Role
You are a senior game developer, technical artist, and patient teacher. The user will
study this code, so clarity, structure, and good comments matter. The final result must
feel like a polished, premium browser game, not a tech demo.

## Concept
YYVOLT takes place inside ONE kid's bedroom at toy scale. A plastic toy F1 track is laid
out across the room (floor, around and under the bed, past the desk, bookshelf, toy box).
The player IS a toy F1 car and only controls the car. The room is the world.

Visual identity: the language of F1 TV broadcast graphics (timing towers, start lights,
sector timing) crossed with the look of molded toy plastic. It should feel like a real
racing game that happens to be set in a bedroom, never like a neon "gamer" theme.

Palette (use only these, defined as CSS variables in theme.css):
- Livery yellow   #FFC20E  (the player's car, active/selected states, personal-best timing)
- Livery navy     #12223F  (solid panel backgrounds)
- Track orange    #F4511E  (only for track-related info: minimap track line, checkpoints)
- Kerb red        #D7263D  (warnings, wrong-way, start lights, negative delta)
- Paper           #F4F6F8  (primary text on navy)
- Steel           #8A94A6  (secondary text, borders, inactive items)
Green (#2BB673) is allowed ONLY for positive time delta. No purple, no cyan, no gradients.

## Tech stack (strict)
- Vite + vanilla JavaScript (ES modules). No TypeScript, no React.
- three (latest stable) + "three/examples/jsm/*" (EffectComposer, UnrealBloomPass,
  OutputPass, RoomEnvironment if useful).
- NO external binary assets: no downloaded models, textures, or audio files.
  - 3D models from primitives (and ExtrudeGeometry / LatheGeometry for nicer shapes).
  - Textures generated procedurally with <canvas> (CanvasTexture).
  - Sounds synthesized with the Web Audio API.
- UI fonts: Google Fonts "Barlow Condensed" (numbers, wordmark, big readouts) and
  "Barlow" (body text) via CSS <link>, with system-ui fallbacks so it works offline.
  Use font-variant-numeric: tabular-nums for every changing number so digits never jitter.
  Do NOT use Orbitron, Rajdhani, Inter, Space Grotesk, or Roboto.
- NO physics library. Write our own arcade car physics.
- Code comments and all UI text in English.

## Folder structure (follow exactly)
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

## Key bindings (defined ONCE in controls.config.js)
- Drive: W / Up = accelerate, S / Down = brake and reverse, A / Left and D / Right = steer,
  Space = handbrake and drift, Shift = boost, R = reset to last checkpoint.
- Cameras: 1 to 7 select a camera, C cycles to the next.
- Environment: L = toggle day / night.
- Audio: M = mute all, B = toggle music.
- System: P / Esc = pause, H = show or hide the controls panel, F = fullscreen.

## Architecture rules
1. One class per file, one responsibility per class. Keep files under ~250 lines.
2. All tunable numbers live in src/config/*.js. No magic numbers elsewhere.
3. Modules talk via EventBus (e.g. 'camera:changed', 'daynight:changed', 'lap:complete',
   'car:collide', 'boost:start', 'input:keystate').
4. Key bindings are defined ONCE in controls.config.js. InputManager, ControlsPanel, and
   the menu all read from it, so changing a key updates everywhere.
5. Every class has constructor(), update(dt) where relevant, and dispose() where relevant.
6. Never create objects (Vector3, Quaternion, materials, lights) inside update loops.
   Pre-allocate and reuse them.
7. Header comment in each file explaining its purpose; comments explain WHY.
8. No globals, no dead code, no console errors or warnings.

## SMOOTHNESS & FEEL (highest priority)
- Fixed timestep physics (60 Hz, max 5 substeps per frame) with render interpolation of
  the car transform, so motion is silky on 60/120/144 Hz monitors.
- Input smoothing: steering and throttle ramp toward target values (not instant),
  with speed-sensitive steering (less angle at high speed), and self-centering.
- Car feel: weight transfer (body pitch on accelerate/brake, roll in corners),
  suspension-like spring-damper on the body, wheels rotate by real speed, front wheels
  steer visually, controlled drift with Space, boost with a punchy acceleration curve.
- All cameras use frame-rate independent damping: x += (target - x) * (1 - exp(-k * dt)).
- Camera switch uses a 0.5 s eased blend (position, quaternion, FOV), never a hard cut.
- Collisions: bounce with damped impulse, no sticking to walls, no jitter, no tunneling
  at max speed (use swept checks or substeps).
- Performance: target a stable 60 FPS on a mid-range laptop. Use InstancedMesh for
  repeated items, reuse geometries/materials, cap pixel ratio at 2, shadow map 2048
  (1024 on low quality), limit dynamic lights (max 4 shadow-casting or point lights
  active at once), pool particles.
- QualityManager measures average frame time; if FPS stays below 50 for 3 seconds, step
  down quality (bloom off, shadow size down, pixel ratio down) and show a subtle toast.
- Handle resize, tab visibility (pause audio and loop when hidden), and devicePixelRatio.

## ROOM (world/)
- Room ~12 x 3.5 x 10 units: wooden floor with plank texture + soft rug, painted walls
  with posters (procedural, including a YYVOLT poster), a door, and a big window.
- Furniture from primitives, cartoonish but well-proportioned with bevels/rounded shapes:
  bed with blanket and pillows, study desk + chair + desk lamp, wardrobe, bookshelf with
  colorful books, bedside table with lamp, toy box.
- Floor props as obstacles and decoration: lego bricks, a ball, stacked books, a teddy
  bear, crayons, a toy rocket.
- Use a PMREM environment map for glossy reflections on the car and furniture.
- Renderer: ACESFilmicToneMapping, SRGBColorSpace output, PCFSoftShadowMap, shadow bias
  tuned to avoid acne and peter-panning.

## DAY / NIGHT MODE (lighting/)
- Press L (or click the HUD toggle) to switch. The transition is animated over ~1.5 s,
  smoothly blending every parameter. Lights are created ONCE in LightingRig and only
  their properties are animated.
- DAY: warm bright sunlight (DirectionalLight with soft shadows) coming through the
  window, bright sky gradient and clouds in the window, hemisphere light, light
  warm-white interior, bedside and desk lamps OFF, soft daytime room tone.
- NIGHT: dark navy interior, cool moonlight through the window with a procedural star
  sky and moon, bedside lamp and desk lamp ON (warm pools of light), fairy lights
  and an LED strip along the wall, a glowing night light, emissive LED strips along the
  track edges, car headlights (two SpotLights with soft cone) and red tail lights ON,
  bloom enabled slightly stronger, night ambience (crickets, quiet hum).
- Emissive materials must feed the bloom pass; keep the bloom threshold tuned so only
  actual light sources glow.
- Show a toast "Day mode on" / "Night mode on" and update the HUD toggle.

## CAMERA SYSTEM (camera/)
A single THREE.PerspectiveCamera is owned by CameraRig. Each mode is a class in
camera/modes/ implementing: enter(), exit(), update(dt, carState, outPose) where
outPose receives {position, quaternion, fov}. CameraRig blends from the previous pose
to the new one over 0.5 s. Camera keys: 1 to 7 select, C cycles. Show a toast with the
camera name and keep the current camera name visible in the HUD.

1. Cockpit View (key 1): driver eye position inside the cockpit, with halo, steering
   wheel and the front of the car visible. Hide the helmet in this mode. Slight head
   movement on acceleration and corners. FOV ~75.
2. T-Cam / Onboard View (key 2): camera on the airbox above and slightly behind the
   driver's helmet, showing the helmet and the front of the car. FOV ~70.
3. Nose Camera (key 3): mounted low at the front of the nose cone, looking forward,
   with the front wing edges visible at the bottom, strong sense of speed, FOV ~85.
4. Chase Camera (key 4, default): behind and above the car, smooth spring-follow,
   FOV widens with speed, subtle shake on boost and collision.
5. Side / Wheel Camera (key 5): mounted beside the car close to the front wheel,
   looking back along the body and at the wheel, with stable orientation that follows
   the car yaw. FOV ~60.
6. Trackside / Broadcast Camera (key 6): fixed camera positions placed around the
   room (under the desk, on the bed corner, on the bookshelf, near the toy box,
   by the door). The camera tracks the car smoothly with its own damping, adjusts FOV
   (zoom) based on distance, and automatically cuts (with the standard blend)
   to the best camera as the car moves through the track, like a TV broadcast.
7. Aerial / Top-Down View (key 7): high above, looking down at the room and track,
   following the car smoothly with slight look-ahead. Walls and ceiling must never
   block the view (hide or fade the ceiling in this mode).
- Camera modes must never clip into walls or furniture: apply simple obstruction
  checks or clamps for Chase and Broadcast.

## TRACK (track/)
- Closed loop from a CatmullRomCurve3 (12 to 16 control points), mostly flat on
  the floor, with one small ramp over a stack of books and one section passing under
  the bed edge if feasible.
- Ribbon mesh along the curve, width ~1.2: orange plastic asphalt look, dashed white
  center line, red-white kerbs (InstancedMesh), chunky toy-style connector joints
  every few units, checkered start/finish arch with the YYVOLT logo.
- TrackLights: emissive LED strips along the edges, subtle in day, glowing at night.
- 6 to 8 ordered checkpoints; a lap counts only if checkpoints are passed in order.
  Detect wrong-way driving and warn on the HUD.

## CAR (car/)
- Toy F1 car from primitives: tapered body, nose cone, front and rear wings with
  endplates, sidepods, halo, 4 rotating wheels with tire and rim details, driver
  helmet, rear light, a bolt sticker from a canvas texture. Glossy livery yellow and
  navy (MeshPhysicalMaterial with clearcoat).
- Define named Object3D mount points on the car for each camera (cockpitEye, tcam,
  nose, wheelCam) so camera code stays clean.
- Headlights (SpotLight) and tail lights are active only in night mode.
- Arcade physics: throttle, brake/reverse, speed-sensitive steering, lateral grip,
  drift on handbrake, drag, max speed, boost with limited energy (refills slowly).
  Off-track floor or rug adds drag but stays drivable.
- Effects: dust puffs from the wheels, skid marks while drifting, boost flame at the
  rear, light speed lines at the screen edge during boost.

## AUDIO (audio/) — Web Audio API only
AudioContext starts after the first user interaction. Master gain, M mute, B music toggle.
Synthesize: engine (detuned oscillators + filter following speed/throttle), boost whoosh,
tire skid noise, collision thump, checkpoint blip, lap jingle, start-light beeps and a
higher go tone, pickup arpeggio, UI click ticks, day room tone and night ambience
(crickets/hum), and a lo-fi background music loop (pad + soft beat) with a lookahead
scheduler. All sounds must fade smoothly without clicks or pops.

## UI / UX (ui/) — DISTINCTIVE, NOT GENERIC

### Design process (do this before writing UI code)
Before Phase 9 code, write a short design plan as comments at the top of theme.css:
the tokens (colors, type scale, spacing, radii), the HUD layout as an ASCII wireframe,
and one sentence on what makes this UI specific to a toy F1 game. Then review the plan
against the banned list below and revise anything that looks like a default.
Show me the plan and wait for my "next" before building.

### Look and structure
- Panels are SOLID navy (#12223F), fully opaque or at most 92% opacity. No backdrop-filter,
  no blur, no glassmorphism, no gradient backgrounds, no glow or neon box-shadows,
  no drop shadows used as decoration.
- Shape language: ONE signature, a chamfered (angled) corner cut with clip-path on HUD
  blocks, like broadcast graphics. Use a single small radius (2px) elsewhere. Do not
  use one big border-radius on everything and do not make identical rounded cards.
- Structure must carry information. Use borders, dividers, and color bars only where they
  mean something (for example, a yellow bar marks the active item). No numbered
  markers, no decorative eyebrow labels, no all-caps tracked labels.
- Typography: Barlow Condensed (semi-bold or bold, italic for numbers) for readouts;
  Barlow for text. Sentence case everywhere. Clear type scale, e.g. 12 / 14 / 18 / 28 / 72.
  No single-word color accents inside headlines.
- Each HUD element has one job and a clear hierarchy. The speed number is the
  largest thing on screen; everything else stays small and quiet.

### The memorable moment (spend the boldness here, keep everything else quiet)
- Race start uses an F1 start-light gantry: five red lights lighting up one by one
  (CSS/SVG, with matching synthesized beeps), all go dark at once = go. This replaces
  a generic "3, 2, 1, GO" text countdown.
- The speed readout is a very large italic Barlow Condensed numeral with "km/h" in a
  small label, no arc gauge, no animated ring. A thin horizontal boost bar sits under it.

### HUD layout (follow this wireframe)
```
+--------------------------------------------------------------+
| TIMING TOWER (top-left)                  CONTROLS (top-right)  |
|                                                              |
|                                                              |
|                                                              |
| MINIMAP (bottom-left)        SPEED + BOOST (bottom-center)   |
|                              CAMERA + DAY/NIGHT (bottom-right)|
+--------------------------------------------------------------+
```
- Timing tower (top-left): compact table with lap x/3, current lap, last lap, best lap,
  and the delta vs best (green or red). Yellow marks the personal best.
- Minimap: flat canvas, track line in track orange, car as a small yellow triangle.
- Camera name and day/night toggle: small plain text buttons. No emoji icons. If icons
  are needed, draw simple flat SVGs (sun, moon) in a single stroke weight.

### Controls panel (top-right, required)
- Solid navy panel, collapsible with H (the panel's own toggle is a plain
  "Hide" / "Show" text button).
- Plain groups: Drive, Cameras, Environment, Audio, System, as normal
  sentence-case headings (no tracked caps). Each row: key on the left, action on the right.
- Keys are flat outlined boxes (1px steel border, 2px radius). NO 3D bevel keycaps.
- A pressed key inverts its colors (yellow background, navy text) while held, driven by
  'input:keystate'. The active camera row has a 3px yellow bar on its left edge.
- Generated from controls.config.js. Must not overlap the timing tower or other HUD.
  Shrinks to a compact single column on small screens.

### Menus
- Main menu: the YYVOLT wordmark in Barlow Condensed bold italic with a small flat SVG
  bolt drawn as one yellow shape, over the 3D room with a slow camera drift (no blur-in
  gimmicks). Buttons: "Start race", "Controls". Keyboard focus is clearly visible.
  Enter starts the race.
- Pause (P / Esc): "Resume", "Restart", "Controls". Result: a plain table of lap times with
  the best lap marked in yellow, and "Race again" (R). No medals or confetti.

### Copy rules
- Plain verbs, sentence case, no hype, no exclamation marks, no slogans like "Feel the speed".
- Same name for the same action everywhere: the button says "Start race" and the
  related toast says "Race started".
- Toasts: "Night mode on", "Camera: nose", "Checkpoint 3 of 7", "New best lap".
- Errors and warnings say what happened and what to do: "Wrong way. Turn around."

### Motion
- No fade-and-slide-up on every element and no hover scale on buttons.
- Motion only where it answers an action or marks a state: toast in and out,
  panel collapse, boost bar fill, start lights, key press state.
- Respect prefers-reduced-motion by removing all non-essential transitions.
- Keyboard accessible menus, visible focus, pointer-events: none on HUD elements that
  must not block input, no layout shift.

### Banned list (the UI must not contain any of these)
Glassmorphism or blur panels; purple, blue, or cyan gradients; neon glow shadows;
Orbitron or similar sci-fi fonts; emoji used as icons; all-caps tracked eyebrow labels;
"WORD — fragment" labels; meta strings joined with middle dots; a "→" appended to
buttons; numbered 01/02/03 markers; identical rounded cards; a monospace font for
small labels; stat-plus-gradient hero blocks; placeholder copy like "Lorem ipsum" or
"Unleash the thrill".

### 3D visual restraint (applies to postprocessing too)
- Bloom is subtle and only on real emitters (lamps, LED strips, headlights, start lights).
  Do not make the whole screen hazy. Keep saturation natural; the room should look like
  a warm real bedroom, not a neon scene.
- Vignette is barely visible. No chromatic aberration, no film grain, no lens flare.

## MOBILE & RESPONSIVE (applies to every phase from now on)
The game must be playable and good-looking on phones and tablets, not only on desktop.
Test sizes: 360x640 portrait (shows the rotate message), 844x390 landscape phone,
1024x768 tablet, 1920x1080 desktop.

### Layout and viewport
- index.html viewport: width=device-width, initial-scale=1, viewport-fit=cover,
  maximum-scale=1, user-scalable=no. Use 100dvh (not 100vh) for full-screen layers.
- Respect safe areas with env(safe-area-inset-*) on every HUD element and touch control,
  so nothing hides under notches or rounded corners.
- The canvas fills the screen and resizes on resize AND orientationchange.
- Landscape is the supported play orientation on phones. In portrait on a touch device,
  show a plain full-screen message "Rotate your device to play" and pause the game.
- Prevent page scroll, pull-to-refresh, pinch zoom, text selection, long-press menus and
  double-tap zoom during play (touch-action: none, overscroll-behavior: none,
  user-select: none, contextmenu prevented on the game surface).
- Size HUD with clamp() and vmin/vh units, not fixed pixels. Same wireframe and
  palette as desktop, only scaled and simplified.

### Touch controls (input/TouchControls.js, shown only when the device has a coarse pointer)
- Use Pointer Events with multi-touch support (steering and pedals work at the same time;
  every control tracks its own pointerId).
- Left thumb: steering, two large Left/Right pads (or a horizontal drag slider),
  analog output from -1 to 1, smoothed like keyboard input.
- Right thumb: Gas (large), Brake, Boost, Drift (handbrake). Each button is at least
  56 px, placed in the thumb zone, with at least 12 px spacing so presses do not overlap.
- Small buttons at the top edge: Pause, Camera (cycles 1 to 7), Day/Night. Same flat navy
  style, 44 px minimum touch target.
- Touch controls are flat, semi-solid navy (max 92% opacity) with yellow pressed state.
  No blur, no glow. They sit above the safe area and never cover the speed readout.
- Optional "Tilt steering" toggle in the pause menu using DeviceOrientation (request
  permission on iOS after a user tap). Off by default.
- InputManager merges keyboard and touch into ONE input state (steer, throttle, brake,
  boost, handbrake), so CarPhysics never knows which device is used. Show/hide the
  right UI for each device and do not show keyboard hints on touch devices.
- Vibration feedback with navigator.vibrate on collision and boost start, only where
  supported, short pulses, user-toggleable.

### Controls panel on touch devices
- The top-right keyboard shortcuts panel is shown on desktop only. On touch devices
  replace it with a small "Controls" text button that opens a simple overlay explaining
  the on-screen controls. Do not show keyboard keys on touch devices.

### Responsive HUD behavior
- Timing tower: on screens under 700 px wide show only current lap time, lap x/3 and
  best lap (compact single column).
- Minimap: smaller on small screens (about 90 to 110 px), positioned so it does not
  collide with the touch controls.
- Speed readout: scales with vmin, stays the largest element.
- Menus, pause and results: single column, full-width buttons at least 48 px tall, text
  at least 16 px, no horizontal scrolling.
- Toasts stay at the top center and never overlap the top buttons.

### Mobile performance (core/DeviceProfile.js + QualityManager.js)
- DeviceProfile detects touch devices (matchMedia "(pointer: coarse)", touch points, small
  screens, hardwareConcurrency) and chooses the starting preset BEFORE the first frame.
- Mobile preset: pixel ratio capped at 1.5, shadow map 1024, max 2 active dynamic lights,
  bloom off by default, fewer particles, skid marks reduced, antialias off.
- QualityManager can still step up or down from that preset based on measured FPS.
- Pause the loop and mute audio when the tab is hidden or the device rotates to portrait.
- Audio on mobile: create or resume the AudioContext on the first touch ("Start race").
- Fullscreen: use the Fullscreen API where supported; on iOS Safari (unsupported for
  non-video elements) skip it silently and add apple-mobile-web-app-capable meta tags so
  it works well when added to the Home Screen.

## Gameplay
3-lap race against the clock, collectible mini-stars on the track (score) and some
nitro pickups (boost refill). Best lap saved in localStorage. R resets the car to the
last checkpoint when stuck.

## Quality bar
- `npm install && npm run dev` must work with zero errors.
- Stable FPS, no stutter on camera switch or day/night switch (no shader recompiles
  mid-game: pre-warm with renderer.compile() for both lighting states and all
  cameras at load time, behind a loading screen with a progress bar).
- Add a README.md explaining architecture, how to tweak constants, and how to add a
  new camera mode.

## Working method (VERY IMPORTANT)
- Work in PHASES. After each phase: run the dev server/build, fix errors, STOP, and
  summarize what was done and what comes next. Do not start the next phase until I
  say "next".
- Prefer small targeted edits over rewriting working files.
- If a requirement is too heavy or risky, propose a simpler alternative instead of
  silently skipping it.

## Phases
1. Setup: Vite project, folder skeleton, configs, EventBus, Game loop with FixedTimestep,
   renderer (tone mapping, shadows), resize, loading screen shell, YYVOLT branding in index.html.
2. Room, furniture, props, procedural textures, window, environment map.
3. LightingRig + DayNightController (day/night with smooth transition and toast).
4. Track path, track mesh, track lights, checkpoints.
5. Car model with mount points and lights, InputManager, arcade physics with interpolation.
6. CameraRig + all 7 camera modes + blending + toasts.
   6a: CameraRig, Cockpit, T-Cam, Nose, Chase (keys 1 to 4, C).
   6b: Wheel, Broadcast, Aerial (keys 5 to 7), camera toasts.
7. Collisions, effects (dust, skid, boost flame), collectibles.
8. Audio: AudioManager, SoundSynth, day/night ambience, music.
9. UI.
   9a step 1: design plan in theme.css (tokens, wireframe, one-sentence concept), review
      it against the banned list, then STOP and wait for approval.
   9a step 2: theme.css, main menu, start-light countdown, timing tower, speed readout, minimap.
   9b: ControlsPanel (top-right), toasts, pause, result screen.
   From Phase 9 on, every UI element must already follow the MOBILE & RESPONSIVE rules
   (clamp/vmin sizing, safe areas, compact variants).
10. PostProcessing (subtle bloom, light vignette), QualityManager, performance pass,
    pre-warm shaders, bug fixes, README, and a final UI review against the banned list.
11. Mobile and touch, done in two steps:
   11a: DeviceProfile, viewport meta, rotate message, safe areas, mobile.css, responsive
        HUD and menus, mobile quality preset, pause on hidden/rotate.
   11b: TouchControls (steer + pedals + top buttons), InputManager merging keyboard and
        touch, vibration, controls overlay for touch, optional tilt steering.