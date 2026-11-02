# V2-3: Cars and colors
### Car classes (config/cars.config.js)
Each car has: id, name, classLabel, scale, model builder, stat multipliers applied on top
of the base constants (never change the base constants).
- F1 (DEFAULT): maxSpeed 1.00, accel 1.00, steer 1.00, grip 1.00, boost 1.00.
  Look: longest nose, large two-element front and rear wings with endplates, halo, wide
  sidepods, large rear tires.
- F2: maxSpeed 0.90, accel 0.92, steer 1.05, grip 1.05, boost 0.90.
  Look: halo, simpler wings, narrower sidepods, slightly shorter body.
- F3: maxSpeed 0.80, accel 0.85, steer 1.10, grip 1.10, boost 0.80.
  Look: smaller overall (scale about 0.9), single-element wings, short nose, small air intake,
  smaller wheels. Most forgiving to drive.
- Models live in car/models/F1Model.js, F2Model.js, F3Model.js. The existing CarModel is
  refactored into F1Model (keep it working). CarFactory.create(typeId, colorId) returns an
  object with the SAME interface for every class: mount points (cockpitEye, tcam, nose,
  wheelCam), headlights, taillights, wheels[4], steeringWheel, setColor(hex), dispose().
  Cameras and physics only use that interface, so they work with every car.
- Share geometries and materials between cars where possible. Dispose the old car when
  switching.

### Colors (config/colors.config.js): exactly 8, friendly primaries, not harsh
| id | name | hex |
|---|---|---|
| red | Red | #E5383B |
| yellow | Yellow (DEFAULT) | #FFC20E |
| blue | Blue | #2F6FEB |
| orange | Orange | #F77F00 |
| green | Green | #2BB673 |
| purple | Purple | #7B5CD6 |
| white | White | #F2F4F7 |
| graphite | Graphite | #2B2F36 |
- The body uses the chosen color. Accent stripes and wing endplates use an automatic
  contrast color (navy or white, based on luminance). Changing the color only updates the
  material color (no recreating meshes) and applies instantly.
- Saved as "yyvolt:v2:car" { type, color }. Default F1 + yellow.

### Garage screen (ui/GarageScreen.js)
- Opened from the main menu ("Garage"). The selected car sits on a simple turntable in the
  scene and rotates slowly (drag to rotate is optional).
- Plain text tabs: F3, F2, F1. Flat thin stat bars (Top speed, Acceleration, Handling, Boost),
  no gradients. A grid of 8 flat square color swatches (2 px radius), the selected one has
  a 3 px paper outline. A "Select" button confirms.
- Landscape phone: preview on the left, controls on the right. All targets at least 44 px.
