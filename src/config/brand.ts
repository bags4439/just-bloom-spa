export const brand = {
  colors: {
    primary: '#1D4D35',
    primaryDark: '#142E20',
    primaryLight: '#2A6B4A',
    primaryPale: '#E4F0E9',
    accent: '#C4962A',
    accentLight: '#F5E9C8',
    cream: '#FAF6EE',
    creamDark: '#F0E9DA',
    surface: '#FFFFFF',
    border: '#DDE8E2',
    text: {
      primary: '#1A2920',
      secondary: '#5A7060',
      tertiary: '#8A9E90',
    },
    status: {
      success: '#15803D',
      successBg: '#F0FDF4',
      danger: '#B91C1C',
      dangerBg: '#FEF2F2',
      warning: '#B45309',
      warningBg: '#FFFBEB',
      info: '#1D4ED8',
      infoBg: '#EFF6FF',
    },
    channel: {
      cash: { bg: '#E4F0E9', text: '#1D4D35' },
      momo: { bg: '#FFF3E0', text: '#C45600' },
      bank: { bg: '#EFF6FF', text: '#1D4ED8' },
      split: { bg: '#F5F3FF', text: '#6D28D9' },
    },
  },
  fonts: {
    sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },
  spacing: {
    pagePadding: '36px 40px',
    cardPadding: '20px 24px',
    sidebarWidth: '216px',
  },
  shadows: {
    card: '0 1px 3px rgba(29, 77, 53, 0.06)',
    modal: '0 8px 32px rgba(29, 77, 53, 0.12)',
  },
  transition: {
    default: '150ms ease',
    slow: '300ms ease',
  },
} as const;

export type Brand = typeof brand;
export type BrandColors = typeof brand.colors;
