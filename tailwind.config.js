/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF6FF',
          100: '#D9EAFF',
          500: '#208AEF',
          600: '#1570D1',
          700: '#1258A8',
        },
      },
    },
  },
  plugins: [],
};
