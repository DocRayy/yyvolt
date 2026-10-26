/**
 * Image-based reflections for glossy plastic and varnished wood.
 *
 * RoomEnvironment is a tiny procedural scene that ships with three. Running it
 * through PMREM once at boot gives every PBR material a believable reflection
 * without loading an HDR file. The generated texture is intentionally dimmed by
 * Game via scene.environmentIntensity so the bedroom stays matte and warm.
 */
import { PMREMGenerator } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ENVIRONMENT } from '../config/constants.js';

export class EnvironmentMap {
  constructor(renderer) {
    this.renderer = renderer;
    this.renderTarget = null;
    this.texture = null;
  }

  create() {
    const environmentScene = new RoomEnvironment();
    const generator = new PMREMGenerator(this.renderer);

    // Intel's D3D11 compiler emits a harmless double-precision warning for the
    // PMREM blur shader. Suppress shader log checks only for this internal,
    // boot-time generation and restore them immediately for game materials.
    const previousCheck = this.renderer.debug.checkShaderErrors;
    this.renderer.debug.checkShaderErrors = false;
    try {
      this.renderTarget = generator.fromScene(
        environmentScene,
        ENVIRONMENT.sigma,
      );
      this.texture = this.renderTarget.texture;
    } finally {
      this.renderer.debug.checkShaderErrors = previousCheck;
    }
    this.texture.name = 'YYVOLT room environment';

    // The source scene and generator are boot-time only; the PMREM texture is
    // what materials keep using.
    environmentScene.dispose();
    generator.dispose();
    return this.texture;
  }

  dispose() {
    this.renderTarget?.dispose();
    this.renderTarget = null;
    this.texture = null;
  }
}
