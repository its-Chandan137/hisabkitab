/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a0a0f',
        panel: '#121520',
        electric: {
          300: '#60a5fa',
          500: '#3b82f6',
          700: '#1d4ed8',
        },
        success: '#22c55e',
        danger: '#ef4444',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59,130,246,0.24), 0 24px 80px rgba(15,23,42,0.55), 0 0 32px rgba(59,130,246,0.15)',
        soft: '0 18px 50px rgba(2,6,23,0.42)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'hero-radial':
          'radial-gradient(circle at top, rgba(59,130,246,0.22), transparent 38%), radial-gradient(circle at bottom right, rgba(29,78,216,0.2), transparent 32%)',
      },
    },
  },
  plugins: [],
};
