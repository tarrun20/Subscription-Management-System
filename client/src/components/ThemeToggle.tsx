import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle light and dark mode"
      className={`inline-flex items-center p-1 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm ${
        isDark
          ? 'bg-slate-800/90 border-slate-700 text-slate-300 hover:border-slate-600'
          : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-slate-300'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Light option */}
      <span
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
          !isDark
            ? 'bg-white text-amber-600 shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span>Light</span>
      </span>

      {/* Dark option */}
      <span
        className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 ${
          isDark
            ? 'bg-indigo-600 text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Moon className="w-3.5 h-3.5 text-indigo-300" />
        <span>Dark</span>
      </span>
    </button>
  );
};
