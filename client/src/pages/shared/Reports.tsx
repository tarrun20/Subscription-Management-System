import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AnalyticsData } from '../../types';

export const Reports: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    api.get('/analytics/dashboard').then(res => setData(res.data)).catch(console.error);
  }, []);

  if (!data) return <div className="p-8 text-center text-slate-400">Loading financial reports...</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Financial & Revenue Reports</h1>
        <p className="text-xs text-slate-500 mt-1">GAAP subscription revenue recognition, cohort billing cycles, and collection summaries</p>
      </div>

      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-4">Summary Ledger Table</h3>
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
          <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-4 py-3">Metric Category</th>
              <th className="px-4 py-3">Database Measurement</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">Monthly Recurring Revenue (MRR)</td>
              <td className="px-4 py-3 font-bold text-blue-600">₹{data.metrics.mrr.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3"><span className="text-emerald-600 font-bold">Active Normalized</span></td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">Annual Recurring Revenue (ARR)</td>
              <td className="px-4 py-3 font-bold text-purple-600">₹{data.metrics.arr.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3"><span className="text-purple-600 font-bold">Projected Annual</span></td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">Total Net Collections (Recorded Payments)</td>
              <td className="px-4 py-3 font-bold text-emerald-600">₹{data.metrics.totalRevenueCollected.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3"><span className="text-emerald-600 font-bold">Cleared</span></td>
            </tr>
            <tr>
              <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-50">Outstanding Invoices Balance</td>
              <td className="px-4 py-3 font-bold text-rose-600">₹{data.metrics.outstandingPayments.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3"><span className="text-amber-600 font-bold">Pending Collection</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const Settings: React.FC = () => {
  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Organization & Billing Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Brightloop Software platform configuration and operational parameters</p>
      </div>

      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm space-y-4 text-xs">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Company Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-500 mb-1">Company Name</label>
            <input type="text" readOnly value="Brightloop Software Solutions Pvt Ltd" className="w-full p-2 bg-slate-50 border rounded-lg" />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">GSTIN Registration</label>
            <input type="text" readOnly value="29AABCU9603R1ZM" className="w-full p-2 bg-slate-50 border rounded-lg font-mono" />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Billing Email</label>
            <input type="text" readOnly value="billing@brightloop.com" className="w-full p-2 bg-slate-50 border rounded-lg" />
          </div>
          <div>
            <label className="block text-slate-500 mb-1">Currency Code</label>
            <input type="text" readOnly value="INR (₹)" className="w-full p-2 bg-slate-50 border rounded-lg font-bold" />
          </div>
        </div>
      </div>
    </div>
  );
};
