import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ColorPalette } from './types';

interface ThemeContextValue {
  palette: ColorPalette;
  togglePalette: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemColorScheme(): ColorPalette {
  if (typeof window === 'undefined' || !window.matchMedia) return 'palette-light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'palette-dark' : 'palette-light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [palette, setPalette] = useState<ColorPalette>(() => {
    if (typeof window === 'undefined') return 'palette-light';
    const saved = localStorage.getItem('color-palette') as ColorPalette | null;
    if (saved === 'palette-dark' || saved === 'palette-light') return saved;
    return getSystemColorScheme();
  });

  useEffect(() => {
    localStorage.setItem('color-palette', palette);
  }, [palette]);

  const togglePalette = useCallback(() => {
    setPalette((p) => (p === 'palette-light' ? 'palette-dark' : 'palette-light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ palette, togglePalette }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
