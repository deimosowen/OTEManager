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
        drift: {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(18px)' },
        },
      },
      animation: {
        drift: 'drift 8s ease-in-out infinite',
        'drift-slow': 'drift 11s ease-in-out infinite reverse',
        'drift-fast': 'drift 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
