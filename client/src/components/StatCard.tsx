import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  isPositive?: boolean;
  color?: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  isPositive,
  color = 'blue'
}) => {
  const colorMap = {
    blue:    'bg-blue-50    dark:bg-blue-900/30    text-blue-600    dark:text-blue-400    border-blue-100    dark:border-blue-800/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50',
    purple:  'bg-purple-50  dark:bg-purple-900/30  text-purple-600  dark:text-purple-400  border-purple-100  dark:border-purple-800/50',
    amber:   'bg-amber-50   dark:bg-amber-900/30   text-amber-600   dark:text-amber-400   border-amber-100   dark:border-amber-800/50',
    rose:    'bg-rose-50    dark:bg-rose-900/30    text-rose-600    dark:text-rose-400    border-rose-100    dark:border-rose-800/50',
  };

  return (
    <div className="bg-white dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 p-5 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/40 transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-3 flex items-center text-xs">
          {trend && (
            <span className={`font-semibold mr-1.5 ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {trend}
            </span>
          )}
          {subtitle && <span className="text-slate-500 dark:text-slate-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
