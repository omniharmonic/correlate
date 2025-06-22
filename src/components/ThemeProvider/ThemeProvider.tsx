import React, { createContext, useContext, useEffect, useState } from 'react';
import { Theme, ThemeContextValue } from '@/shared/types/theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'solarpunk',
  storageKey = 'correlate-theme',
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'solarpunk' || stored === 'lunarpunk') {
        return stored;
      }
    }
    return defaultTheme;
  });

  // Initialize theme on first render
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    
    // Ensure initial theme is applied
    root.classList.remove('solarpunk', 'lunarpunk');
    body.classList.remove('solarpunk', 'lunarpunk');
    root.classList.add(theme);
    body.classList.add(theme);
  }, []);

  const [isSystemPreference, setIsSystemPreference] = useState(false);

  useEffect(() => {
    // Apply theme class to document root and body
    const root = document.documentElement;
    const body = document.body;
    
    // Remove all theme classes first
    root.classList.remove('solarpunk', 'lunarpunk');
    body.classList.remove('solarpunk', 'lunarpunk');
    
    // Add the current theme class
    root.classList.add(theme);
    body.classList.add(theme);
    
    // Store in localStorage
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'solarpunk' ? 'lunarpunk' : 'solarpunk';
    setTheme(newTheme);
  };

  const setSystemPreferenceValue = (useSystem: boolean) => {
    setIsSystemPreference(useSystem);
    if (useSystem) {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'lunarpunk' : 'solarpunk');
    }
  };

  // System preference detection
  useEffect(() => {
    if (!isSystemPreference) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (isSystemPreference) {
        setTheme(e.matches ? 'lunarpunk' : 'solarpunk');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isSystemPreference]);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    toggleTheme,
    isSystemPreference,
    setSystemPreference: setSystemPreferenceValue,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 