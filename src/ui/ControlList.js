/**
 * Shared controls-reference markup.
 *
 * The menu, pause screen, and persistent race panel all read the same binding
 * table. Grouping equivalent caps (ShiftLeft/ShiftRight) into one key avoids a
 * duplicate "Shift" cap while keeping both physical codes on the element for
 * input:keystate highlighting. Touch devices receive a separate description of
 * the on-screen pads, so no keyboard cap is ever rendered where it cannot be
 * used.
 */
import { CONTROL_GROUPS, keyLabel } from '../config/controls.config.js';

/** Compact in-race help positioned between the topbar and the speed plate. */
export const TOUCH_QUICK_HELP_MARKUP = `
  <div class="touch-help touch-help--quick">
    <p class="touch-help__line">Left: hold Left or Right.</p>
    <p class="touch-help__line">Right: Gas, Brake, Boost, Drift.</p>
    <p class="touch-help__line">Top: Pause, camera, day/night.</p>
  </div>
`;

/** Full touch explanation used by the menu and pause controls views. */
export function buildTouchHelpMarkup() {
  return `
    <div class="touch-help">
      <section class="touch-help__group">
        <h3 class="touch-help__title">Steering</h3>
        <p class="touch-help__text">
          Hold Left or Right with your left thumb. Tilt steering is optional and
          can be turned on in pause.
        </p>
      </section>
      <section class="touch-help__group">
        <h3 class="touch-help__title">Pedals</h3>
        <p class="touch-help__text">
          Gas is the large bottom-right button. Brake, Boost, and Drift sit in
          the same cluster under your right thumb.
        </p>
      </section>
      <section class="touch-help__group">
        <h3 class="touch-help__title">Boost and drift</h3>
        <p class="touch-help__text">
          Boost and Drift sit next to the pedals and can be held while steering.
        </p>
      </section>
      <section class="touch-help__group">
        <h3 class="touch-help__title">Top edge</h3>
        <p class="touch-help__text">
          Pause, camera, and day/night stay within reach while racing. Pause also
          opens the tilt and vibration settings.
        </p>
      </section>
    </div>
  `;
}

export function buildControlGroupsMarkup() {
  return CONTROL_GROUPS.map((group) => {
    const rows = group.bindings
      .map((binding) => {
        const codesByLabel = new Map();
        for (const code of binding.codes) {
          const label = keyLabel(code);
          if (!codesByLabel.has(label)) codesByLabel.set(label, []);
          codesByLabel.get(label).push(code);
        }

        const keys = [...codesByLabel.entries()]
          .map(
            ([label, codes]) =>
              `<kbd class="control-key" data-codes="${codes.join(' ')}">${label}</kbd>`,
          )
          .join('<span class="control-key-or">or</span>');

        const camera = binding.cameraId
          ? ` data-camera-id="${binding.cameraId}"`
          : '';

        return `
          <div class="control-row" data-action="${binding.action}"${camera}>
            <span class="control-row__keys">${keys}</span>
            <span class="control-row__label">${binding.label}</span>
          </div>
        `;
      })
      .join('');

    return `
      <section class="control-group">
        <h3 class="control-group__title">${group.title}</h3>
        ${rows}
      </section>
    `;
  }).join('');
}
