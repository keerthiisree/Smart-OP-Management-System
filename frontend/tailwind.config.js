/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: '#95CCDA',
        dark: '#0F172A',
        darker: '#0B1120'
      }
    },
  },
  plugins: [],
}