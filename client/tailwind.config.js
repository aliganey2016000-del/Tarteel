/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        arabic: ['Amiri', 'Noto Naskh Arabic', 'serif']
      },
      colors: {
        emerald: {
          950: '#052e25'
        }
      }
    }
  },
  plugins: []
}
