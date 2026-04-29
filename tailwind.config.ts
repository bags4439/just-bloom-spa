import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1D4D35',
          dark: '#142E20',
          light: '#2A6B4A',
          pale: '#E4F0E9',
        },
        accent: {
          DEFAULT: '#C4962A',
          light: '#F5E9C8',
        },
        cream: {
          DEFAULT: '#FAF6EE',
          dark: '#F0E9DA',
        },
        border: {
          DEFAULT: '#DDE8E2',
        },
        'text-primary': '#1A2920',
        'text-secondary': '#5A7060',
        'text-tertiary': '#8A9E90',
      },
      fontFamily: {
        sans: [
          'DM Sans',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(29, 77, 53, 0.06)',
        modal: '0 8px 32px rgba(29, 77, 53, 0.12)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
} satisfies Config;
