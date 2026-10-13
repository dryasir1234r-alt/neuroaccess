import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NeuroAssess calm clinical palette
        ink: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae3',
          300: '#b0bacb',
          400: '#8595ae',
          500: '#667795',
          600: '#515f7c',
          700: '#434e65',
          800: '#3a4355',
          900: '#343b49',
          950: '#23272f',
        },
        teal: {
          50: '#effcfb',
          100: '#c8f7f3',
          200: '#91eee9',
          300: '#53ded9',
          400: '#24c5c2',
          500: '#0aa9a9',
          600: '#058689',
          700: '#0a6a6d',
          800: '#0c5457',
          900: '#0f4648',
          950: '#01282b',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
