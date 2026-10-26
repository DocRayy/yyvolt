/**
 * The game's single state machine.
 *
 * BOOT -> MENU -> COUNTDOWN -> RACING -> FINISHED, with PAUSED branching off
 * RACING. Illegal transitions throw during development instead of leaving the
 * game in an impossible state; every accepted change is announced on EventBus
 * so UI and audio can react without polling.
 */
export const GAME_STATES = Object.freeze({
  BOOT: 'BOOT',
  MENU: 'MENU',
  COUNTDOWN: 'COUNTDOWN',
  RACING: 'RACING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
});

const TRANSITIONS = Object.freeze({
  BOOT: ['MENU'],
  MENU: ['COUNTDOWN'],
  COUNTDOWN: ['RACING', 'MENU'],
  RACING: ['PAUSED', 'FINISHED', 'MENU'],
  PAUSED: ['RACING', 'COUNTDOWN', 'MENU'],
  FINISHED: ['COUNTDOWN', 'MENU'],
});

export class GameState {
  constructor(bus) {
    this.bus = bus;
    this.current = GAME_STATES.BOOT;
  }

  set(next) {
    if (next === this.current) return;

    const allowed = TRANSITIONS[this.current];
    if (!allowed?.includes(next)) {
      throw new Error(
        `Invalid game state transition: ${this.current} -> ${next}`,
      );
    }

    const previous = this.current;
    this.current = next;
    this.bus.emit('state:changed', { previous, current: next });
  }

  is(state) {
    return this.current === state;
  }
}
