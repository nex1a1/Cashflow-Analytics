// Single source of truth for app colors ("FA-78 Thunderbolt" theme - Tactical Gunmetal & Crimson).
// applyTheme() writes every entry to :root as RGB channels (`--canvas: 16 17 20`), which
// tailwind.config.js consumes as rgb(var(--x) / <alpha-value>). JS that needs a real color
// string (Chart.js, SVG attributes, hex math) reads the same values through tc().
// Swapping the theme = editing this file only.

const TOKENS = {
  canvas: '#101114',           // Heavy outer armor / Deep Space black-gray (ดำเทาเข้มลึก ไร้ประกายฟ้า)
  surface: '#181A1F',          // Secondary armor plate / Cockpit console (เทาดำกันเมทัล)
  'surface-hover': '#21242B',   // Armor seam hover
  'surface-elevated': '#282C35',// HUD elevated module / Floating panel
  line: '#2F333D',             // Joint mechanical panel line (เส้นขอบเกราะ)
  'line-strong': '#3F4452',
  hairline: '#252830',

  accent: '#C22B43',           // Thunderbolt Deep Crimson / Maroon (เกราะอก & โล่ห์ แดงเบอร์กันดี)
  'accent-active': '#A01F34',  // Pressed accent
  'on-accent': '#FFFFFF',      // Text on accent fills (crisp white on crimson)

  income: '#10B981',           // Sensor / Beam Saber Green (เซนเซอร์ตาและพลังงาน EFSF)
  expense: '#F06A53',          // Thruster heat exhaust coral (ไอพ่นขับดัน)
  savings: '#8B93F8',          // Energy capacitor indigo
  danger: '#F85149',           // Critical cockpit warning (ไฟเตือนฉุกเฉิน)
  'danger-active': '#DA3633',
  weekend: '#FF6166',         // Sat/Sun labels in calendars (Thai convention) — text only, never a fill or status

  // 50/30/20 Allocation Colors
  'alloc-need': '#F43F5E',     // Rose 500: Essential needs (แยกจาก danger แดงเตือนภัย และ accent แดงเบอร์กันดี)
  'alloc-want': '#F59E0B',     // Amber 500: Discretionary / Lifestyle wants

  'ink-display': '#F3F4F6',    // EFSF Stencil pure off-white (คมชัดสูงสุด)
  'ink-soft': '#D1D5DB',       // Secondary label
  'ink-body': '#9CA3AF',       // Readout body text (เทาอ่านง่าย สบายตา)
  'ink-muted': '#6B7280',      // Muted mechanical spec
} as const;

/** Canonical 50/30/20 Allocation Colors across all views (Dashboard, Calendar, Ledger, Modals) */
export const ALLOCATION_COLORS = {
  need: '#F43F5E',             // Rose 500
  want: '#F59E0B',             // Amber 500
  savings: TOKENS.savings,     // Energy Capacitor Indigo (#8B93F8)
} as const;

export const getAllocColor = (type?: string | null): string => {
  if (!type) return ALLOCATION_COLORS.want;
  const key = type.toLowerCase();
  if (key === 'need' || key === 'needs') return ALLOCATION_COLORS.need;
  if (key === 'want' || key === 'wants') return ALLOCATION_COLORS.want;
  if (key === 'savings' || key === 'save') return ALLOCATION_COLORS.savings;
  return ALLOCATION_COLORS.want;
};

// Tactical Mechanical Gray ramp: Neutral gunmetal grays (no blue tint).
const GRAY = {
  50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF',
  500: '#6B7280', 600: '#4B5563', 700: '#374151', 750: '#2F333D', 800: '#252830',
  850: '#1F2228', 900: '#181A1F', 950: '#101114',
} as const;

// Green ramp built around `income` (Sensor Green): replaces Tailwind's emerald.
const GREEN = {
  50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399',
  500: '#10B981', 600: '#059669', 700: '#047857', 800: '#065F46', 900: '#064E3B', 950: '#022C22',
} as const;

export type ThemeToken = keyof typeof TOKENS | `gray-${keyof typeof GRAY}` | `green-${keyof typeof GREEN}`;

const ALL: Record<string, string> = {
  ...TOKENS,
  ...Object.fromEntries(Object.entries(GRAY).map(([k, v]) => [`gray-${k}`, v])),
  ...Object.fromEntries(Object.entries(GREEN).map(([k, v]) => [`green-${k}`, v])),
};

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

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
const mix = (a: string, b: string, t: number) =>
  '#' + channels(a).map((v, i) => Math.round(v * (1 - t) + channels(b)[i] * t).toString(16).padStart(2, '0')).join('');

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
