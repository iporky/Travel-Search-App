// Design tokens derived from the Konnect Design System (Figma F2WNfb7GrbyOMb2tIn7WtF)

export const colors = {
  blue: {
    100: '#eaefff',
    150: '#d8ecfb',
    170: '#c9e3ff',
    200: '#c4d2ff',
    300: '#9eb6ff',
    400: '#7899ff',
    450: '#145dd3',
    500: '#527dff',
    600: '#2b5ef8',
    700: '#1342cf',
    750: '#114a8c',
    800: '#022ba6',
    900: '#001f7d',
    1000: '#001555',
  },
  gray: {
    100: '#ffffff',
    200: '#f2f9ff',
    300: '#eaf4ff',
    400: '#daebff',
    500: '#c5d7ec',
    600: '#abbed2',
    700: '#93a5b9',
    800: '#7c8d9f',
    900: '#657586',
    1000: '#505d6d',
    1100: '#4a4458',
    1200: '#332d41',
    1300: '#1d192b',
    1400: '#000000',
  },
  red: {
    100: '#E62D3C',
  },
  text: {
    primary: '#332d41',
    secondary: '#145dd3',
    tertiary: '#527dff',
    disabled: '#7c8d9f',
    warning: '#ff5810',
    onDark: '#ffffff',
  },
  icon: {
    primary: '#1d192b',
    secondary: '#332d41',
    accent: '#527dff',
    subtle: '#d8ecfb',
    disabled: '#93a5b9',
  },
  surface: {
    default: '#f2f9ff',
    focus: '#c9e3ff',
    soft: '#eaf4ff',
    subtle: '#eaefff',
  },
};

// Gradient pairs from the Color Styles (Paint) table
export const gradients = {
  surfaceDim: ['#f2f9ff', '#eaefff'] as const,
  surfaceAccent: ['#ffffff', '#d9d6ff'] as const,
  surfaceAccentGradient: ['#e3f1ff', '#2f52ec'] as const,
  surfaceAccentBlend: ['#7268ff', '#5446fb'] as const,
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
};

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 36,
  '6xl': 40,
  full: 999,
};

export const typography = {
  heading35Semibold: { fontSize: 35, fontWeight: '600' as const, lineHeight: 44, letterSpacing: -1.4 },
  heading32Medium: { fontSize: 30, fontWeight: '500' as const, lineHeight: 42, letterSpacing: -1.2 },
  body16Medium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 21 },
  body16Regular: { fontSize: 16, fontWeight: '400' as const, lineHeight: 21 },
  body14Semibold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20, letterSpacing: -0.28 },
  body14Medium: { fontSize: 14, fontWeight: '500' as const, lineHeight: 20, letterSpacing: -0.28 },
  caption12Semibold: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16 },
  caption12Medium: { fontSize: 12, fontWeight: '500' as const, lineHeight: 16 },
  caption12Regular: { fontSize: 12, fontWeight: '400' as const, lineHeight: 18 },
};

// Card / input shadow tokens approximated for RN
export const shadows = {
  cardDefault: {
    shadowColor: '#c4d2ff',
    shadowOpacity: 0.3,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: -3 },
    elevation: 3,
  },
  cardSelected: {
    shadowColor: '#c4d2ff',
    shadowOpacity: 1,
    shadowRadius: 29,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  inputDefault: {
    shadowColor: '#0077ff',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
};

export const theme = { colors, gradients, spacing, radius, typography, shadows };
export type Theme = typeof theme;
