const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const ramp = (name, steps) => Object.fromEntries(steps.map((s) => [s, v(`${name}-${s}`)]));
const GRAY = ramp('gray', [50, 100, 200, 300, 400, 500, 600, 700, 750, 800, 850, 900, 950]);
const GREEN = ramp('green', [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]);

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Locked radius scale (replaces the old `.dark-mode * { border-radius: 0 !important }`):
    // md/lg/xl/2xl/3xl don't exist, so stray rounded-lg classes render square.
    // `sm` is 0 on purpose: inputs/pills get their 4px from darkMode.css selectors instead.
    borderRadius: {
      DEFAULT: '0px',
      none: '0px',
      sm: '0px',
      full: '9999px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'Bai Jamjuree', 'sans-serif'],
        mono: ['"Shark Digits"', 'Inter', 'Bai Jamjuree', 'sans-serif'], // digits-only mono, see fonts.css
      },
      // Values come from src/constants/theme.ts (applyTheme writes them to :root as RGB channels).
      // Legacy gray + emerald palettes are remapped onto theme ramps so old classes follow the theme.
      colors: {
        neutral: GRAY, slate: GRAY, gray: GRAY, zinc: GRAY, stone: GRAY,
        emerald: GREEN,
        canvas: v('canvas'),
        surface: {
          DEFAULT: v('surface'),
          elevated: v('surface-elevated'),
          hover: v('surface-hover'),
        },
        line: {
          DEFAULT: v('line'),
          strong: v('line-strong'),
        },
        hairline: v('hairline'),
        accent: {
          DEFAULT: v('accent'),
          active: v('accent-active'),
        },
        'on-accent': v('on-accent'),
        income: v('income'),
        expense: v('expense'),
        savings: v('savings'),
        weekend: v('weekend'),
        danger: {
          DEFAULT: v('danger'),
          active: v('danger-active'),
        },
        ink: {
          display: v('ink-display'),
          soft: v('ink-soft'),
          body: v('ink-body'),
          muted: v('ink-muted'),
        },
      }
    },
  },
  plugins: [],
}