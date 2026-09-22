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
      keyframes: {
        'contact-reveal': {
          '0%': { opacity: '0', transform: 'perspective(600px) translateY(48px) rotateY(180deg) scale(0.65)' },
          '60%': { opacity: '1', transform: 'perspective(600px) translateY(-6px) rotateY(15deg) scale(1.05)' },
          '100%': { opacity: '1', transform: 'perspective(600px) translateY(0) rotateY(0) scale(1)' },
        },
        'contact-warning': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
        'contact-card': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'die-roll': {
          '0%': { transform: 'rotate(-160deg) scale(0.7)', opacity: '0' },
          '55%': { transform: 'rotate(12deg) scale(1.08)', opacity: '1' },
          '75%': { transform: 'rotate(-6deg) scale(0.98)' },
          '100%': { transform: 'rotate(0deg) scale(1)', opacity: '1' },
        },
        'vent-alarm': {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '0.25' },
        },
        'vent-flow': {
          '0%': { strokeDashoffset: '0' },
          '100%': { strokeDashoffset: '-24' },
        },
        'vent-echo': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.55)' },
          '14%': { opacity: '0.95', transform: 'translateY(0) scale(1)' },
          '65%': { opacity: '0.5', transform: 'translateY(-3px) scale(0.92)' },
          '100%': { opacity: '0', transform: 'translateY(9px) scale(0.4)' },
        },
        'door-breach': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '18%': { opacity: '1', transform: 'scale(1.25)' },
          '38%': { opacity: '0.9', transform: 'scale(0.92)' },
          '55%': { opacity: '1', transform: 'scale(1.12)' },
          '100%': { opacity: '0', transform: 'scale(1.6)' },
        },
        'token-fade': {
          '0%': { opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'contact-reveal': 'contact-reveal 800ms ease-out both',
        'contact-warning': 'contact-warning 700ms ease-in-out 2',
        'contact-card': 'contact-card 450ms ease-out both',
        'die-roll': 'die-roll 900ms ease-out both',
        'vent-alarm': 'vent-alarm 1.1s ease-in-out infinite',
        'vent-flow': 'vent-flow 1.6s linear infinite',
        'vent-echo': 'vent-echo 2400ms ease-in-out both',
        'door-breach': 'door-breach 1s ease-out both',
        'token-fade': 'token-fade 700ms ease-out both',
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4)',
        'neon-red': '0 0 15px rgba(255, 0, 60, 0.5)',
      },
    },
  },
  plugins: [],
};
