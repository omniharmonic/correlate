export type Theme = 'solarpunk' | 'lunarpunk';

export interface ThemeConfig {
  theme: Theme;
  systemPreference: boolean;
}

export interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isSystemPreference: boolean;
  setSystemPreference: (useSystem: boolean) => void;
} 