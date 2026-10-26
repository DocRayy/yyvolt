/**
 * Race lifecycle and simulation gating.
 *
 * Game owns the loop, but the race itself has enough rules to deserve its own
 * small director: reset the car and checkpoints, blend away from the menu
 * camera, run the clock only while RACING, freeze the car on the finish, and
 * reset to a checkpoint with R. UI listens to the same bus events, so this class
 * never reaches into the DOM.
 */
import { Vector3 } from 'three';
import { GAME_STATES } from '../core/GameState.js';

export class RaceDirector {
  constructor({
    bus,
    state,
    trackPath,
    car,
    checkpoints,
    collectibles,
    effects,
    cameraRig,
    lapTimer,
    onReset = () => {},
  }) {
    if (!bus || !state || !trackPath || !car || !lapTimer) {
      throw new Error('RaceDirector is missing a required race system.');
    }

    this.bus = bus;
    this.state = state;
    this.trackPath = trackPath;
    this.car = car;
    this.checkpoints = checkpoints ?? null;
    this.collectibles = collectibles ?? null;
    this.effects = effects ?? null;
    this.cameraRig = cameraRig ?? null;
    this.lapTimer = lapTimer;
    this.onReset = onReset;

    this.startFrame = {
      position: new Vector3(),
      tangent: new Vector3(),
      side: new Vector3(),
      up: new Vector3(),
    };

    this.unsubscribers = [
      bus.on('race:start-request', this.handleStartRequest),
      bus.on('race:resume-request', this.handleResumeRequest),
      bus.on('race:restart-request', this.handleRestartRequest),
      bus.on('countdown:complete', this.handleCountdownComplete),
      bus.on('race:finished', this.handleRaceFinished),
      bus.on('state:changed', this.handleStateChanged),
      bus.on('input:action', this.handleInputAction),
    ];
  }

  handleStartRequest = () => {
    this.startRace();
  };

  handleResumeRequest = () => {
    if (this.state.is(GAME_STATES.PAUSED)) {
      this.state.set(GAME_STATES.RACING);
    }
  };

  handleRestartRequest = () => {
    if (!this.state.is(GAME_STATES.PAUSED)) return;

    this.resetRace();
    this.state.set(GAME_STATES.COUNTDOWN);
  };

  startRace() {
    if (!this.state.is(GAME_STATES.MENU) && !this.state.is(GAME_STATES.FINISHED)) {
      return;
    }

    this.resetRace();
    this.state.set(GAME_STATES.COUNTDOWN);
  }

  resetRace() {
    this.trackPath.getFrameAt(0, this.startFrame);
    this.car.respawn(this.startFrame.position, this.startFrame.tangent);
    this.checkpoints?.reset();
    this.collectibles?.reset();
    this.effects?.reset();
    this.lapTimer.reset();
    this.onReset();
  }

  handleCountdownComplete = () => {
    if (this.state.is(GAME_STATES.COUNTDOWN)) {
      this.state.set(GAME_STATES.RACING);
    }
  };

  handleRaceFinished = () => {
    if (!this.state.is(GAME_STATES.RACING)) return;
    this.state.set(GAME_STATES.FINISHED);
  };

  handleStateChanged = ({ previous, current }) => {
    if (current === GAME_STATES.MENU) {
      this.cameraRig?.setMenuDrift(true);
      return;
    }

    if (current === GAME_STATES.COUNTDOWN) {
      if (previous === GAME_STATES.MENU) {
        this.cameraRig?.setMenuDrift(false);
      } else {
        // Restarting from the result is a deliberate teleport, so do not fly
        // the camera across the room from the old finish position.
        this.cameraRig?.snap();
      }
      return;
    }

    if (current === GAME_STATES.RACING) {
      this.lapTimer.start();
      return;
    }

    if (current === GAME_STATES.PAUSED) {
      this.lapTimer.stop();
      return;
    }

    if (current === GAME_STATES.FINISHED) {
      this.lapTimer.stop();
      this.freezeCar();
    }
  };

  handleInputAction = ({ action } = {}) => {
    if (action === 'system.pause') {
      this.togglePause();
      return;
    }

    if (action !== 'drive.reset') return;

    if (this.state.is(GAME_STATES.FINISHED)) {
      this.startRace();
      return;
    }

    if (this.state.is(GAME_STATES.RACING)) {
      this.resetToCheckpoint();
    }
  };

  togglePause() {
    if (this.state.is(GAME_STATES.RACING)) {
      this.state.set(GAME_STATES.PAUSED);
      return;
    }

    if (this.state.is(GAME_STATES.PAUSED)) {
      this.state.set(GAME_STATES.RACING);
    }
  }

  resetToCheckpoint() {
    const gate = this.checkpoints?.getLastGate();
    if (!gate) return;

    this.car.respawn(gate.position, gate.tangent);
    this.cameraRig?.snap();
    this.onReset();
    this.bus.emit('ui:toast', { message: 'Back to checkpoint' });
  }

  /** Run the simulation only while the race is live. */
  fixedUpdate(step, input) {
    if (!(step > 0) || !this.state.is(GAME_STATES.RACING)) return;

    // The clock advances before the car so a lap line crossed during this step
    // is credited with the whole step rather than losing its final 16 ms.
    this.lapTimer.update(step);
    this.car.fixedUpdate(step, input);
    this.collectibles?.fixedUpdate();
    this.effects?.fixedUpdate(step);
  }

  freezeCar() {
    const physics = this.car.physics;
    physics.velocity.set(0, 0, 0);
    physics.speed = 0;
    physics.lateralSpeed = 0;
    physics.throttle = 0;
    physics.brake = 0;
    physics.handbrake = 0;
    physics.longitudinalAcceleration = 0;
    physics.lateralAcceleration = 0;
    physics.yawRate = 0;
    physics.braking = false;
    physics.setBoost(false);
  }

  dispose() {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers.length = 0;
  }
}
