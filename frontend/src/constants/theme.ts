// Single source of truth for app colors.
// Ferrari Luxury Editorial dark theme: near-black #181818, deep cockpit #121212, Rosso Corsa #DA291C.
// applyTheme() writes every entry to :root as RGB channels (`--canvas: 24 24 24`), which
// the @theme block in index.css consumes as rgb(var(--x)). JS that needs a real color
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
