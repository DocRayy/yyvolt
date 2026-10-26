/**
 * The render chain: scene, restrained bloom, vignette, then output.
 *
 * Bloom is the only pass allowed to glow, and it is tuned to catch emissive
 * fixtures rather than sunlit walls. Vignette runs in linear HDR before the
 * OutputPass applies tone mapping and sRGB conversion, so it darkens the frame
 * without changing the palette. QualityManager can disable bloom or lower its
 * strength without rebuilding the chain, which avoids a stutter mid-race.
 */
import { Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { POSTFX } from '../config/postfx.config.js';

// A radial multiply with a soft start. The resolution uniform keeps the shape
// natural on both a wide monitor and a small landscape phone.
const VIGNETTE_SHADER = {
  name: 'YYVOLT vignette',
  uniforms: {
    tDiffuse: { value: null },
    uResolution: { value: new Vector2(1, 1) },
    uStrength: { value: POSTFX.vignette.strength },
    uStart: { value: POSTFX.vignette.start },
    uEnd: { value: POSTFX.vignette.end },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uStrength;
    uniform float uStart;
    uniform float uEnd;
    varying vec2 vUv;

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 point = vUv - vec2(0.5);
      point.x *= uResolution.x / max(uResolution.y, 1.0);
      float distanceFromCentre = length(point) / 0.72;
      float vignette = smoothstep(uStart, uEnd, distanceFromCentre) * uStrength;
      gl_FragColor = vec4(texel.rgb * (1.0 - vignette), texel.a);
    }
  `,
};

export class PostProcessing {
  constructor({ renderer, scene, camera }) {
    if (!renderer || !scene || !camera) {
      throw new Error('PostProcessing needs a renderer, scene, and camera.');
    }

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.bloomStrength = 0;
    this.bloomScale = 1;
    this.bloomEnabled = true;

    this.composer = new EffectComposer(renderer);
    this.composer.renderTarget1.texture.name = 'YYVOLT composer A';
    this.composer.renderTarget2.texture.name = 'YYVOLT composer B';

    this.renderPass = new RenderPass(scene, camera);
    this.bloomPass = new UnrealBloomPass(
      new Vector2(1, 1),
      1,
      POSTFX.bloom.radius,
      POSTFX.bloom.threshold,
    );
    this.vignettePass = new ShaderPass(VIGNETTE_SHADER);
    this.outputPass = new OutputPass();

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.vignettePass);
    this.composer.addPass(this.outputPass);

    this.setBloomStrength(0);
  }

  render(delta = 0) {
    this.composer.render(delta);
  }

  setSize(width, height) {
    const safeWidth = Math.max(width, 1);
    const safeHeight = Math.max(height, 1);

    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(safeWidth, safeHeight);
    this.vignettePass.uniforms.uResolution.value.set(
      safeWidth * this.renderer.getPixelRatio(),
      safeHeight * this.renderer.getPixelRatio(),
    );
  }

  /** Called with the DayNightController's blended value every frame. */
  setBloomStrength(strength) {
    this.bloomStrength = Math.max(0, strength);
    this.applyBloom();
  }

  setBloomScale(scale) {
    this.bloomScale = Math.max(0, scale);
    this.applyBloom();
  }

  setBloomEnabled(enabled) {
    this.bloomEnabled = enabled;
    this.bloomPass.enabled = enabled;
    this.applyBloom();
  }

  applyBloom() {
    this.bloomPass.strength = this.bloomEnabled
      ? this.bloomStrength * this.bloomScale
      : 0;
  }

  dispose() {
    for (const pass of this.composer.passes) {
      pass.dispose?.();
    }
    this.composer.passes.length = 0;
    this.composer.dispose();
    this.composer = null;
    this.renderPass = null;
    this.bloomPass = null;
    this.vignettePass = null;
    this.outputPass = null;
  }
}
