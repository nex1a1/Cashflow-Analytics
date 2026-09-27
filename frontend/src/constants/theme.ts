// Single source of truth for app colors. Two themes live here:
//   ferrari: "Ferrari Luxury Editorial" dark (near-black #181818, deep cockpit #121212, Rosso Corsa #DA291C)
//   freedom: "ZGMF-X10A Freedom" light (armor white, midnight, cobalt, madder red, V-fin gold)
// The active one is picked once at load from localStorage (STORAGE_KEYS.THEME); switching reloads the page.
// applyTheme() writes every entry to :root as RGB channels (`--canvas: 24 24 24`), which
// tailwind.config.js consumes as rgb(var(--x) / <alpha-value>). JS that needs a real color
// string (Chart.js, SVG attributes, hex math) reads the same values through tc().
// Token names are roles, not shades: `ink-display` is "strongest text" in both themes, `canvas` the page.
import type React from 'react';
import { STORAGE_KEYS } from './storageKeys';

const FERRARI = {
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

type TokenName = keyof typeof FERRARI;

// Light theme. Every text-role color is >= 4.6:1 on `canvas` (#E9EBEF, the darkest light surface).
const FREEDOM: Record<TokenName, string> = {
  canvas: '#E9EBEF',           // Frame-gray page behind the armor plates
  surface: '#F5F6F8',          // Main armor white
  'surface-hover': '#ECEEF2',
  'surface-elevated': '#FFFFFF',
  line: '#BCC1CB',             // Hairline border, visible on white (1.7:1 on surface)
  'line-strong': '#9DA3B0',
  hairline: '#D5D8DF',

  accent: '#2652B3',           // Wing cobalt: location / primary action (white text 7.1:1)
  'accent-active': '#1D418F',
  'on-accent': '#FFFFFF',
  'accent-ink': '#2652B3',     // Cobalt is dark enough to be its own ink (6.0:1 on canvas)

  income: '#00784B',
  expense: '#A74F21',          // Copper (hue 45): 0.092 OKLab from danger, was 0.055 as brick coral
  savings: '#585FC0',
  danger: '#C9212C',           // Madder red #E1363B darkened to pass as text (3.7:1 -> 4.7:1)
  'danger-active': '#A81B25',
  weekend: '#1C2434',
  warn: '#886200',             // V-fin gold hue at text lightness; the bright #F9C846 is too light for any text role
  info: '#007283',             // Teal, kept off cobalt so info never reads as the accent
  orange: '#A74F21',           // = expense (see thunderbolt)
  purple: '#8250B8',

  'alloc-need': '#B33B69',
  'alloc-want': '#886200',

  'ink-display': '#1C2434',    // Chest midnight blue
  'ink-soft': '#2E3647',
  'ink-body': '#3F4252',       // Frame gunmetal, deepened for small Thai text (8.3:1 on canvas)
  'ink-muted': '#4F5263',      // 6.5:1 on canvas
  overlay: '#1C2434',          // Hairlines / hover washes: dark on light
  gold: '#F9C846',             // V-fin gold: rank-1 medal fill only (1.6:1 as text, so never text)
  'on-gold': '#1C2434',        // 10:1 on gold
};

// Freedom's chest plate: a midnight region (app header) inside the light theme. Scoped as CSS vars on
// the element via regionVars('midnight'), so every class inside flips without per-component edits.
// Text roles >= 4.5:1 on its elevated surface #2A3449.
const MIDNIGHT: Record<TokenName, string> = {
  canvas: '#141A26',
  surface: '#1C2434',
  'surface-hover': '#232C40',
  'surface-elevated': '#2A3449',
  line: '#36425B',
  'line-strong': '#4A5673',
  hairline: '#28324A',

  accent: '#2652B3',
  'accent-active': '#1D418F',
  'on-accent': '#FFFFFF',
  'accent-ink': '#8FB0F5',     // Wing cobalt lifted for midnight (5.8:1 on elevated)

  income: '#4CC08F',
  expense: '#E08A5E',
  savings: '#9DA4EE',
  danger: '#FF7A70',
  'danger-active': '#DA3633',
  weekend: '#F5F6F8',
  warn: '#E0A640',
  info: '#4FB8E0',
  orange: '#E08A5E',
  purple: '#B997E6',

  'alloc-need': '#E08ABB',
  'alloc-want': '#E0A640',

  'ink-display': '#F5F6F8',
  'ink-soft': '#D5DAE3',
  'ink-body': '#B4BCCB',
  'ink-muted': '#98A2B6',
  overlay: '#FFFFFF',
  gold: '#F9C846',
  'on-gold': '#1C2434',
};

export type ThemeName = 'ferrari' | 'freedom';
const THEME_MIGRATION_KEY = 'cashflow_shark_theme_v2';
const readThemeName = (): ThemeName => {
  try {
    const migrated = localStorage.getItem(THEME_MIGRATION_KEY);
    if (!migrated) {
      localStorage.setItem(THEME_MIGRATION_KEY, '1');
      localStorage.setItem(STORAGE_KEYS.THEME, 'ferrari');
      return 'ferrari';
    }
    const val = localStorage.getItem(STORAGE_KEYS.THEME);
    if (val === 'freedom') return 'freedom';
    return 'ferrari';
  } catch {
    return 'ferrari';
  }
};
export const THEME_NAME: ThemeName = readThemeName();
export const IS_LIGHT = THEME_NAME === 'freedom';
export const setTheme = (name: ThemeName) => {
  try { localStorage.setItem(STORAGE_KEYS.THEME, name); } catch { /* private mode: stays on current */ }
  window.location.reload(); // Chart.js options and memoized tc() reads are built once, so reload beats live swapping
};
const TOKENS: Record<TokenName, string> = IS_LIGHT ? FREEDOM : FERRARI;

/** Canonical 50/30/20 Allocation Colors across all views (Dashboard, Calendar, Ledger, Modals) */
export const ALLOCATION_COLORS = {
  need: TOKENS['alloc-need'],
  want: TOKENS['alloc-want'],
  savings: TOKENS.savings,     // Energy Capacitor Indigo
} as const;

export const getAllocColor = (type?: string | null): string => {
  if (!type) return ALLOCATION_COLORS.want;
  const key = type.toLowerCase();
  if (key === 'need' || key === 'needs') return ALLOCATION_COLORS.need;
  if (key === 'want' || key === 'wants') return ALLOCATION_COLORS.want;
  if (key === 'savings' || key === 'save') return ALLOCATION_COLORS.savings;
  return ALLOCATION_COLORS.want;
};

// Gray ramp. Light theme mirrors it (50 = darkest ink, 950 = canvas) so legacy classes written for
// dark (`bg-neutral-900`, `text-gray-300`) flip roles instead of breaking.
const GRAY_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 750, 800, 850, 900, 950] as const;
const GRAY_DARK = ['#FFFFFF', '#F5F5F5', '#EBEBEB', '#D4D4D4', '#969696', '#737373', '#525252', '#404040', '#353535', '#303030', '#242424', '#121212', '#181818'];
// Text steps 300-600 all clear 4.7:1 on canvas (500/600 were 3.5/2.3 and carried 145 labels).
const GRAY_LIGHT = ['#141A26', '#1C2434', '#2E3647', '#353846', '#3F4252', '#4F5263', '#636677', '#9DA3B0', '#BCC1CB', '#D5D8DF', '#ECEEF2', '#F5F6F8', '#E9EBEF'];
const GRAY_MIDNIGHT = ['#F8F9FB', '#F0F2F5', '#E1E5EC', '#C9CFDB', '#A3ABBD', '#8A93A8', '#56617A', '#3A4660', '#303B52', '#283247', '#222B3E', '#1C2434', '#141A26'];
const GRAY = Object.fromEntries(GRAY_STEPS.map((k, i) => [k, (IS_LIGHT ? GRAY_LIGHT : GRAY_DARK)[i]])) as Record<typeof GRAY_STEPS[number], string>;

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) =>
  '#' + channels(a).map((v, i) => Math.round(v * (1 - t) + channels(b)[i] * t).toString(16).padStart(2, '0')).join('');

// Ramps for the Tailwind hue families still used in components (amber-400, sky-950/40 ...).
// 500 = the token; low steps (text on dark) mix toward white, or toward ink on light; high steps (tints) sink into the canvas.
const RAMP_STEPS = { 50: .9, 100: .8, 200: .6, 300: .4, 400: .2, 500: 0, 600: -.2, 700: -.4, 800: -.6, 900: -.75, 950: -.85 } as const;
const RAMP_NAMES = { warn: 'warn', info: 'info', orange: 'orange', purple: 'purple', danger: 'danger', need: 'alloc-need', green: 'income' } as const;
type RampName = keyof typeof RAMP_NAMES | 'gray';

export type ThemeToken = TokenName | `${RampName}-${keyof typeof GRAY}`;

/** Every CSS var of one token set: tokens + gray ramp + hue ramps (light sets mix low steps toward ink). */
const buildVars = (t: Record<TokenName, string>, gray: string[], light: boolean): Record<string, string> => ({
  ...t,
  ...Object.fromEntries(GRAY_STEPS.map((k, i) => [`gray-${k}`, gray[i]])),
  ...Object.fromEntries(Object.entries(RAMP_NAMES).flatMap(([name, token]) =>
    Object.entries(RAMP_STEPS).map(([k, s]) => [`${name}-${k}`,
      s >= 0 ? mix(t[token], light ? t['ink-display'] : '#FFFFFF', s) : mix(t[token], t.canvas, -s)]))),
});

const ALL = buildVars(TOKENS, IS_LIGHT ? GRAY_LIGHT : GRAY_DARK, IS_LIGHT);
const toStyle = (vars: Record<string, string>) =>
  Object.fromEntries(Object.entries(vars).map(([n, hex]) => [`--${n}`, channels(hex).join(' ')])) as Record<string, string>;

/**
 * Inline style that re-scopes the theme for one element subtree. 'midnight' is Freedom's dark chest
 * plate (a no-op under the already-dark thunderbolt theme); 'page' restores the page theme inside it.
 */
const REGIONS = IS_LIGHT ? {
  midnight: { ...toStyle(buildVars(MIDNIGHT, GRAY_MIDNIGHT, false)), colorScheme: 'dark', '--shadow-k': '1' } as React.CSSProperties,
  page: { ...toStyle(ALL), colorScheme: 'light', '--shadow-k': '0.22' } as React.CSSProperties,
} : null;
export const regionVars = (region: 'midnight' | 'page'): React.CSSProperties | undefined => REGIONS?.[region];

/** Theme color as `#rrggbb`, or `rgba(...)` when alpha is given. Safe for canvas, SVG and hex math. */
export const tc = (token: ThemeToken, alpha?: number): string => {
  const hex = ALL[token];
  if (alpha === undefined) return hex;
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Write all tokens to :root. Call once before the first render. */
export const applyTheme = (root: HTMLElement = document.documentElement) => {
  for (const [name, hex] of Object.entries(ALL)) root.style.setProperty(`--${name}`, channels(hex).join(' '));
  root.style.setProperty('--shadow-k', IS_LIGHT ? '0.22' : '1'); // light theme: same shadows, far softer
  root.style.colorScheme = IS_LIGHT ? 'light' : 'dark';
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
export const readable = (hex: string | null | undefined, on: ThemeToken = IS_LIGHT ? 'canvas' : 'surface-elevated'): string => {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return hex || TOKENS['ink-body'];
  const bg = tc(on);
  let out = hex;
  for (let t = 0.1; contrast(out, bg) < 4.5 && t <= 1; t += 0.1) out = mix(hex, TOKENS['ink-display'], t);
  return out;
};
