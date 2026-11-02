/**
 * Layout inspector for the HUD and the touch controls.
 *
 * `?debug=layout` outlines every named zone and touch hit area and prints any
 * intersecting pair. The same check is always available as
 * `window.__checkLayout({ log: false })`, which returns plain numbers so a
 * viewport sweep can be scripted. It reads the live DOM; no layout values are
 * duplicated here.
 */

const ZONE_NAMES = [
  'leftZone',
  'rightZone',
  'topBar',
  'topLeft',
  'bottomLeft',
  'bottomCenter',
  'controlsPanel',
];

const MIN_GAP = 16;

function rectOf(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;

  return {
    left: Math.round(rect.left * 10) / 10,
    top: Math.round(rect.top * 10) / 10,
    right: Math.round(rect.right * 10) / 10,
    bottom: Math.round(rect.bottom * 10) / 10,
    width: Math.round(rect.width * 10) / 10,
    height: Math.round(rect.height * 10) / 10,
  };
}

function overlap(a, b) {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return x > 0.5 && y > 0.5 ? { x, y } : null;
}

function gapBetween(a, b) {
  const gapX = Math.max(a.left - b.right, b.left - a.right, 0);
  const gapY = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
  return Math.round(Math.hypot(gapX, gapY) * 10) / 10;
}

function labelOf(element) {
  return (
    element.dataset.layoutZone ??
    element.dataset.touchAction ??
    element.className ??
    element.tagName
  );
}

function readMinSize(element) {
  const [width, height] = (element.dataset.minSize ?? '')
    .split('x')
    .map(Number);
  return { width, height };
}

export class LayoutDebug {
  constructor() {
    this.enabled = false;
    this.boundCheck = (options) => this.check(options);
    this.handleResize = this.handleResize.bind(this);
    this.resizeFrame = 0;

    window.__checkLayout = this.boundCheck;

    if (new URLSearchParams(window.location.search).get('debug') === 'layout') {
      this.enable();
    }
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    document.body.classList.add('is-layout-debug');
    window.addEventListener('resize', this.handleResize);
    this.resizeFrame = requestAnimationFrame(() => this.check());
  }

  handleResize() {
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => this.check());
  }

  check({ log = true } = {}) {
    const zones = {};
    for (const name of ZONE_NAMES) {
      const element = document.querySelector(`[data-layout-zone="${name}"]`);
      if (element) zones[name] = rectOf(element);
    }

    const issues = [];
    const warnings = [];
    const entries = Object.entries(zones).filter(([, rect]) => rect);

    for (let first = 0; first < entries.length; first += 1) {
      for (let second = first + 1; second < entries.length; second += 1) {
        const [nameA, rectA] = entries[first];
        const [nameB, rectB] = entries[second];
        const hit = overlap(rectA, rectB);
        if (hit) {
          issues.push(
            `Zones overlap: ${nameA} and ${nameB} (${hit.x.toFixed(1)} x ${hit.y.toFixed(1)} px)`,
          );
        }
      }
    }

    const hitAreas = [...document.querySelectorAll('[data-touch-action]')].map(
      (element) => ({
        name: labelOf(element),
        element,
        rect: rectOf(element),
      }),
    ).filter((entry) => entry.rect);

    for (let first = 0; first < hitAreas.length; first += 1) {
      const a = hitAreas[first];
      const minimum = readMinSize(a.element);
      if (
        Number.isFinite(minimum.width) &&
        (a.rect.width < minimum.width || a.rect.height < minimum.height)
      ) {
        issues.push(
          `Hit area too small: ${a.name} is ${a.rect.width} x ${a.rect.height}, needs ${minimum.width} x ${minimum.height}`,
        );
      }

      for (let second = first + 1; second < hitAreas.length; second += 1) {
        const b = hitAreas[second];
        const hit = overlap(a.rect, b.rect);
        if (hit) {
          issues.push(
            `Hit areas overlap: ${a.name} and ${b.name} (${hit.x.toFixed(1)} x ${hit.y.toFixed(1)} px)`,
          );
          continue;
        }

        const gap = gapBetween(a.rect, b.rect);
        if (gap < MIN_GAP) {
          issues.push(
            `Hit area gap too small: ${a.name} and ${b.name} are ${gap} px apart, needs ${MIN_GAP}`,
          );
        }
      }
    }

    const rightZone = zones.rightZone;
    if (rightZone) {
      const share = rightZone.height / window.innerHeight;
      if (share > 0.55) {
        warnings.push(
          `Pedal cluster uses ${Math.round(share * 100)}% of the viewport height; the 320 px target is 55%. Minimum hit areas and 16 px gaps need more room.`,
        );
      }
    }

    const report = {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      zones,
      hitAreas: Object.fromEntries(
        hitAreas.map((entry) => [entry.name, entry.rect]),
      ),
      issues,
      warnings,
    };

    if (log) {
      console.groupCollapsed(
        `[layout] ${report.viewport.width}x${report.viewport.height}`,
      );
      console.table(report.zones);
      console.table(report.hitAreas);
      for (const issue of issues) console.error(issue);
      for (const warning of warnings) console.warn(warning);
      if (issues.length === 0) console.info('No overlaps.');
      console.groupEnd();
    }

    return report;
  }

  dispose() {
    cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = 0;
    document.body.classList.remove('is-layout-debug');
    window.removeEventListener('resize', this.handleResize);

    if (window.__checkLayout === this.boundCheck) {
      delete window.__checkLayout;
    }
  }
}
