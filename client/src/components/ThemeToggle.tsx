import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { isDark, setLight, setDark } = useTheme();

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl border bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
      role="group"
      aria-label="Theme selector"
    >
      {/* Light button */}
      <button
        type="button"
        onClick={setLight}
        aria-pressed={!isDark}
        title="Switch to Light Mode"
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
          !isDark
            ? 'bg-white text-amber-600 shadow-sm border border-slate-200'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500' : 'text-slate-400'}`} />
        <span>Light</span>
      </button>

      {/* Dark button */}
      <button
        type="button"
        onClick={setDark}
        aria-pressed={isDark}
        title="Switch to Dark Mode"
        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
          isDark
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Moon className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-200' : 'text-slate-400'}`} />
        <span>Dark</span>
      </button>
    </div>
  );
};
