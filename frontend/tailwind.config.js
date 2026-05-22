/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans Thai Looped', 'sans-serif'],
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
        'xl': '8px',     // Sharp panel corners
        '2xl': '10px',   // Sharp card/modal corners
        '3xl': '12px',
      },
      colors: {
        gundam: {
          bg: '#050507',        // Deep Space Base
          card: '#14141A',     // Matte Metal Structure
          primary: '#F43F5E',  // Beam Light Sabre
          secondary: '#232935',// Desaturated Shield Slate
          accent: '#F59E0B',   // Golden V-Fin Thruster
          green: '#10B981',    // Beam Rifle Green
          cyan: '#00F0FF',     // Psycho Frame Cyan
        }
      }
    },
  },
  plugins: [],
}