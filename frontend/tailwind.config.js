/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Bai Jamjuree', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'Bai Jamjuree', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0px',
        sm: '4px',
        full: '9999px',
      },
      colors: {
        canvas: '#181818',
        surface: {
          DEFAULT: '#121212',
          elevated: '#303030',
          hover: '#1d1d1d',
        },
        hairline: '#2d2d2d',
        rosso: {
          DEFAULT: '#da291c',
          active: '#b01e0a',
        },
        ink: {
          display: '#ffffff',
          body: '#969696',
          muted: '#666666',
        },
      }
    },
  },
  plugins: [],
}