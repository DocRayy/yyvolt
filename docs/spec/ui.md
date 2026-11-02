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
