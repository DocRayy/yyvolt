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
v2 NOTE: the button layout below is superseded by the steering wheel and pedals in
V2-SPEC.md. Keep the rest (pointer events, multi-touch, vibration, input merging).
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
