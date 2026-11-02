## ROOM (world/)
- Room ~12 x 3.5 x 10 units (v2 may enlarge it so the wider track fits, see V2-SPEC): wooden floor with plank texture + soft rug, painted walls
  with posters (procedural, including a YYVOLT poster), a door, and a big window.
- Furniture from primitives, cartoonish but well-proportioned with bevels/rounded shapes:
  bed with blanket and pillows, study desk + chair + desk lamp, wardrobe, bookshelf with
  colorful books, bedside table with lamp, toy box.
- Floor props as obstacles and decoration: lego bricks, a ball, stacked books, a teddy
  bear, crayons, a toy rocket.
- Use a PMREM environment map for glossy reflections on the car and furniture.
- Renderer: ACESFilmicToneMapping, SRGBColorSpace output, PCFSoftShadowMap, shadow bias
  tuned to avoid acne and peter-panning.

## DAY / NIGHT MODE (lighting/)
- Press L (or click the HUD toggle) to switch. The transition is animated over ~1.5 s,
  smoothly blending every parameter. Lights are created ONCE in LightingRig and only
  their properties are animated.
- DAY: warm bright sunlight (DirectionalLight with soft shadows) coming through the
  window, bright sky gradient and clouds in the window, hemisphere light, light
  warm-white interior, bedside and desk lamps OFF, soft daytime room tone.
- NIGHT: dark navy interior, cool moonlight through the window with a procedural star
  sky and moon, bedside lamp and desk lamp ON (warm pools of light), fairy lights
  and an LED strip along the wall, a glowing night light, emissive LED strips along the
  track edges, car headlights (two SpotLights with soft cone) and red tail lights ON,
  bloom enabled slightly stronger, night ambience (crickets, quiet hum).
- Emissive materials must feed the bloom pass; keep the bloom threshold tuned so only
  actual light sources glow.
- Show a toast "Day mode on" / "Night mode on" and update the HUD toggle.
