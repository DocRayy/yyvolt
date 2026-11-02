/**
 * Validate every registered track from the command line.
 *
 * Run with `npm run check:tracks`. Exits with code 1 when a track breaks a V2
 * rule, so it can sit in front of a commit or a CI job. It imports the same
 * TrackValidator the game runs in development, which means the check can never
 * drift away from what the player sees.
 */
import { TRACK_DEFINITIONS } from '../src/config/track.config.js';
import {
  formatTrackStats,
  validateTrack,
} from '../src/track/TrackValidator.js';

let failed = 0;

for (const definition of TRACK_DEFINITIONS) {
  const result = validateTrack(definition);
  const status = result.ok ? 'ok  ' : 'FAIL';

  console.log(`${status} ${result.name} (${result.id})`);
  console.log(`     ${formatTrackStats(result)}`);

  for (const error of result.errors) {
    console.log(`     - ${error}`);
  }

  if (!result.ok) failed += 1;
}

if (failed > 0) {
  console.error(
    `\n${failed} of ${TRACK_DEFINITIONS.length} track(s) failed validation.`,
  );
  process.exitCode = 1;
} else {
  console.log(`\n${TRACK_DEFINITIONS.length} track(s) passed.`);
}
