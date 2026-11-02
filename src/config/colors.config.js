/**
 * The 8 selectable car colors, friendly primaries, not harsh.
 *
 * Yellow is the default (F1 + yellow). All other cars and colors are built
 * on top of these values; changing the color only updates the material color,
 * never recreates meshes.
 */

export const COLORS = Object.freeze({
  red: Object.freeze({
    id: 'red',
    name: 'Red',
    hex: '#E5383B',
  }),
  yellow: Object.freeze({
    id: 'yellow',
    name: 'Yellow',
    hex: '#FFC20E',
  }),
  blue: Object.freeze({
    id: 'blue',
    name: 'Blue',
    hex: '#2F6FEB',
  }),
  orange: Object.freeze({
    id: 'orange',
    name: 'Orange',
    hex: '#F77F00',
  }),
  green: Object.freeze({
    id: 'green',
    name: 'Green',
    hex: '#2BB673',
  }),
  purple: Object.freeze({
    id: 'purple',
    name: 'Purple',
    hex: '#7B5CD6',
  }),
  white: Object.freeze({
    id: 'white',
    name: 'White',
    hex: '#F2F4F7',
  }),
  graphite: Object.freeze({
    id: 'graphite',
    name: 'Graphite',
    hex: '#2B2F36',
  }),
});

/**
 * Read a 24-bit hex colour back to its red, green, blue channels.
 * @param {number} hex - 0xRRGGBB
 * @returns {{r: number, g: number, b: number}}
 */
export function hexToRgb(hex) {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  };
}

/**
 * Relative luminance of an 0xRRGGBB colour (ITU-R BT.709).
 * @param {number} hex - 0xRRGGBB
 * @returns {number} 0..1
 */
export function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Pick navy or white to contrast against the body colour.
 * @param {number} hex - 0xRRGGBB
 * @returns {number} 0xRRGGBB (navy or white)
 */
export function autoContrast(hex) {
  return luminance(hex) > 0.5 ? COLORS.liveryNavy : COLORS.white;
}
