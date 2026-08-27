/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf3',
          100: '#d6fae2',
          200: '#b0f3c9',
          300: '#7ce6a9',
          400: '#43d183',
          500: '#1fb567',
          600: '#149253',
          700: '#137444',
          800: '#135c38',
          900: '#114c30',
        },
      },
    },
  },
  plugins: [],
};
