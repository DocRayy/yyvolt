# V2-2b: Steering wheel, alternative schemes, Settings
### SteeringWheelControl.js (touch devices, default scheme)
- An F1-style wheel drawn as inline SVG: flat-bottom rectangular wheel with two side grips,
  a center display block, a few small round buttons and rotary knobs for decoration,
  with accents from the palette (and the selected car color as the grip accent).
- Anchored bottom-left with safe-area insets. Diameter clamp(140px, 30vmin, 200px).
- Control: drag around the wheel center. Compute the touch angle with atan2, apply the
  delta to the wheel rotation, limited to +/- 135 degrees. Output steer = rotation / 135
  (range -1 to 1, analog). Spring back to center when released with a damped return
  (about 250 ms). The wheel owns one pointer and ignores others.
- A small center marker on the rim shows the neutral position.
- Sensitivity setting scales the output (0.6 to 1.4). Smoothing stays in InputManager.
- The 3D car's steering wheel (visible in Cockpit view) rotates with the steer input.

### Alternative schemes
- Buttons: larger, well-separated Left and Right pads (no overlap, at least 16 px gap).
- Tilt: DeviceOrientation steering, iOS permission requested after a user tap. Off by default.
- Desktop keeps the keyboard. The wheel is shown only on touch devices.

### Settings screen (core/Settings.js + ui/SettingsScreen.js)
- Reachable from the main menu and the pause menu on every device.
- Options: Control scheme (Wheel, Buttons, Tilt; touch only), Steering sensitivity,
  Vibration on/off, Music on/off, Effects volume, Quality (Auto, Low, Medium, High),
  Show FPS.
- Applies immediately, saved to localStorage ("yyvolt:v2:settings"), safe defaults when
  storage is empty. Same UI rules as the rest (solid panels, sentence case, plain copy).
