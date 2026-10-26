/**
 * Single source of truth for every key binding.
 *
 * InputManager maps KeyboardEvent.code to an action id, ControlsPanel renders
 * these groups, and the menu reads the same labels. Changing a key here updates
 * the whole game. Bindings are descriptive rather than tied to key caps, so
 * alternative layouts (AZERTY, Dvorak) keep working.
 */

export const CONTROL_GROUPS = Object.freeze([
  {
    id: 'drive',
    title: 'Drive',
    bindings: [
      {
        action: 'drive.accelerate',
        label: 'Accelerate',
        codes: ['KeyW', 'ArrowUp'],
      },
      {
        action: 'drive.brake',
        label: 'Brake and reverse',
        codes: ['KeyS', 'ArrowDown'],
      },
      {
        action: 'drive.steer-left',
        label: 'Steer left',
        codes: ['KeyA', 'ArrowLeft'],
      },
      {
        action: 'drive.steer-right',
        label: 'Steer right',
        codes: ['KeyD', 'ArrowRight'],
      },
      {
        action: 'drive.handbrake',
        label: 'Handbrake and drift',
        codes: ['Space'],
      },
      {
        action: 'drive.boost',
        label: 'Boost',
        codes: ['ShiftLeft', 'ShiftRight'],
      },
      {
        action: 'drive.reset',
        label: 'Reset to checkpoint',
        codes: ['KeyR'],
      },
    ],
  },
  {
    id: 'cameras',
    title: 'Cameras',
    bindings: [
      {
        action: 'camera.cockpit',
        label: 'Cockpit view',
        codes: ['Digit1'],
        cameraId: 'cockpit',
      },
      {
        action: 'camera.tcam',
        label: 'T-cam view',
        codes: ['Digit2'],
        cameraId: 'tcam',
      },
      {
        action: 'camera.nose',
        label: 'Nose view',
        codes: ['Digit3'],
        cameraId: 'nose',
      },
      {
        action: 'camera.chase',
        label: 'Chase view',
        codes: ['Digit4'],
        cameraId: 'chase',
      },
      {
        action: 'camera.wheel',
        label: 'Wheel view',
        codes: ['Digit5'],
        cameraId: 'wheel',
      },
      {
        action: 'camera.broadcast',
        label: 'Broadcast view',
        codes: ['Digit6'],
        cameraId: 'broadcast',
      },
      {
        action: 'camera.aerial',
        label: 'Aerial view',
        codes: ['Digit7'],
        cameraId: 'aerial',
      },
      {
        action: 'camera.next',
        label: 'Next camera',
        codes: ['KeyC'],
      },
    ],
  },
  {
    id: 'environment',
    title: 'Environment',
    bindings: [
      {
        action: 'environment.daynight',
        label: 'Toggle day and night',
        codes: ['KeyL'],
      },
    ],
  },
  {
    id: 'audio',
    title: 'Audio',
    bindings: [
      { action: 'audio.mute', label: 'Mute all audio', codes: ['KeyM'] },
      { action: 'audio.music', label: 'Background music', codes: ['KeyB'] },
    ],
  },
  {
    id: 'system',
    title: 'System',
    bindings: [
      {
        action: 'system.pause',
        label: 'Pause',
        codes: ['KeyP', 'Escape'],
      },
      {
        action: 'system.controls',
        label: 'Controls panel',
        codes: ['KeyH'],
      },
      {
        action: 'system.fullscreen',
        label: 'Fullscreen',
        codes: ['KeyF'],
      },
    ],
  },
]);

/** code -> action id, built once at module load. */
export const ACTION_BY_CODE = new Map();
/** action id -> binding, including the group id, for UI and input dispatch. */
export const BINDING_BY_ACTION = new Map();

for (const group of CONTROL_GROUPS) {
  for (const binding of group.bindings) {
    if (BINDING_BY_ACTION.has(binding.action)) {
      throw new Error(`Duplicate control action: ${binding.action}`);
    }

    BINDING_BY_ACTION.set(
      binding.action,
      Object.freeze({ ...binding, group: group.id }),
    );

    for (const code of binding.codes) {
      if (ACTION_BY_CODE.has(code)) {
        throw new Error(`Duplicate key binding for: ${code}`);
      }
      ACTION_BY_CODE.set(code, binding.action);
    }
  }
}

const KEY_LABELS = Object.freeze({
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  Escape: 'Esc',
});

/** Human-readable cap label for a KeyboardEvent.code, used by the controls panel. */
export function keyLabel(code) {
  if (KEY_LABELS[code]) return KEY_LABELS[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}
