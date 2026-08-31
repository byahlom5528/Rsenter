/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        rubik: ['Rubik', 'sans-serif'],
        heebo: ['Heebo', 'sans-serif'],
        assistant: ['Assistant', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38aaf6',
          500: '#0e8ee9',
          600: '#0270c7',
          700: '#0359a1',
          800: '#074c84',
          900: '#0b3f6f',
          950: '#07284a',
        },
        navy: {
          800: '#0f172a',
          900: '#0b1120',
          950: '#070b14',
        }
      },
      boxShadow: {
        'glow': '0 0 20px -3px rgba(14, 142, 233, 0.3)',
        'glow-lg': '0 0 35px -5px rgba(14, 142, 233, 0.4)',
        'card-hover': '0 12px 30px -10px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
