/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nemesis: {
          bg: '#05070c',
          hull: '#0e1420',
          metal: '#1a2333',
          border: '#2a3b54',
          neon: '#00f0ff',
          alert: '#ff003c',
          fire: '#ff5500',
          slime: '#00ff66',
          warning: '#ffb700',
        },
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4)',
        'neon-red': '0 0 15px rgba(255, 0, 60, 0.5)',
      },
    },
  },
  plugins: [],
};
