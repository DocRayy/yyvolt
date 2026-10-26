/**
 * Emissive LED strips along both track edges.
 *
 * The strips exist in both lighting modes and only their emissive intensity is
 * animated. DayNightController calls setNightFactor() during the same 1.5 s
 * blend as the room lights, so the track never pops on or off.
 */
import {
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { TRACK } from '../config/track.config.js';
import { lerp } from '../utils/math.js';

export class TrackLights {
  constructor(trackPath) {
    this.trackPath = trackPath;
    this.group = new Group();
    this.group.name = 'TrackLights';

    const { lights } = TRACK;
    this.material = new MeshStandardMaterial({
      color: lights.baseColor,
      emissive: lights.color,
      emissiveIntensity: lights.dayIntensity,
      roughness: 0.35,
      metalness: 0.1,
    });

    this.buildStrips();
  }

  buildStrips() {
    const { lights } = TRACK;
    const { halfWidth } = this.trackPath;
    const positions = [];
    const indices = [];
    const frame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };
    const inner = halfWidth - lights.offset - lights.width / 2;
    const outer = inner + lights.width;

    for (let i = 0; i <= TRACK.samples; i += 1) {
      const u = i / TRACK.samples;
      this.trackPath.getFrameAt(u, frame);
      const { position, side } = frame;

      for (const sign of [1, -1]) {
        for (const edge of [inner, outer]) {
          positions.push(
            position.x + side.x * edge * sign,
            position.y + lights.height,
            position.z + side.z * edge * sign,
          );
        }
      }

      if (i === TRACK.samples) continue;
      const a = i * 4;
      const c = a + 4;
      // Two thin top-facing ribbons: one per edge.
      indices.push(a, a + 1, c, a + 1, c + 1, c);
      indices.push(a + 2, c + 2, a + 3, a + 3, c + 2, c + 3);
    }

    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const strips = new Mesh(geometry, this.material);
    strips.receiveShadow = false;
    strips.castShadow = false;
    this.group.add(strips);
  }

  setNightFactor(mix) {
    this.material.emissiveIntensity = lerp(
      TRACK.lights.dayIntensity,
      TRACK.lights.nightIntensity,
      mix,
    );
  }
}
