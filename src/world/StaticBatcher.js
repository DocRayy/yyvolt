/**
 * Collapses static meshes into a handful of material batches.
 *
 * A bedroom built from primitives is naturally many small meshes, and each one
 * costs a draw call in both the colour pass and the shadow pass. Nothing in the
 * room, furniture, or loose props moves, so their geometry can be baked into
 * world space and merged per material. Objects that animate later (window sky,
 * lamp shades, the ceiling for the aerial camera) opt out with noBatch.
 */
import { Matrix4, Mesh } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function canBatch(object) {
  if (!object.isMesh || object.isInstancedMesh) return false;
  if (object.userData.noBatch) return false;
  if (Array.isArray(object.material)) return false;
  if (!object.material || !object.geometry) return false;
  if (object.material.transparent) return false;
  if (object.renderOrder !== 0) return false;
  return true;
}

function attributesMatch(geometries) {
  const signature = (geometry) => Object.keys(geometry.attributes).sort().join(',');
  const expected = signature(geometries[0]);
  return geometries.every((geometry) => signature(geometry) === expected);
}

function createMesh(geometry, bucket) {
  const mesh = new Mesh(geometry, bucket.material);
  mesh.castShadow = bucket.castShadow;
  mesh.receiveShadow = bucket.receiveShadow;
  mesh.name = 'Batched static mesh';
  return mesh;
}

export function batchStaticMeshes(root) {
  root.updateMatrixWorld(true);

  const rootInverse = new Matrix4().copy(root.matrixWorld).invert();
  const protectedGeometries = new Set();
  const buckets = new Map();
  const removable = [];

  root.traverse((object) => {
    if (!object.isMesh || !object.geometry) return;
    if (!canBatch(object)) {
      protectedGeometries.add(object.geometry);
      return;
    }

    const key = [
      object.material.uuid,
      object.castShadow ? 'cast' : 'no-cast',
      object.receiveShadow ? 'receive' : 'no-receive',
    ].join('|');
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        material: object.material,
        castShadow: object.castShadow,
        receiveShadow: object.receiveShadow,
        geometries: [],
      };
      buckets.set(key, bucket);
    }

    const matrix = new Matrix4().multiplyMatrices(rootInverse, object.matrixWorld);
    const clone = object.geometry.clone();
    clone.applyMatrix4(matrix);
    const geometry = clone.index ? clone.toNonIndexed() : clone;
    if (geometry !== clone) clone.dispose();

    bucket.geometries.push(geometry);
    removable.push(object);
  });

  const removableGeometries = new Set();
  for (const object of removable) {
    removableGeometries.add(object.geometry);
    object.parent?.remove(object);
  }
  for (const geometry of removableGeometries) {
    if (!protectedGeometries.has(geometry)) geometry.dispose();
  }

  for (const bucket of buckets.values()) {
    const { geometries } = bucket;
    if (geometries.length === 1) {
      root.add(createMesh(geometries[0], bucket));
      continue;
    }
    if (!attributesMatch(geometries)) {
      for (const geometry of geometries) root.add(createMesh(geometry, bucket));
      continue;
    }

    const merged = mergeGeometries(geometries, false);
    if (!merged) {
      for (const geometry of geometries) root.add(createMesh(geometry, bucket));
      continue;
    }
    for (const geometry of geometries) geometry.dispose();
    root.add(createMesh(merged, bucket));
  }
}
