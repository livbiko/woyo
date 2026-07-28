import type { Config } from 'tailwindcss';

// Real Woyo brand, matching the already-shipped mobile app
// (tekeche-mobile/app.config.js: WOYO_INDIGO / WOYO_GOLD) -- not invented
// for this site, kept consistent with the actual product.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          DEFAULT: '#1B1440',
          dark: '#120D2C',
          light: '#2E2560',
        },
        gold: {
          DEFAULT: '#F4A825',
          dark: '#D4900F',
          light: '#FCE7C2',
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
