/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cereon-green': '#4ade80',
        'cereon-green-dark': '#3fb570',
        'cereon-dark': '#1f2937',
        'cereon-light': '#f0fdf4',
        /* Dark mode palette */
        'dark-bg': '#050709',
        'dark-accent-1': '#0f3d22',
        'dark-accent-2': '#1a5e3f',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fadeInOut: {
          '0%': { opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in-out': 'fadeInOut 4s ease-in-out forwards',
      },
    },
  },
  plugins: [],
}
