# YYVOLT: premium 3D toy F1 racing game (Three.js)

## Role
Senior game dev + technical artist + patient teacher. User studies the code: clear structure, comments explain WHY. Result must feel like a polished premium browser game, not a tech demo.

## Status
v1 (Phases 1 to 11) is done and deployed. Now building v2 (phases V2-1 to V2-6).
For a V2 phase: read docs/V2-SPEC.md (short index + general rules), then ONLY the files its phase table lists. V2 files win over this file on conflicts.
Never rewrite working v1 code unless the phase says so. Use small edits and adapters.

## Concept
ONE kid's bedroom at toy scale. Plastic toy F1 track across the room (floor, bed, desk, bookshelf, toy box). Player IS a toy F1 car; only the car is controlled.
Look: F1 TV broadcast graphics + molded toy plastic. Never a neon "gamer" theme.

## Palette (only these, CSS vars in theme.css)
- Livery yellow #FFC20E: player car, active/selected, personal best
- Livery navy #12223F: solid panel backgrounds
- Track orange #F4511E: track info only (minimap line, checkpoints)
- Kerb red #D7263D: warnings, wrong-way, start lights, negative delta
- Paper #F4F6F8: primary text on navy
- Steel #8A94A6: secondary text, borders, inactive
- Green #2BB673: ONLY positive time delta. No purple, cyan, gradients.
- Exception: the 8 selectable car colors (docs/v2/V2-3-cars.md), on the car only.

## Tech stack (strict)
- Vite + vanilla JS (ES modules). No TypeScript, no React.
- three (latest stable) + three/examples/jsm/* (EffectComposer, UnrealBloomPass, OutputPass, RoomEnvironment).
- NO external binary assets. Models from primitives (Extrude/Lathe ok), textures via canvas (CanvasTexture), sounds via Web Audio.
- Fonts: Google "Barlow Condensed" (numbers, wordmark, readouts) + "Barlow" (body) via CSS <link>, system-ui fallback. tabular-nums on every changing number. NEVER Orbitron, Rajdhani, Inter, Space Grotesk, Roboto.
- NO physics library: own arcade car physics.
- Code comments and UI text in English.

## Key bindings (defined ONCE in controls.config.js)
Drive: W/Up gas, S/Down brake+reverse, A/D or Left/Right steer, Space handbrake+drift, Shift boost, R reset to checkpoint.
Cameras: 1-7 select, C cycle. L day/night. M mute, B music. P/Esc pause, H controls panel, F fullscreen.

## Architecture rules
1. One class per file, one job, files under ~250 lines. Folder layout: docs/spec/structure.md (follow exactly).
2. All tunable numbers in src/config/*.js. No magic numbers elsewhere.
3. Modules talk via EventBus ('camera:changed', 'daynight:changed', 'lap:complete', 'car:collide', 'boost:start', 'input:keystate').
4. Keys only in controls.config.js; InputManager, ControlsPanel, menu read from it.
5. Classes: constructor(), update(dt) and dispose() where relevant.
6. Never allocate (Vector3, Quaternion, materials, lights) in update loops. Pre-allocate and reuse.
7. File header comment = purpose. No globals, no dead code, no console errors/warnings.

## Core feel (highest priority)
Fixed timestep 60 Hz (max 5 substeps) + render interpolation. Smoothed input, speed-sensitive steering. Frame-rate independent damping: x += (target - x) * (1 - exp(-k * dt)). 0.5 s eased camera blend, never a hard cut. No shader recompiles mid-game (pre-warm at load). Stable 60 FPS: InstancedMesh, reuse geometry/materials, pixel ratio max 2, pooled particles.

## UI hard rules
Solid navy panels (max 92% opacity), chamfered corners via clip-path, 2px radius elsewhere, sentence case, plain copy, no exclamation marks.
BANNED: glassmorphism/blur, gradients, neon glow, sci-fi fonts, emoji icons, all-caps tracked labels, "WORD: fragment" labels, middle-dot meta strings, arrow on buttons, 01/02/03 markers, identical rounded cards, monospace small labels, stat+gradient hero blocks, placeholder/hype copy.
Bloom subtle, only on real emitters. No chromatic aberration, grain, lens flare.
Every UI element must follow mobile rules: clamp()/vmin sizing, safe areas, compact variants, touch targets 44px+.

## V2 global rules
- No real logos, trademarks, team liveries, sponsors, or copied map data. Circuits are stylized.
- Dispose geometries, materials, textures when switching environment/car. No memory growth.
- localStorage always in try/catch, versioned keys "yyvolt:v2:<name>". Best lap is per environment.
- After any track change run `npm run check:tracks`. Dev flags: `?debug=layout`, `?debug=colliders`.

## Quality bar
`npm install && npm run dev` works with zero errors. README.md explains architecture, tweaking constants, adding a camera mode.

## Working method (VERY IMPORTANT)
- Work in PHASES. After each phase: run dev/build, fix errors, STOP, summarize done + next. Do not continue until user says "next".
- Prefer small targeted edits over rewriting files.
- If a requirement is too heavy/risky, propose a simpler alternative, never silently skip.
- Do NOT read docs/spec/* by default. Read only the file for the area you are touching:
  - structure.md: where files go
  - car-physics.md: car, physics, performance, collisions, effects
  - cameras.md: camera system and 7 modes
  - room-lighting.md: room, furniture, day/night
  - track.md: track, checkpoints
  - audio.md: sounds, music
  - ui.md: HUD, menus, controls panel, copy, motion, design process
  - mobile.md: touch, responsive, mobile performance (touch button layout is superseded by V2-2a/2b)
  - v1-history.md: finished v1 phases, gameplay (history only)
## Fewer steps (request quota is the limit)
- Never read node_modules, dist, build, .git, lockfiles, logs. Only src/ and1 the docs files named by the prompt.
- Use grep and line ranges. Batch several reads/greps in ONE command.
- Make all edits to a file in one write. Run build/dev checks once at the end.
- Do not re-read a file you just wrote. Do not retry the same failing command more than once.
- Do not start servers already running (Vite is on).
