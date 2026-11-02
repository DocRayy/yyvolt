/**
 * Markup for the coarse-pointer driving controls.
 *
 * The pedals are inline SVG so the ribbed grip stays crisp at every size and
 * needs no downloaded art. Each button carries its action id and its minimum
 * hit area; the layout checker reads those attributes instead of guessing.
 */

function pedalMarkup({ type, label, action, minWidth, minHeight }) {
  return `
    <button
      class="touch-pedal touch-pedal--${type}"
      type="button"
      data-touch-action="${action}"
      data-min-size="${minWidth}x${minHeight}"
      aria-label="${label} pedal"
      aria-pressed="false"
    >
      <svg
        class="pedal__art"
        viewBox="0 0 72 120"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <rect class="pedal__plate" x="0.5" y="0.5" width="71" height="119" rx="2" />
        <rect class="pedal__face" x="5" y="5" width="62" height="110" rx="1" />
        <g class="pedal__ridges">
          <rect x="11" y="18" width="50" height="9" rx="1" />
          <rect x="11" y="35" width="50" height="9" rx="1" />
          <rect x="11" y="52" width="50" height="9" rx="1" />
          <rect x="11" y="69" width="50" height="9" rx="1" />
        </g>
      </svg>
      <span class="pedal__label">${label}</span>
    </button>
  `;
}

export const TOUCH_MARKUP = `
  <div
    class="touch-controls__steer"
    data-layout-zone="leftZone"
    role="group"
    aria-label="Steering"
  >
    <button
      class="touch-pad touch-pad--steer"
      type="button"
      data-touch-action="drive.steer-left"
      data-min-size="72x72"
      aria-label="Steer left"
      aria-pressed="false"
    >
      Left
    </button>
    <button
      class="touch-pad touch-pad--steer"
      type="button"
      data-touch-action="drive.steer-right"
      data-min-size="72x72"
      aria-label="Steer right"
      aria-pressed="false"
    >
      Right
    </button>
  </div>

  <div
    class="touch-controls__drive"
    data-layout-zone="rightZone"
    role="group"
    aria-label="Pedals and drift"
  >
    ${pedalMarkup({
      type: 'boost',
      label: 'Boost',
      action: 'drive.boost',
      minWidth: 72,
      minHeight: 56,
    })}
    ${pedalMarkup({
      type: 'brake',
      label: 'Brake',
      action: 'drive.brake',
      minWidth: 72,
      minHeight: 88,
    })}
    ${pedalMarkup({
      type: 'gas',
      label: 'Gas',
      action: 'drive.accelerate',
      minWidth: 72,
      minHeight: 120,
    })}
    <button
      class="touch-drift"
      type="button"
      data-touch-action="drive.handbrake"
      data-min-size="56x56"
      aria-label="Drift"
      aria-pressed="false"
    >
      Drift
    </button>
  </div>
`;
