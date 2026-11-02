# Smoothness, performance, car, collisions
## SMOOTHNESS & FEEL (highest priority)
- Fixed timestep physics (60 Hz, max 5 substeps per frame) with render interpolation of
  the car transform, so motion is silky on 60/120/144 Hz monitors.
- Input smoothing: steering and throttle ramp toward target values (not instant),
  with speed-sensitive steering (less angle at high speed), and self-centering.
- Car feel: weight transfer (body pitch on accelerate/brake, roll in corners),
  suspension-like spring-damper on the body, wheels rotate by real speed, front wheels
  steer visually, controlled drift with Space, boost with a punchy acceleration curve.
- All cameras use frame-rate independent damping: x += (target - x) * (1 - exp(-k * dt)).
- Camera switch uses a 0.5 s eased blend (position, quaternion, FOV), never a hard cut.
- Collisions: bounce with damped impulse, no sticking to walls, no jitter, no tunneling
  at max speed (use swept checks or substeps).
- Performance: target a stable 60 FPS on a mid-range laptop. Use InstancedMesh for
  repeated items, reuse geometries/materials, cap pixel ratio at 2, shadow map 2048
  (1024 on low quality), limit dynamic lights (max 4 shadow-casting or point lights
  active at once), pool particles.
- QualityManager measures average frame time; if FPS stays below 50 for 3 seconds, step
  down quality (bloom off, shadow size down, pixel ratio down) and show a subtle toast.
- Handle resize, tab visibility (pause audio and loop when hidden), and devicePixelRatio.

## CAR (car/)
- Toy F1 car from primitives: tapered body, nose cone, front and rear wings with
  endplates, sidepods, halo, 4 rotating wheels with tire and rim details, driver
  helmet, rear light, a bolt sticker from a canvas texture. Glossy livery yellow and
  navy (MeshPhysicalMaterial with clearcoat).
- Define named Object3D mount points on the car for each camera (cockpitEye, tcam,
  nose, wheelCam) so camera code stays clean.
- Headlights (SpotLight) and tail lights are active only in night mode.
- Arcade physics: throttle, brake/reverse, speed-sensitive steering, lateral grip,
  drift on handbrake, drag, max speed, boost with limited energy (refills slowly).
  The car can NOT leave the track: invisible track walls keep it inside (see V2-SPEC).
- Effects: dust puffs from the wheels, skid marks while drifting, boost flame at the
  rear, light speed lines at the screen edge during boost.
