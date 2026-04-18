/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/components/**/*.{vue,js}',
    './src/layouts/**/*.vue',
    './src/pages/**/*.vue',
    './src/app.vue',
    './src/plugins/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2563EB',
          dark: '#1D4ED8',
          light: '#EFF6FF',
          mid: '#3B82F6',
        },
        surface: {
          DEFAULT: '#F0F4FA',
          card: '#FFFFFF',
        },
        sidebar: {
          bg: '#1E3A5F',
          active: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 2px 16px rgba(37,99,235,0.08)',
        'card-md': '0 4px 24px rgba(37,99,235,0.13)',
      },
      borderRadius: {
        xl: '10px',
        '2xl': '16px',
      },
      keyframes: {
        /** облака: мало опорных точек + длинный цикл = без рывков между ключами */
        drift: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '33%': { transform: 'translate3d(16px, -7px, 0)' },
          '66%': { transform: 'translate3d(30px, 5px, 0)' },
        },
        'aurora-shift': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.45' },
          '33%': { transform: 'translate(4%, -3%) scale(1.05)', opacity: '0.65' },
          '66%': { transform: 'translate(-3%, 2%) scale(0.98)', opacity: '0.5' },
        },
        'grid-pan': {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(40px, 40px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.9' },
        },
        'twinkle-slow': {
          '0%, 100%': { opacity: '0.15', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.25)' },
        },
        'sky-shimmer': {
          '0%, 100%': { opacity: '0.22' },
          '33%': { opacity: '0.38' },
          '66%': { opacity: '0.28' },
        },
      },
      animation: {
        drift: 'drift 32s cubic-bezier(0.42, 0, 0.58, 1) infinite',
        'drift-slow': 'drift 48s cubic-bezier(0.42, 0, 0.58, 1) infinite reverse',
        'drift-fast': 'drift 22s cubic-bezier(0.42, 0, 0.58, 1) infinite',
        'aurora-shift': 'aurora-shift 18s ease-in-out infinite',
        'grid-pan': 'grid-pan 60s linear infinite',
        twinkle: 'twinkle 4s ease-in-out infinite',
        'twinkle-slow': 'twinkle-slow 5.5s ease-in-out infinite',
        'sky-shimmer': 'sky-shimmer 16s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
