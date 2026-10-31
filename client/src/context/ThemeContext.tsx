import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setLight: () => void;
  setDark: () => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Apply theme directly to DOM - called immediately, no React delays
function applyThemeToDom(mode: Theme) {
  const html = document.documentElement;
  if (mode === 'dark') {
    html.classList.add('dark');
    html.style.colorScheme = 'dark';
  } else {
    html.classList.remove('dark');
    html.style.colorScheme = 'light';
  }
  try {
    localStorage.setItem('brightloop_theme', mode);
  } catch {}
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('brightloop_theme') as Theme | null;
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  });

  // Apply on initial mount and whenever theme changes
  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setLight = () => {
    applyThemeToDom('light');
    setTheme('light');
  };

  const setDark = () => {
    applyThemeToDom('dark');
    setTheme('dark');
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyThemeToDom(next);
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', setLight, setDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
};
