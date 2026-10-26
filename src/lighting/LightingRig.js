/**
 * Every light in the bedroom, created once and only animated afterwards.
 *
 * The rig keeps the sun/moon key light, a soft room fill, hemisphere bounce,
 * ambient tint, and the two practical lamp point lights. DayNightController
 * blends the day and night presets by calling setNightFactor(); it never adds,
 * removes, or re-creates a light, so switching modes cannot recompile shaders.
 */
import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  PointLight,
} from 'three';
import { LIGHTING, RENDERER } from '../config/constants.js';
import {
  DAY_PRESET,
  LIGHT_LAYOUT,
  NIGHT_PRESET,
} from '../config/lighting.config.js';
import { lerp } from '../utils/math.js';

export class LightingRig {
  constructor({ lampAnchors = {}, maxDynamicLights = null } = {}) {
    this.group = new Group();
    this.group.name = 'Lighting';
    this.nightFactor = 0;
    this._dayColor = new Color();
    this._nightColor = new Color();

    this.key = new DirectionalLight(
      DAY_PRESET.keyLight.color,
      DAY_PRESET.keyLight.intensity,
    );
    this.key.position.fromArray(DAY_PRESET.keyLight.position);
    this.key.target.position.fromArray(DAY_PRESET.keyLight.target);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(
      RENDERER.shadowMapSize,
      RENDERER.shadowMapSize,
    );
    this.key.shadow.camera.left = -LIGHTING.shadowBounds;
    this.key.shadow.camera.right = LIGHTING.shadowBounds;
    this.key.shadow.camera.top = LIGHTING.shadowBounds;
    this.key.shadow.camera.bottom = -LIGHTING.shadowBounds;
    this.key.shadow.camera.near = LIGHTING.shadowNear;
    this.key.shadow.camera.far = LIGHTING.shadowFar;
    this.key.shadow.camera.updateProjectionMatrix();
    this.key.shadow.bias = LIGHTING.shadowBias;
    this.key.shadow.normalBias = LIGHTING.shadowNormalBias;
    this.key.shadow.radius = LIGHTING.shadowRadius;
    this.key.shadow.intensity = LIGHTING.shadowIntensity;

    this.fill = new DirectionalLight(
      DAY_PRESET.roomFill.color,
      DAY_PRESET.roomFill.intensity,
    );
    this.fill.position.fromArray(DAY_PRESET.roomFill.position);
    this.fill.target.position.fromArray(DAY_PRESET.roomFill.target);

    this.hemisphere = new HemisphereLight(
      DAY_PRESET.hemisphere.sky,
      DAY_PRESET.hemisphere.ground,
      DAY_PRESET.hemisphere.intensity,
    );
    this.ambient = new AmbientLight(
      DAY_PRESET.ambient.color,
      DAY_PRESET.ambient.intensity,
    );

    // The practicals are the only point lights. The wall LED strip, fairy
    // lights, and night light are emissive decor, which keeps the per-fragment
    // light count low while still reading as real light sources.
    this.deskLamp = new PointLight(
      DAY_PRESET.deskLamp.color,
      0,
      LIGHT_LAYOUT.deskLamp.distance,
      LIGHT_LAYOUT.deskLamp.decay,
    );
    this.bedsideLamp = new PointLight(
      DAY_PRESET.bedsideLamp.color,
      0,
      LIGHT_LAYOUT.bedsideLamp.distance,
      LIGHT_LAYOUT.bedsideLamp.decay,
    );
    this.deskLamp.name = 'Desk lamp light';
    this.bedsideLamp.name = 'Bedside lamp light';

    if (lampAnchors.desk) {
      lampAnchors.desk.getWorldPosition(this.deskLamp.position);
    } else {
      this.deskLamp.position.fromArray(
        LIGHT_LAYOUT.deskLamp.fallbackPosition,
      );
    }
    if (lampAnchors.bedside) {
      lampAnchors.bedside.getWorldPosition(this.bedsideLamp.position);
    } else {
      this.bedsideLamp.position.fromArray(
        LIGHT_LAYOUT.bedsideLamp.fallbackPosition,
      );
    }

    // The mobile budget is two dynamic lights, split between one practical and
    // one headlight. The bedside shade is still emissive, so the lamp reads as
    // switched on without a second per-fragment point light.
    if (maxDynamicLights !== null && maxDynamicLights < 3) {
      this.bedsideLamp.visible = false;
    }

    this.group.add(
      this.key,
      this.key.target,
      this.fill,
      this.fill.target,
      this.hemisphere,
      this.ambient,
      this.deskLamp,
      this.bedsideLamp,
    );

    this.setNightFactor(0);
  }

  /** Blend every preset-controlled property. 0 = day, 1 = night. */
  setNightFactor(value) {
    const t = Math.min(Math.max(value, 0), 1);
    this.nightFactor = t;

    this.blendColor(
      this.key.color,
      DAY_PRESET.keyLight.color,
      NIGHT_PRESET.keyLight.color,
      t,
    );
    this.blendColor(
      this.fill.color,
      DAY_PRESET.roomFill.color,
      NIGHT_PRESET.roomFill.color,
      t,
    );
    this.blendColor(
      this.hemisphere.color,
      DAY_PRESET.hemisphere.sky,
      NIGHT_PRESET.hemisphere.sky,
      t,
    );
    this.blendColor(
      this.hemisphere.groundColor,
      DAY_PRESET.hemisphere.ground,
      NIGHT_PRESET.hemisphere.ground,
      t,
    );
    this.blendColor(
      this.ambient.color,
      DAY_PRESET.ambient.color,
      NIGHT_PRESET.ambient.color,
      t,
    );
    this.blendColor(
      this.deskLamp.color,
      DAY_PRESET.deskLamp.color,
      NIGHT_PRESET.deskLamp.color,
      t,
    );
    this.blendColor(
      this.bedsideLamp.color,
      DAY_PRESET.bedsideLamp.color,
      NIGHT_PRESET.bedsideLamp.color,
      t,
    );

    this.key.intensity = lerp(
      DAY_PRESET.keyLight.intensity,
      NIGHT_PRESET.keyLight.intensity,
      t,
    );
    this.fill.intensity = lerp(
      DAY_PRESET.roomFill.intensity,
      NIGHT_PRESET.roomFill.intensity,
      t,
    );
    this.hemisphere.intensity = lerp(
      DAY_PRESET.hemisphere.intensity,
      NIGHT_PRESET.hemisphere.intensity,
      t,
    );
    this.ambient.intensity = lerp(
      DAY_PRESET.ambient.intensity,
      NIGHT_PRESET.ambient.intensity,
      t,
    );
    this.deskLamp.intensity = lerp(
      DAY_PRESET.deskLamp.intensity,
      NIGHT_PRESET.deskLamp.intensity,
      t,
    );
    this.bedsideLamp.intensity = lerp(
      DAY_PRESET.bedsideLamp.intensity,
      NIGHT_PRESET.bedsideLamp.intensity,
      t,
    );
  }

  blendColor(target, dayHex, nightHex, t) {
    this._dayColor.setHex(dayHex);
    this._nightColor.setHex(nightHex);
    target.copy(this._dayColor).lerp(this._nightColor, t);
  }

  /**
   * QualityManager resizes the cached key-light shadow map in place. The old
   * GPU texture must be released so three allocates one at the new resolution.
   */
  setShadowMapSize(size) {
    const nextSize = Math.max(256, Math.round(size));
    if (this.key.shadow.mapSize.x === nextSize) return;

    this.key.shadow.mapSize.set(nextSize, nextSize);
    this.key.shadow.map?.dispose();
    this.key.shadow.map = null;
    this.key.shadow.needsUpdate = true;
  }
}
