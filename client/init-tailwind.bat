@echo off
echo ======================================================
echo    PUBG Tournament Tracker - TailwindCSS Setup
echo ======================================================
echo.

echo [1/4] Installing Tailwind CSS and dependencies...
call npm install tailwindcss postcss autoprefixer --save

echo [2/4] Initializing Tailwind CSS configuration...
call npx tailwindcss init -p

echo [3/4] Creating Tailwind CSS configuration file...
echo Setting up tailwind.config.js...
> tailwind.config.js (
  echo /** @type {import('tailwindcss').Config} */
  echo module.exports = {
  echo   content: [
  echo     "./src/**/*.{js,jsx,ts,tsx}",
  echo   ],
  echo   darkMode: 'class',
  echo   theme: {
  echo     extend: {
  echo       colors: {
  echo         // Dark gaming theme colors
  echo         'primary': '#0079ff',       // Bright blue accent
  echo         'primary-dark': '#0057b8',
  echo         'primary-light': '#3395ff',
  echo         'secondary': '#9147FF',     // Twitch-like purple
  echo         'dark': {
  echo           100: '#2a2a2a',           // Lightest dark
  echo           200: '#1d1d1d',           // Card backgrounds
  echo           300: '#171717',           // Main background
  echo           400: '#131313',           // Darker elements
  echo           500: '#0a0a0a',           // Darkest elements
  echo         },
  echo         'light': {
  echo           100: '#f2f2f2',           // Primary text
  echo           200: '#a0a0a0',           // Secondary text
  echo           300: '#6a6a6a',           // Disabled text
  echo         },
  echo         'accent': {
  echo           'green': '#00b894',       // Success color
  echo           'yellow': '#fdcb6e',      // Warning color
  echo           'red': '#e17055',         // Error color
  echo         }
  echo       },
  echo       fontFamily: {
  echo         sans: ['Inter', 'Roboto', 'sans-serif'],
  echo       },
  echo       boxShadow: {
  echo         'game': '0 4px 20px rgba(0, 0, 0, 0.5)',
  echo       },
  echo       borderWidth: {
  echo         '1': '1px',
  echo       },
  echo     },
  echo   },
  echo   plugins: [],
  echo }
)

echo [4/4] Updating index.css with Tailwind directives...
> src\index.css (
  echo @tailwind base;
  echo @tailwind components;
  echo @tailwind utilities;
  echo.
  echo @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  echo.
  echo @layer base {
  echo   body {
  echo     @apply bg-dark-300 text-light-100;
  echo   }
  echo.
  echo   h1, h2, h3, h4, h5, h6 {
  echo     @apply font-bold text-light-100;
  echo   }
  echo.
  echo   a {
  echo     @apply text-primary hover:text-primary-light transition-colors;
  echo   }
  echo.
  echo   input, select, textarea {
  echo     @apply bg-dark-400 text-light-100 border border-dark-100 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary;
  echo   }
  echo }
  echo.
  echo @layer components {
  echo   .btn {
  echo     @apply px-4 py-2 rounded font-medium transition-all;
  echo   }
  echo.
  echo   .btn-primary {
  echo     @apply bg-primary text-white hover:bg-primary-dark;
  echo   }
  echo.
  echo   .btn-secondary {
  echo     @apply bg-secondary text-white hover:bg-opacity-90;
  echo   }
  echo.
  echo   .btn-outline {
  echo     @apply border border-primary text-primary hover:bg-primary hover:text-white;
  echo   }
  echo.
  echo   .navbar {
  echo     @apply bg-dark-500 text-light-100 border-b border-dark-100 shadow-game;
  echo   }
  echo.
  echo   .navbar-item {
  echo     @apply text-light-100 hover:text-primary;
  echo   }
  echo.
  echo   .card {
  echo     @apply bg-dark-200 rounded-lg shadow-game border border-dark-100 p-4;
  echo   }
  echo.
  echo   .stats-card {
  echo     @apply card flex flex-col items-center justify-center;
  echo   }
  echo.
  echo   .stat-value {
  echo     @apply text-4xl font-bold text-primary my-2;
  echo   }
  echo.
  echo   .stat-label {
  echo     @apply text-sm text-light-200 uppercase tracking-wider;
  echo   }
  echo.
  echo   .stat-subtitle {
  echo     @apply text-xs text-light-300;
  echo   }
  echo.
  echo   .match-card {
  echo     @apply bg-dark-400 border border-dark-100 rounded-lg p-4 flex items-start gap-4 transition-all hover:shadow-game;
  echo   }
  echo.
  echo   .match-card.custom-match {
  echo     @apply border-l-4 border-l-primary;
  echo   }
  echo.
  echo   .match-card.registered {
  echo     @apply border-l-4 border-l-accent-green;
  echo   }
  echo.
  echo   .match-card.selected {
  echo     @apply bg-dark-400 bg-opacity-60 border border-primary-dark;
  echo   }
  echo.
  echo   .badge {
  echo     @apply bg-primary text-white text-xs px-2 py-1 rounded font-medium;
  echo   }
  echo.
  echo   .badge-success {
  echo     @apply bg-accent-green;
  echo   }
  echo.
  echo   .badge-warning {
  echo     @apply bg-accent-yellow text-dark-500;
  echo   }
  echo.
  echo   .badge-error {
  echo     @apply bg-accent-red;
  echo   }
  echo.
  echo   .error-message {
  echo     @apply bg-accent-red bg-opacity-10 border border-accent-red text-accent-red rounded p-3;
  echo   }
  echo.
  echo   .spinner {
  echo     @apply w-10 h-10 border-4 border-dark-100 border-t-primary rounded-full animate-spin;
  echo   }
  echo }
)

echo.
echo ======================================================
echo Tailwind CSS setup complete! Now run 'npm start' to start the app
echo ======================================================
