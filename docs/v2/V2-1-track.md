# V2-1: Track width, spacing validator, stay on track
### Width and spacing
- Track width must be at least 3 x the car body width (use a CAR_WIDTH constant). The
  bedroom target is 3.5 x CAR_WIDTH. Real circuits: 3 x to 4 x.
- Enlarge the room (about 1.4x footprint) if the wider track does not fit. Do not squeeze
  the layout. Keep furniture proportional and the room cozy.
- The centerline distance between any two non-adjacent parts of a track must be at least
  2.5 x TRACK_WIDTH, so two parts of the track never touch or merge visually.
- Minimum corner radius of the centerline: at least 1.5 x TRACK_WIDTH, so the inner edge
  of the ribbon never folds over itself.
- The ribbon must have enough subdivisions (at least 10 per control-point span) and use a
  small height offset plus polygonOffset on kerbs and lines to avoid z-fighting.

### TrackValidator.js
- Pure math module (works in Node, no DOM). Samples the centerline (at least 400 points)
  and reports: pairs of non-adjacent samples closer than the minimum distance, corners
  tighter than the minimum radius, and self-intersections.
- Runs automatically in dev mode at load and prints a clear error list.
- Add `scripts/validate-tracks.mjs` and the npm script `check:tracks` that loads every
  track definition and exits with an error if any track fails. Run it after every change
  to a track. Fix the control points until it passes.

### TrackCollider.js (invisible walls)
- Precompute at least 1000 samples along the centerline (position, tangent, normal,
  arc length). Keep the last nearest index and search a local window around it each step
  (fast). Fall back to a global search only after a reset or when lost.
- Each physics substep, in the XZ plane: compute the signed lateral offset d of the car
  from the centerline. Let limit = halfWidth - carHalfWidth. If |d| > limit:
  1. Move the car back to exactly +/- limit along the normal.
  2. Split velocity into normal and tangent parts. If the normal part points outward,
     reverse it times restitution (0.25). Multiply the tangent part by (1 - wallFriction),
     wallFriction 0.12, so the car slides along the wall and never sticks.
  3. Emit 'car:collide' with strength proportional to the removed normal speed (used for
     sound, camera shake, vibration).
- No tunneling at max speed: make sure the per-substep movement is smaller than half the
  car width (add substeps if needed).
- Works for ramps and tunnels (lateral math in XZ only, height comes from the track).
- Remove ALL old off-track logic (extra drag, free roaming). The car cannot leave the track.
- R reset places the car on the centerline, facing along the tangent, at the last checkpoint.
- Walls are invisible in the Bedroom. On real circuits, draw visible decorative barriers
  that align with the collider (see docs/v2/V2-5-circuit-rules.md). Debug: `?debug=colliders` draws the wall lines.
