/**
 * Minimal OKLCH <-> sRGB, plus WCAG contrast.
 *
 * Ramps are generated in OKLCH rather than HSL because its lightness is
 * perceptually even: a fixed L step looks like a fixed step at every hue,
 * which HSL does not give you.
 */

const srgbToLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linToSrgb = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function mul(m: number[][], v: number[]): number[] {
  return m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
}

const OKLAB_TO_LMS = [
  [1, 0.3963377774, 0.2158037573],
  [1, -0.1055613458, -0.0638541728],
  [1, -0.0894841775, -1.291485548],
];
const LMS_TO_RGB = [
  [4.0767416621, -3.3077115913, 0.2309699292],
  [-1.2684380046, 2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147, 1.707614701],
];

/** L in 0..1, C in 0..~0.4, H in degrees. Out-of-gamut values are clipped. */
export function oklchToHex(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  const lms = mul(OKLAB_TO_LMS, [L, C * Math.cos(rad), C * Math.sin(rad)]).map((x) => x ** 3);
  const rgb = mul(LMS_TO_RGB, lms).map((x) => linToSrgb(clamp01(x)));
  return (
    '#' +
    rgb
      .map((x) =>
        Math.round(x * 255)
          .toString(16)
          .padStart(2, '0')
          .toUpperCase()
      )
      .join('')
  );
}

export function relativeLuminance(hex: string): number {
  const ch = (i: number) => srgbToLin(parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}

export function contrast(a: string, b: string): number {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Smallest angular distance between two hues, in degrees. */
export function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}
