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
        // --- Кинематографичная презентация Фазы Событий (Шаг 9, визуал) ---
        'modal-enter': {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'step-enter': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'gauge-flash': {
          '0%': { opacity: '0.2' },
          '40%': { opacity: '1' },
          '100%': { opacity: '1' },
        },
        'card-reveal': {
          '0%': { opacity: '0', transform: 'translateY(14px) scale(0.92) rotate(-1.5deg)' },
          '60%': { opacity: '1', transform: 'translateY(-3px) scale(1.02) rotate(0.5deg)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1) rotate(0)' },
        },
        'flame-flicker': {
          '0%, 100%': { opacity: '0.95', transform: 'scale(1)' },
          '30%': { opacity: '0.7', transform: 'scale(1.06)' },
          '60%': { opacity: '1', transform: 'scale(0.97)' },
        },
        'token-pop': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '60%': { opacity: '1', transform: 'scale(1.18)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'door-shockwave': {
          '0%': { opacity: '0.9', transform: 'scale(0.15)' },
          '100%': { opacity: '0', transform: 'scale(2.4)' },
        },
        'door-spark': {
          '0%': { opacity: '0', transform: 'scaleY(0.2)' },
          '25%': { opacity: '1', transform: 'scaleY(1.1)' },
          '100%': { opacity: '0', transform: 'scaleY(0.4)' },
        },
        'hub-ripple': {
          '0%': { opacity: '0', transform: 'scale(0.25)' },
          '35%': { opacity: '0.75', transform: 'scale(0.8)' },
          '100%': { opacity: '0', transform: 'scale(1.7)' },
        },
        // --- Этап 2: туман, вскрытие, жетоны ---
        'fog-dissolve': {
          '0%': { opacity: '0.88' },
          '35%': { opacity: '0.65' },
          '100%': { opacity: '0' },
        },
        'scanline-sweep': {
          '0%': { transform: 'translateX(-72px)', opacity: '0' },
          '18%': { opacity: '1' },
          '82%': { opacity: '1' },
          '100%': { transform: 'translateX(72px)', opacity: '0' },
        },
        'room-flip': {
          '0%': { transform: 'scaleY(1)' },
          '42%': { transform: 'scaleY(0.06)' },
          '58%': { transform: 'scaleY(0.06)' },
          '100%': { transform: 'scaleY(1)' },
        },
        'room-flash': {
          '0%': { strokeWidth: '2', strokeOpacity: '0.2', opacity: '0' },
          '18%': { strokeWidth: '7', strokeOpacity: '1', opacity: '1' },
          '52%': { strokeWidth: '6', strokeOpacity: '0.95', opacity: '1' },
          '100%': { strokeWidth: '2', strokeOpacity: '0', opacity: '0' },
        },
        'typewriter-cursor': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'exploration-reveal': {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.32) rotate(-3deg)' },
          '22%': { opacity: '1', transform: 'translateY(-6px) scale(1.18) rotate(1deg)' },
          '36%': { opacity: '1', transform: 'translateY(0) scale(1) rotate(0)' },
          '78%': { opacity: '1', transform: 'translateY(0) scale(1) rotate(0)' },
          '100%': { opacity: '0', transform: 'translateY(-14px) scale(0.88)' },
        },
        'exploration-settle': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(10px) scale(0.82)' },
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
        'modal-enter': 'modal-enter 500ms cubic-bezier(0.22, 0.9, 0.3, 1) both',
        'step-enter': 'step-enter 380ms ease-out both',
        'gauge-flash': 'gauge-flash 900ms ease-out both',
        'card-reveal': 'card-reveal 650ms cubic-bezier(0.3, 0.8, 0.3, 1) both',
        'flame-flicker': 'flame-flicker 1.4s ease-in-out 3',
        'token-pop': 'token-pop 700ms cubic-bezier(0.34, 1.4, 0.5, 1) both',
        'door-shockwave': 'door-shockwave 900ms ease-out both',
        'door-spark': 'door-spark 750ms ease-out both',
        'hub-ripple': 'hub-ripple 1100ms ease-out 450ms both',
        'fog-dissolve': 'fog-dissolve 620ms ease-out both',
        'scanline-sweep': 'scanline-sweep 600ms cubic-bezier(0.22, 0.9, 0.3, 1) both',
        'room-flip': 'room-flip 460ms cubic-bezier(0.6, 0, 0.4, 1) both',
        'room-flash': 'room-flash 620ms ease-out both',
        'typewriter-cursor': 'typewriter-cursor 750ms step-end infinite',
        'exploration-reveal': 'exploration-reveal 1650ms cubic-bezier(0.34, 1.2, 0.5, 1) both',
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 240, 255, 0.4)',
        'neon-red': '0 0 15px rgba(255, 0, 60, 0.5)',
      },
    },
  },
  plugins: [],
};
