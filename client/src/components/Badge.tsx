import React from 'react';

interface BadgeProps {
  status: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const getColors = (s: string) => {
    switch (s.toUpperCase()) {
      case 'ACTIVE':
      case 'PAID':
      case 'APPROVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CONFIRMED':
      case 'SENT':
      case 'CONVERTED':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PAUSED':
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'DRAFT':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'CLOSED':
      case 'CANCELLED':
      case 'REJECTED':
      case 'ARCHIVED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 border-red-300 font-semibold';
      case 'ADMIN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'STAFF':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CUSTOMER':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getColors(status)} ${className}`}>
      {status}
    </span>
  );
};
