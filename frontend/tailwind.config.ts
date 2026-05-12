import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 修仙暗色主题
        bg: {
          primary: '#0a0a12',
          secondary: '#12121f',
          tertiary: '#1a1a2e',
          elevated: '#252540',
        },
        text: {
          primary: '#f0f0f5',
          secondary: '#a0a0b8',
          muted: '#6b6b80',
          link: '#7c5cfc',
        },
        primary: {
          50: '#ede9fe',
          100: '#ddd6fe',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c5cfc',
          600: '#6d28d9',
          700: '#5b21b6',
        },
        accent: {
          400: '#34e8b8',
          500: '#06d6a0',
        },
        neon: {
          cyan: '#00f5d4',
          magenta: '#f72585',
          yellow: '#fee440',
          orange: '#ff8c32',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans SC', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'game': '10px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(124,92,252,0.3)',
        'glow-accent': '0 0 20px rgba(6,214,160,0.3)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'spin': 'spin 1s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
