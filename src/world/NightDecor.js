/**
 * Small night-time wall pieces: a warm LED strip, a string of fairy lights, and
 * a plug-in night light.
 *
 * These are emissive decor rather than extra point lights. That keeps the
 * per-fragment light count low, while still giving PostProcessing real emitters
 * to bloom in Phase 10. DayNightController only animates their emissive
 * intensities, so nothing is rebuilt when the room changes mode.
 */
import {
  BoxGeometry,
  CatmullRomCurve3,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS } from '../config/constants.js';
import {
  DAY_PRESET,
  LIGHT_LAYOUT,
  NIGHT_PRESET,
} from '../config/lighting.config.js';
import { clamp, lerp } from '../utils/math.js';

export class NightDecor {
  constructor() {
    this.group = new Group();
    this.group.name = 'Night decor';

    this.buildLedStrip();
    this.buildFairyLights();
    this.buildNightLight();
    this.setNightFactor(0);
  }

  buildLedStrip() {
    this.ledStripMaterial = new MeshStandardMaterial({
      color: COLORS.liveryNavy,
      emissive: NIGHT_PRESET.ledStrip.color,
      emissiveIntensity: DAY_PRESET.ledStrip.intensity,
      roughness: 0.55,
      metalness: 0.1,
    });

    const strip = new Mesh(
      new BoxGeometry(...LIGHT_LAYOUT.ledStrip.size),
      this.ledStripMaterial,
    );
    strip.position.fromArray(LIGHT_LAYOUT.ledStrip.position);
    strip.name = 'Wall LED strip';
    this.group.add(strip);
  }

  buildFairyLights() {
    const points = LIGHT_LAYOUT.fairyLights.points.map(
      ([x, y, z]) => new Vector3(x, y, z),
    );

    this.fairyLightsMaterial = new MeshStandardMaterial({
      color: COLORS.paper,
      emissive: NIGHT_PRESET.fairyLights.color,
      emissiveIntensity: DAY_PRESET.fairyLights.intensity,
      roughness: 0.4,
    });

    const bulbs = new InstancedMesh(
      new SphereGeometry(
        LIGHT_LAYOUT.fairyLights.radius,
        LIGHT_LAYOUT.fairyLights.bulbWidthSegments,
        LIGHT_LAYOUT.fairyLights.bulbHeightSegments,
      ),
      this.fairyLightsMaterial,
      points.length,
    );
    const matrix = new Matrix4();
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      matrix.makeTranslation(point.x, point.y, point.z);
      bulbs.setMatrixAt(index, matrix);
    }
    bulbs.instanceMatrix.needsUpdate = true;
    // The geometry's local bounds sit at the origin, so let the group cull it.
    bulbs.frustumCulled = false;
    bulbs.name = 'Fairy lights';
    this.group.add(bulbs);

    const wire = new Mesh(
      new TubeGeometry(
        new CatmullRomCurve3(points),
        LIGHT_LAYOUT.fairyLights.wireSegments,
        LIGHT_LAYOUT.fairyLights.wireRadius,
        LIGHT_LAYOUT.fairyLights.wireRadialSegments,
        false,
      ),
      new MeshStandardMaterial({ color: COLORS.liveryNavy, roughness: 0.8 }),
    );
    wire.name = 'Fairy light wire';
    this.group.add(wire);
  }

  buildNightLight() {
    const [x, y, z] = LIGHT_LAYOUT.nightLight.position;
    const [offsetX, offsetY, offsetZ] = LIGHT_LAYOUT.nightLight.backingOffset;

    const backing = new Mesh(
      new RoundedBoxGeometry(
        ...LIGHT_LAYOUT.nightLight.backingSize,
        LIGHT_LAYOUT.nightLight.cornerSegments,
        LIGHT_LAYOUT.nightLight.cornerRadius,
      ),
      new MeshStandardMaterial({ color: COLORS.liveryNavy, roughness: 0.7 }),
    );
    backing.position.set(x + offsetX, y + offsetY, z + offsetZ);
    backing.name = 'Night light backing';

    this.nightLightMaterial = new MeshStandardMaterial({
      color: COLORS.paper,
      emissive: NIGHT_PRESET.nightLight.color,
      emissiveIntensity: DAY_PRESET.nightLight.intensity,
      roughness: 0.4,
    });
    const glow = new Mesh(
      new RoundedBoxGeometry(
        ...LIGHT_LAYOUT.nightLight.glowSize,
        LIGHT_LAYOUT.nightLight.cornerSegments,
        LIGHT_LAYOUT.nightLight.cornerRadius,
      ),
      this.nightLightMaterial,
    );
    glow.position.set(x, y, z);
    glow.name = 'Night light';

    this.group.add(backing, glow);
  }

  /** 0 = day, 1 = night. */
  setNightFactor(value) {
    const t = clamp(value, 0, 1);
    this.ledStripMaterial.emissiveIntensity = lerp(
      DAY_PRESET.ledStrip.intensity,
      NIGHT_PRESET.ledStrip.intensity,
      t,
    );
    this.fairyLightsMaterial.emissiveIntensity = lerp(
      DAY_PRESET.fairyLights.intensity,
      NIGHT_PRESET.fairyLights.intensity,
      t,
    );
    this.nightLightMaterial.emissiveIntensity = lerp(
      DAY_PRESET.nightLight.intensity,
      NIGHT_PRESET.nightLight.intensity,
      t,
    );
  }
}
