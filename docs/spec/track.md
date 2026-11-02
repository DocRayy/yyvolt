## TRACK (track/)
- Closed loop from a CatmullRomCurve3 (12 to 16 control points), mostly flat on
  the floor, with one small ramp over a stack of books and one section passing under
  the bed edge if feasible.
- Ribbon mesh along the curve, width from constants (v2 raises it, see V2-SPEC): orange plastic asphalt look, dashed white
  center line, red-white kerbs (InstancedMesh), chunky toy-style connector joints
  every few units, checkered start/finish arch with the YYVOLT logo.
- TrackLights: emissive LED strips along the edges, subtle in day, glowing at night.
- 6 to 8 ordered checkpoints; a lap counts only if checkpoints are passed in order.
  Detect wrong-way driving and warn on the HUD.
