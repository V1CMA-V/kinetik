const { palette, themeVariables } = require('./src/theme/palette');

/** Every design token as `rgb(var(--color-<name>) / <alpha-value>)`, so `/opacity` modifiers work. */
const colors = Object.fromEntries(
  Object.keys(palette.light).map((name) => [name, `rgb(var(--color-${name}) / <alpha-value>)`]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors,
      // radius-lg (cards, sheets) and radius-sm (inputs); radius-pill = `rounded-full`.
      borderRadius: {
        card: '20px',
        field: '10px',
      },
      // Embedded at build time by the expo-font plugin (app.json), one file per weight,
      // so `font-semibold`/`font-bold` pick the right face on Android and iOS.
      fontFamily: {
        sans: ['Inter'],
        display: ['Space Grotesk'],
      },
    },
  },
  plugins: [
    // Light theme by default; the dark one is applied with `vars()` in the root layout.
    ({ addBase }) => addBase({ ':root': themeVariables('light') }),
  ],
};
