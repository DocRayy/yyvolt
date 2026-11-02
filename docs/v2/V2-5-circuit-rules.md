# V2-5 shared circuit rules (read for 5a, 5b, 5c)
- Stylized, recognizable, NOT exact. Author each layout as 24 to 40 control points in 2D
  and keep the recognizable corners in the listed order. It must pass `npm run check:tracks`.
- Width 3 x to 4 x CAR_WIDTH. Visible decorative barriers align with the TrackCollider walls.
- Target lap times at the F1 car: Monaco about 60 s, Silverstone about 75 s, Baku about 85 s.
  Tune the circuit scale in the track definition to reach them.
- Performance: use InstancedMesh and merged static geometry (BufferGeometryUtils). Budget:
  at most 250 draw calls on desktop and 150 on mobile. The shadow camera follows the car
  with a small frustum instead of covering the whole circuit. Use fog to hide the far
  distance. On mobile, reduce building and crowd counts.
- Each environment defines at least 6 broadcast camera positions and an aerial height
  computed from the track bounding box. Chase and broadcast cameras must not clip into
  buildings, tunnels, or grandstands.
- Ambience (Web Audio, synthesized) per environment: Monaco harbor water and distant crowd,
  Silverstone wind with crowd swells near the grandstands, Baku city hum and sea wash.
- Day and night presets per environment (see each circuit). Night uses restrained bloom
  only on real emitters.
