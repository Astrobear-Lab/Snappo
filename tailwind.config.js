/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Inter', 'Nunito', 'sans-serif'],
      },
      colors: {
        peach: '#FFB7A8',
        cream: '#FFF5E6',
        teal: '#4FD1C5',
        coral: '#FF6B6B',
        navy: '#1A202C',
        purple: '#805AD5',
      },
    },
  },
  plugins: [],
}
