import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  FileText,
  Repeat,
  Receipt,
  CreditCard,
  Percent,
  BarChart3,
  Settings,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const { user } = useAuth();
  const role = user?.role || 'CUSTOMER';

  const adminMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products & Variants', icon: Package },
    { id: 'plans', label: 'Subscription Plans', icon: Layers },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
    { id: 'renewal-management', label: 'Renewal Management', icon: Repeat },
    { id: 'invoices', label: 'Invoices & Billing', icon: Receipt },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'discounts', label: 'Discounts', icon: Percent },
    { id: 'taxes', label: 'Tax Rules', icon: ShieldCheck },
    { id: 'staff', label: 'Staff Members', icon: UserCheck },
    { id: 'reports', label: 'Financial Reports', icon: BarChart3 },
    { id: 'revenue-simulator', label: 'Revenue Simulator', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const staffMenu = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
    { id: 'renewal-management', label: 'Renewal Management', icon: Repeat },
    { id: 'invoices', label: 'Invoices', icon: Receipt },
    { id: 'payments', label: 'Record Payments', icon: CreditCard },
    { id: 'reports', label: 'Operational Reports', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const customerMenu = [
    { id: 'portal', label: 'My Subscriptions', icon: Repeat },
    { id: 'renewals-simulator', label: 'Renewals & Cost Simulator', icon: BarChart3 },
    { id: 'customer-invoices', label: 'My Invoices', icon: Receipt },
    { id: 'customer-payments', label: 'Payment History', icon: CreditCard },
    { id: 'customer-profile', label: 'Account Profile', icon: Users },
  ];

  const managerMenu = [
    { id: 'revenue-simulator', label: 'Revenue Simulator', icon: BarChart3 },
  ];

  const items = role === 'ADMIN' ? adminMenu : role === 'MANAGER' ? managerMenu : role === 'STAFF' ? staffMenu : customerMenu;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/20">
          B
        </div>
        <div>
          <h1 className="font-extrabold text-white text-base tracking-tight">Brightloop</h1>
          <p className="text-[11px] font-medium text-blue-400 uppercase tracking-wider">Subscription SaaS</p>
        </div>
      </div>

      {/* Role Pill */}
      <div className="px-5 py-3 border-b border-slate-800/60 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Current Role</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            role === 'ADMIN'
              ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
              : role === 'STAFF'
              ? 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50'
              : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
          }`}>
            {role}
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-blue-700 text-white font-bold flex items-center justify-center text-sm">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
