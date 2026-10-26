/**
 * Small pure math helpers shared by simulation, cameras, and UI.
 * Keeping these frame-rate independent is what makes damping feel identical
 * at 60, 120, and 144 Hz.
 */

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Frame-rate independent exponential damping.
 * `lambda` is the responsiveness: higher snaps faster, lower glides longer.
 */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value < edge0 ? 0 : 1;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Shortest-path angle interpolation for car heading and camera yaw. */
export function lerpAngle(start, end, t) {
  const difference = Math.atan2(
    Math.sin(end - start),
    Math.cos(end - start),
  );
  return start + difference * t;
}
