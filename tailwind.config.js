const { tokenNames } = require('./config/brand');

/**
 * Colours are GENERATED from config/brand.js — never add a hex value here.
 * Each token becomes a class backed by a CSS variable that ThemeProvider sets
 * at runtime, so `bg-primary` follows the active palette (and light/dark)
 * without a single component knowing what the colour actually is.
 */
const colors = Object.fromEntries(
  tokenNames.map((token) => [token, `rgb(var(--color-${token}) / <alpha-value>)`])
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,ts,tsx,jsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,ts,tsx,jsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors,
    },
  },
  plugins: [],
};
