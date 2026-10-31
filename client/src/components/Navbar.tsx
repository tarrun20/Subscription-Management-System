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
        <button
          onClick={toggleTheme}
          type="button"
          className="flex items-center space-x-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 transition-colors shadow-sm"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-semibold">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs font-semibold">Dark Mode</span>
            </>
          )}
        </button>

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
