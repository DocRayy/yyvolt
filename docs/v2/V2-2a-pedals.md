# V2-2a: Mobile controls, pedals and overlap-free layout
Replace the Gas, Brake, and Boost buttons with real pedal shapes. Keep pointer events,
multi-touch, and vibration from v1.

### Visual design (flat, no glow, no blur)
- Gas: tall narrow pedal, the largest. Brake: wide, shorter pedal. Boost: small flat pedal.
  Draw each as an inline SVG with a ribbed grip (3 to 5 horizontal ridges), a metal plate
  look in steel tones, and a small plain-text label ("Gas", "Brake", "Boost").
  Accent: brake uses kerb red on the ridges, boost uses livery yellow, gas uses paper white.
- Pressed state: the pedal tilts about 8 degrees around its bottom edge (transform-origin
  bottom center) and its ridges turn yellow. Release returns in about 120 ms. No scale
  bounce, no glow.
- Drift: a compact chamfered flat button (not a pedal) with the label "Drift".

### Layout rules (NO overlaps)
- Pedal cluster anchors to the bottom-right with safe-area insets plus 16 px.
  Arrangement: Gas at the far right, Brake to the left of Gas, Boost above Brake, Drift above
  the cluster aligned right. All sizes use clamp() with vmin.
- Minimum hit areas: Gas 72 x 120 px, Brake 72 x 88 px, Boost 72 x 56 px, Drift 56 x 56 px.
  Gap between any two touch areas: at least 16 px. Hit areas never overlap.
- The whole cluster must use at most 55% of the screen height at 320 px viewport height.
- Define named zones: leftZone (steering), rightZone (pedals), topBar (pause, camera,
  day/night), topLeft (timing tower), bottomLeft (minimap), bottomCenter (speed). No two
  zones may intersect. Adjust the minimap and timing tower on small screens if needed.
- Test sizes: 568x320, 667x375, 844x390, 932x430, 1024x768.
- Dev tool: `?debug=layout` outlines every hit area and prints every intersecting pair
  to the console (also expose window.__checkLayout()). Run it at all test sizes.
- Each pedal captures its own pointer (setPointerCapture) and releases on pointerup,
  pointercancel, lostpointercapture, window blur, and orientation change. No stuck inputs.
