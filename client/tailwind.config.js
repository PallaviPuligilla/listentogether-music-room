/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        primary: {
          50:  '#ede9fe',
          100: '#ddd6fe',
          200: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#6c5ce7',
          700: '#5b4bd8',
          800: '#4a3dbe',
          900: '#3730a3',
        },
        accent: '#fd79a8',
        teal: '#00cec9',
      },
      borderRadius: {
        xl: '14px',
      },
    },
  },
  plugins: [],
};