/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Estados de leitura do TRAEL Vision (design_handoff_react_native/expo-app/src/theme.ts).
export type ReadingState = 'pending' | 'processing' | 'success' | 'lowconf' | 'mismatch' | 'validated';

export const STATE_COLORS: Record<ReadingState, string> = {
  pending: '#64748b',
  processing: '#2f81f7',
  success: '#8FC73E',
  lowconf: '#e0a12b',
  mismatch: '#e5484d',
  validated: '#9a6bf0',
};

export const STATE_COLORS_HC: Record<ReadingState, string> = {
  pending: '#94a3b8',
  processing: '#4c9dff',
  success: '#b7f24a',
  lowconf: '#ffc247',
  mismatch: '#ff6166',
  validated: '#b98cff',
};

export const STATE_LABELS: Record<ReadingState, string> = {
  pending: 'Pendente',
  processing: 'Processando',
  success: 'Confirmada',
  lowconf: 'Baixa conf.',
  mismatch: 'Divergência',
  validated: 'Validada',
};

const DARK_SOFT: Record<ReadingState, string> = {
  pending: '#1c2530',
  processing: '#10233d',
  success: '#1d2b12',
  lowconf: '#2b2210',
  mismatch: '#2e1315',
  validated: '#221338',
};

const LIGHT_SOFT: Record<ReadingState, string> = {
  pending: '#eef1f5',
  processing: '#e6f0fe',
  success: '#eef7dd',
  lowconf: '#fbf1dd',
  mismatch: '#fdecec',
  validated: '#f1e9fd',
};

// Famílias carregadas via useFonts em src/app/_layout.tsx (@expo-google-fonts/*).
export const TraelFonts = {
  sans: 'Inter_400Regular',
  sansMed: 'Inter_500Medium',
  sansSemi: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  mono: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
} as const;

export const Colors = {
  light: {
    dark: false,
    bgBase: '#eef1f4',
    bgCanvas: '#f5f7f9',
    surface1: '#ffffff',
    surface2: '#f6f8fa',
    surface3: '#eaeef2',
    inset: '#0c1117',
    border: '#d6dde4',
    borderStrong: '#b9c3cd',
    text1: '#10151c',
    text2: '#47525f',
    text3: '#737f8c',
    brandPrimary: '#006536',
    brandMedium: '#5AA646',
    accent: '#8FC73E',
    brandInk: '#04120a',
    brandSurface: '#eef6ec',
    brandSurfaceBorder: '#cfe6c8',
    soft: LIGHT_SOFT,
  },
  dark: {
    dark: true,
    bgBase: '#0b0f14',
    bgCanvas: '#0f141b',
    surface1: '#151b24',
    surface2: '#1c232e',
    surface3: '#262f3c',
    inset: '#0c1117',
    border: '#2a3441',
    borderStrong: '#3a4658',
    text1: '#e7edf3',
    text2: '#a7b2c0',
    text3: '#6c7889',
    brandPrimary: '#006536',
    brandMedium: '#5AA646',
    accent: '#8FC73E',
    brandInk: '#04120a',
    brandSurface: '#10241a',
    brandSurfaceBorder: '#1c4530',
    soft: DARK_SOFT,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
