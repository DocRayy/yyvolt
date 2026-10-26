/**
 * Time formatting shared by the timing tower, menu, and later result screen.
 *
 * The readouts are broadcast-style: minutes are always shown, seconds are
 * zero-padded, and milliseconds keep three digits. A true minus sign is used for
 * faster deltas so the sign reads clearly even at small sizes.
 */

export function formatLapTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';

  const totalMs = Math.round(seconds * 1000);
  const minutes = Math.floor(totalMs / 60000);
  const remainder = totalMs - minutes * 60000;
  const wholeSeconds = Math.floor(remainder / 1000);
  const milliseconds = remainder % 1000;

  return `${minutes}:${String(wholeSeconds).padStart(2, '0')}.${String(
    milliseconds,
  ).padStart(3, '0')}`;
}

export function formatDelta(seconds) {
  if (!Number.isFinite(seconds)) return '—';

  const totalMs = Math.round(seconds * 1000);
  if (totalMs === 0) return '0.000';

  const sign = totalMs < 0 ? '−' : '+';
  const absolute = Math.abs(totalMs);
  const wholeSeconds = Math.floor(absolute / 1000);
  const milliseconds = absolute % 1000;

  return `${sign}${wholeSeconds}.${String(milliseconds).padStart(3, '0')}`;
}
