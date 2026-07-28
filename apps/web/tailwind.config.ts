import type { Config } from 'tailwindcss';

// Woyo brand red -- matches the actual Woyo vehicle livery, per explicit
// direction (2026-07-28), not the tekeche-mobile app's indigo/gold UI
// theme (a physical car livery and a mobile app's UI color scheme are
// deliberately allowed to differ).
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: '#E11D2E',
          dark: '#A10D1C',
          light: '#FDECED',
        },
        ink: {
          DEFAULT: '#111111',
          light: '#1F1F1F',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
