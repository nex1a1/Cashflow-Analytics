// Single source of truth for app colors.
// Ferrari Luxury Editorial dark theme: near-black #181818, deep cockpit #121212, Rosso Corsa #DA291C.
// applyTheme() writes every entry to :root as RGB channels (`--canvas: 24 24 24`), which
// tailwind.config.js consumes as rgb(var(--x) / <alpha-value>). JS that needs a real color
// string (Chart.js, SVG attributes, hex math) reads the same values through tc().

export const TOKENS = {
  canvas: '#181818',           // Ferrari Near-Black luxury canvas (#181818)
  surface: '#121212',          // Deep cockpit surface / panel base (#121212)
  'surface-hover': '#1D1D1D',   // Interactive hover elevation
  'surface-elevated': '#303030',// Elevated cards / floating panels / dropdowns
  line: '#2D2D2D',             // Hairline mechanical dividers
  'line-strong': '#3E3E3E',    // Prominent borders
  hairline: '#252525',         // Subtle separators

  accent: '#DA291C',           // Iconic Ferrari Rosso Corsa (primary fills, active tabs, buttons)
  'accent-active': '#B01E0A',  // Pressed Rosso Corsa
  'on-accent': '#FFFFFF',      // Text on accent fills
  'accent-ink': '#FF4D4F',     // Rosso Corsa as text / icon / focus ring (readable >= 4.5:1)

  income: '#10B981',           // Emerald green (+฿ cash inflow)
  expense: '#FF4D4F',          // Ferrari Red (-฿ burn rate / expenses)
  savings: '#10B981',          // Emerald (+฿ wealth accumulation / savings)
  danger: '#EF4444',           // Critical warning / deficit
  'danger-active': '#B01E0A',  // Pressed danger
  weekend: '#FFFFFF',          // Sat/Sun labels: pure white bold
  warn: '#F59E0B',             // Amber: caution / WANT allocation
  info: '#38BDF8',             // Electric blue: neutral info / pacer line
  orange: '#F97316',           // Food & dining
  purple: '#B06EF5',           // Subscriptions (vivid purple, >= 4.5:1)

  // 50/30/20 Allocation Colors
  'alloc-need': '#A3A3A3',     // Silver-gray: Essential Needs (commit 3614e51)
  'alloc-want': '#F59E0B',     // Amber: Lifestyle & Wants (commit 3614e51)

  'ink-display': '#FFFFFF',    // Pure editorial white (highest contrast)
  'ink-soft': '#EBEBEB',       // Light gray secondary label
  'ink-body': '#9CA3AF',       // Body text (clean legible neutral gray, >= 4.5:1 on surface-elevated)
  'ink-muted': '#8A8A8A',      // Muted technical specs (>= 4.5:1 on canvas & surface)
  overlay: '#FFFFFF',          // Hairlines / hover washes
  gold: '#FFD700',             // Trophy gold
  'on-gold': '#121212',        // Text on gold
} as const;

export type TokenName = keyof typeof TOKENS;

/** Canonical 50/30/20 Allocation Colors across all views (Dashboard, Calendar, Ledger, Modals) */
export const ALLOCATION_COLORS = {
  need: TOKENS['alloc-need'],
  want: TOKENS['alloc-want'],
  savings: TOKENS.savings,     // Emerald (+฿ wealth accumulation / savings)
} as const;

export const getAllocColor = (type?: string | null): string => {
  if (!type) return ALLOCATION_COLORS.want;
  const key = type.toLowerCase();
  if (key === 'need' || key === 'needs') return ALLOCATION_COLORS.need;
  if (key === 'want' || key === 'wants') return ALLOCATION_COLORS.want;
  if (key === 'savings' || key === 'save') return ALLOCATION_COLORS.savings;
  return ALLOCATION_COLORS.want;
};

// Gray ramp
const GRAY_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 750, 800, 850, 900, 950] as const;
const GRAY_DARK = ['#FFFFFF', '#F5F5F5', '#EBEBEB', '#D4D4D4', '#969696', '#737373', '#525252', '#404040', '#353535', '#303030', '#242424', '#121212', '#181818'];
const GRAY = Object.fromEntries(GRAY_STEPS.map((k, i) => [k, GRAY_DARK[i]])) as Record<typeof GRAY_STEPS[number], string>;

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) =>
  '#' + channels(a).map((v, i) => Math.round(v * (1 - t) + channels(b)[i] * t).toString(16).padStart(2, '0')).join('');

// Ramps for the Tailwind hue families still used in components (amber-400, sky-950/40 ...).
const RAMP_STEPS = { 50: .9, 100: .8, 200: .6, 300: .4, 400: .2, 500: 0, 600: -.2, 700: -.4, 800: -.6, 900: -.75, 950: -.85 } as const;
const RAMP_NAMES = { warn: 'warn', info: 'info', orange: 'orange', purple: 'purple', danger: 'danger', need: 'alloc-need', green: 'income' } as const;
type RampName = keyof typeof RAMP_NAMES | 'gray';

export type ThemeToken = TokenName | `${RampName}-${keyof typeof GRAY}`;

/** Every CSS var: tokens + gray ramp + hue ramps. */
const buildVars = (t: Record<TokenName, string>, gray: string[]): Record<string, string> => ({
  ...t,
  ...Object.fromEntries(GRAY_STEPS.map((k, i) => [`gray-${k}`, gray[i]])),
  ...Object.fromEntries(Object.entries(RAMP_NAMES).flatMap(([name, token]) =>
    Object.entries(RAMP_STEPS).map(([k, s]) => [`${name}-${k}`,
      s >= 0 ? mix(t[token], '#FFFFFF', s) : mix(t[token], t.canvas, -s)]))),
});

const ALL = buildVars(TOKENS, GRAY_DARK);

/** Theme color as `#rrggbb`, or `rgba(...)` when alpha is given. Safe for canvas, SVG and hex math. */
export const tc = (token: ThemeToken, alpha?: number): string => {
  const hex = ALL[token];
  if (alpha === undefined) return hex;
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Write all tokens to :root. Call once before the first render. */
export const applyTheme = (root: HTMLElement = document.documentElement) => {
  // Purge any stale theme keys from localStorage
  try {
    localStorage.removeItem('cashflow_shark_theme_v2');
    localStorage.removeItem('shark_theme');
  } catch { /* ignore */ }

  for (const [name, hex] of Object.entries(ALL)) root.style.setProperty(`--${name}`, channels(hex).join(' '));
  root.style.setProperty('--shadow-k', '1');
  root.style.colorScheme = 'dark';
};

/** Digits-only monospace stack for inline styles / SVG (mirrors Tailwind `font-mono`, see fonts.css). */
export const FONT_MONO = "'Shark Digits', Inter, 'Bai Jamjuree', sans-serif";

const luminance = (hex: string) => {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const toLin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const toByte = (c: number) => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)));

/**
 * User-picked colors come from a neon-leaning picker/DB; cap their OKLCH chroma at the theme's 0.13
 * (lightness + hue kept) so they sit with the tokens. Idempotent, so muted values can be saved back.
 */
export const muteColor = (hex: string, maxChroma = 0.13): string => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const [r, g, b] = channels(hex).map(toLin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  let A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  let B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  if (C <= maxChroma + 0.005) return hex; // slack for byte rounding, keeps mute(mute(x)) === mute(x)
  A *= maxChroma / C; B *= maxChroma / C;
  const l2 = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m2 = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s2 = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return '#' + [
    4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2,
    -1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2,
    -0.0041960771 * l2 - 0.7034186147 * m2 + 1.707614701 * s2,
  ].map((c) => toByte(c).toString(16).padStart(2, '0')).join('').toUpperCase();
};

/**
 * A user-picked color used as a *fill* (swatch, heatmap cell) nudged toward ink just enough to
 * separate from both the darkest and lightest surface (e.g. holiday #E8E8E8 vanishes on white).
 */
export const visibleFill = (hex: string | null | undefined, min = 1.5): string => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return hex || TOKENS['ink-muted'];
  const base = hex;
  const ok = (c: string) => contrast(c, TOKENS.canvas) >= min && contrast(c, TOKENS['surface-elevated']) >= min;
  let out = base;
  for (let t = 0.1; !ok(out) && t <= 1; t += 0.1) out = mix(base, TOKENS['ink-display'], t);
  return out;
};

/**
 * A user-picked color (category / day type) made legible as *text* on a theme surface:
 * mixed toward ink-display only as far as needed to reach 4.5:1 on the lightest surface
 * (so it holds on every darker one too). Bright colors pass through unchanged.
 */
export const readable = (hex: string | null | undefined, on: ThemeToken = 'surface-elevated'): string => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return hex || TOKENS['ink-body'];
  const bg = tc(on);
  let out = hex;
  for (let t = 0.1; contrast(out, bg) < 4.5 && t <= 1; t += 0.1) out = mix(hex, TOKENS['ink-display'], t);
  return out;
};
