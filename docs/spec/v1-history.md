# v1 phases (ALL COMPLETE, history only)
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

Note: best lap is now stored per environment ("yyvolt:v2:best:<envId>"), see docs/v2/V2-4-environments.md.
