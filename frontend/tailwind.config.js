/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4ff',
          100: '#f9e8ff',
          200: '#f3d0fe',
          300: '#e9a8fd',
          400: '#d876fa',
          500: '#c044f3',
          600: '#a826da',
          700: '#8e1db5',
          800: '#761b93',
          900: '#621a78',
          950: '#430356',
        },
        dark: {
          900: '#0f0f11',
          800: '#1a1a1f',
          700: '#242429',
          600: '#2e2e35',
          500: '#3a3a42',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
}
