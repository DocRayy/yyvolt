# V2-4: Environment system
### Architecture
- environments/Environment.js: base class with build(ctx), dispose(), getTrackDefinition(),
  getLightingPresets() (day and night), getCameraSetups() (broadcast positions, aerial
  height), getAmbience(), getSpawn(), and flags (hasCeiling, skyType).
- config/environments.config.js: list of { id, name, location, targetLapSeconds, thumbnail }.
- environments/BedroomEnvironment.js wraps the EXISTING world/ and track code. Do not
  rewrite it. It stays the default environment.
- EnvironmentManager.load(id): shows the loading screen, disposes the previous environment
  completely, builds the new one, then rebuilds track, checkpoints, TrackCollider, minimap,
  camera setups, and lighting presets. LightingRig is created once and only receives new
  presets. Day/night (L) must work in every environment.
- Best lap is stored per environment ("yyvolt:v2:best:<envId>").
- Track select screen (ui/TrackSelectScreen.js): flat cards with the name, location, a track
  outline drawn from the centerline on a canvas, length, and best lap. Landscape phone: a
  row of cards that scrolls horizontally with snap. Button: "Start race".
- Shared building blocks in environments/shared/: Barriers.js (red-white barriers and tire
  stacks, instanced), Grandstand.js, Buildings.js (procedural window textures), Trees.js
  (low-poly, instanced), WaterPlane.js (simple animated waves), SkyDome.js (gradient,
  sun, moon, stars, soft clouds), StreetLamps.js, AsphaltTexture.js.
