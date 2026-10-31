import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { LogOut, Sparkles } from 'lucide-react';

interface NavbarProps {
  onTriggerBilling?: () => void;
  billingLoading?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onTriggerBilling, billingLoading }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/60">
          Brightloop Cloud Engine • v1.0
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {/* Trigger Automated Billing Button (for Admin & Staff) */}
        {(user?.role === 'ADMIN' || user?.role === 'STAFF') && onTriggerBilling && (
          <button
            onClick={onTriggerBilling}
            disabled={billingLoading}
            className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            title="Runs automated recurring billing cycle right now"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{billingLoading ? 'Processing Billing...' : 'Run Billing Cycle'}</span>
          </button>
        )}

        {/* Dual Segmented Light / Dark Mode Toggle */}
        <ThemeToggle />

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-tight">{user?.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{user?.role} Portal</p>
          </div>
          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
