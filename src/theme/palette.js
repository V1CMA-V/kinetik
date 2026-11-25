// Kinetik design system colors — the single source for Tailwind (tailwind.config.js)
// and for native props that can't take a className (src/theme/colors.ts).
// Light and dark values come from the design system (dark: warm charcoal surfaces)
// with the same contrast rules: text ≥ 4.5:1, control borders ≥ 3:1.
// Plain CommonJS so tailwind.config.js can require it.

/** @typedef {'surface'|'card'|'sunken'|'line'|'outline'|'ink'|'ink-muted'|'accent'|'on-accent'|'on-accent-muted'|'accent-soft'|'accent-ink'|'income'|'expense'|'expense-soft'|'warning'} Token */

/** @type {Record<'light'|'dark', Record<Token, string>>} */
const palette = {
  light: {
    surface: '#F6F1E7', // surface-cream: app background
    card: '#FFFFFF', // surface-paper: cards, sheets, modals
    sunken: '#E9E4D8', // surface-sand: inputs, secondary fills, tracks
    line: '#DDD5C5', // dividers and decorative borders
    outline: '#8F887A', // control borders (≥ 3:1 on surface and card)
    ink: '#14141A', // primary text, amounts
    'ink-muted': '#5B5850', // secondary text, labels
    accent: '#FF5A1F', // brand-orange: fills only (primary button, highlights)
    'on-accent': '#14141A', // text/icons on accent
    'on-accent-muted': '#3D1A0A', // secondary text on accent
    'accent-soft': '#FFE4D6', // tinted chips and badges
    'accent-ink': '#B83A0B', // brand-orange-ink: orange text and links
    income: '#0F7A4A',
    expense: '#C0262D',
    'expense-soft': '#F9E0DF', // destructive button fill
    warning: '#9A5B00', // "vence pronto" text and bars
  },
  dark: {
    surface: '#15130F', // warm charcoal background
    card: '#211E19',
    sunken: '#2C2822',
    line: '#3A352D',
    outline: '#7D766A', // warm grey, ≥ 3:1 on surface and card
    ink: '#F6F1E7', // the brand cream as text
    'ink-muted': '#B3AC9F',
    accent: '#FF5A1F', // same orange fill, ink text on top
    'on-accent': '#14141A',
    'on-accent-muted': '#3D1A0A',
    'accent-soft': '#3A2219',
    'accent-ink': '#FF8A5C',
    income: '#3DD68C',
    expense: '#FF7A74',
    'expense-soft': '#3A1E20',
    warning: '#F0B44C',
  },
};

/** "#RRGGBB" → "R G B", the form `rgb(var(--x) / <alpha-value>)` needs. */
function toRgbChannels(hex) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** CSS variables of a theme: `{ '--color-ink': '20 20 26', … }`. */
function themeVariables(theme) {
  return Object.fromEntries(
    Object.entries(palette[theme]).map(([name, hex]) => [`--color-${name}`, toRgbChannels(hex)]),
  );
}

module.exports = { palette, themeVariables };
