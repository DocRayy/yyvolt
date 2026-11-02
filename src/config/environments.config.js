/**
 * src/config/environments.config.js
 *
 * Environment registry: every track/room the game can run in.
 *
 * targetLapSeconds: match the existing trace target if present, otherwise 45.
 * The Bedroom environment is currently the only one, and no existing target is
 * defined, so it defaults to 45 seconds.
 */

export const ENVIRONMENTS = Object.freeze([
  {
    id: 'bedroom',
    name: 'Bedroom',
    location: 'Home',
    targetLapSeconds: 45,
    thumbnail: null,
  },
  {
    id: 'monaco',
    name: 'Monaco',
    location: 'Monte Carlo',
    targetLapSeconds: 60,
    thumbnail: null,
  },
  {
    id: 'silverstone',
    name: 'Silverstone',
    location: 'Northamptonshire',
    targetLapSeconds: 75,
    thumbnail: null,
  },
]);
