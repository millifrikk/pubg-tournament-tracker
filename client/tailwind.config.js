/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark gaming theme colors
        'primary': '#0079ff',       // Bright blue accent
        'primary-dark': '#0057b8',
        'primary-light': '#3395ff',
        'secondary': '#9147FF',     // Twitch-like purple
        'dark': {
          100: '#2a2a2a',           // Lightest dark
          200: '#1d1d1d',           // Card backgrounds
          300: '#171717',           // Main background
          400: '#131313',           // Darker elements
          500: '#0a0a0a',           // Darkest elements
        },
        'light': {
          100: '#f2f2f2',           // Primary text
          200: '#a0a0a0',           // Secondary text
          300: '#6a6a6a',           // Disabled text
        },
        'accent': {
          'green': '#00b894',       // Success color
          'yellow': '#fdcb6e',      // Warning color
          'red': '#e17055',         // Error color
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'game': '0 4px 20px rgba(0, 0, 0, 0.5)',
      },
      borderWidth: {
        '1': '1px',
      },
    },
  },
  plugins: [],
}