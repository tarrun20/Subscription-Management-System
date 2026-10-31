import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, Sparkles, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  onTriggerBilling?: () => void;
  billingLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onTriggerBilling, billingLoading }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60">
          Brightloop Cloud Engine • v1.0
        </span>
      </div>

      <div className="flex items-center space-x-3">
        {/* Trigger Automated Billing Button (for Admin & Staff) */}
        {(user?.role === 'ADMIN' || user?.role === 'STAFF') && onTriggerBilling && (
          <button
            onClick={onTriggerBilling}
            disabled={billingLoading}
            className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50"
            title="Runs automated recurring billing cycle right now"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{billingLoading ? 'Processing Billing...' : 'Run Billing Cycle'}</span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* Dark / Light Mode Toggle */}
        <div className="flex items-center space-x-2" title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
          <Sun className={`w-3.5 h-3.5 transition-colors ${isDark ? 'text-slate-500' : 'text-amber-500'}`} />
          <button
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle dark mode"
            onClick={toggleTheme}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
              isDark
                ? 'bg-indigo-600 border-indigo-600'
                : 'bg-slate-200 border-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ${
                isDark ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
          <Moon className={`w-3.5 h-3.5 transition-colors ${isDark ? 'text-indigo-400' : 'text-slate-400'}`} />
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{user?.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">{user?.role} Portal</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
