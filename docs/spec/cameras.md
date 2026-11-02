## CAMERA SYSTEM (camera/)
A single THREE.PerspectiveCamera is owned by CameraRig. Each mode is a class in
camera/modes/ implementing: enter(), exit(), update(dt, carState, outPose) where
outPose receives {position, quaternion, fov}. CameraRig blends from the previous pose
to the new one over 0.5 s. Camera keys: 1 to 7 select, C cycles. Show a toast with the
camera name and keep the current camera name visible in the HUD.

1. Cockpit View (key 1): driver eye position inside the cockpit, with halo, steering
   wheel and the front of the car visible. Hide the helmet in this mode. Slight head
   movement on acceleration and corners. FOV ~75.
2. T-Cam / Onboard View (key 2): camera on the airbox above and slightly behind the
   driver's helmet, showing the helmet and the front of the car. FOV ~70.
3. Nose Camera (key 3): mounted low at the front of the nose cone, looking forward,
   with the front wing edges visible at the bottom, strong sense of speed, FOV ~85.
4. Chase Camera (key 4, default): behind and above the car, smooth spring-follow,
   FOV widens with speed, subtle shake on boost and collision.
5. Side / Wheel Camera (key 5): mounted beside the car close to the front wheel,
   looking back along the body and at the wheel, with stable orientation that follows
   the car yaw. FOV ~60.
6. Trackside / Broadcast Camera (key 6): fixed camera positions placed around the
   room (under the desk, on the bed corner, on the bookshelf, near the toy box,
   by the door). The camera tracks the car smoothly with its own damping, adjusts FOV
   (zoom) based on distance, and automatically cuts (with the standard blend)
   to the best camera as the car moves through the track, like a TV broadcast.
7. Aerial / Top-Down View (key 7): high above, looking down at the room and track,
   following the car smoothly with slight look-ahead. Walls and ceiling must never
   block the view (hide or fade the ceiling in this mode).
- Camera modes must never clip into walls or furniture: apply simple obstruction
  checks or clamps for Chase and Broadcast.
