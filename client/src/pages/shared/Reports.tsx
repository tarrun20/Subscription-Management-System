import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AnalyticsData } from '../../types';

export const Reports: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [retention, setRetention] = useState<any>(null);

  useEffect(() => {
    Promise.all([api.get('/analytics/dashboard'), api.get('/analytics/retention')]).then(([d, r]) => { setData(d.data); setRetention(r.data); }).catch(console.error);
  }, []);

  const downloadLedger = async () => {
    const response = await api.get('/exports/ledger.csv', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
    const link = document.createElement('a'); link.href = url; link.download = 'brightloop-ledger.csv'; link.click(); URL.revokeObjectURL(url);
  };

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
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between"><div><h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Retention & Plan Movement</h3><p className="text-xs text-slate-500 mt-1">Subscription status and recorded plan changes</p></div><button onClick={downloadLedger} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">Download ledger CSV</button></div>
        {retention && <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="p-4 rounded-xl bg-slate-50"><span className="text-slate-500">Active</span><strong className="block text-xl">{retention.subscriptions.active}</strong></div>
            <div className="p-4 rounded-xl bg-slate-50"><span className="text-slate-500">Closed</span><strong className="block text-xl">{retention.subscriptions.closed}</strong></div>
            <div className="p-4 rounded-xl bg-slate-50"><span className="text-slate-500">Closed share</span><strong className="block text-xl">{retention.subscriptions.churnRatePercent}%</strong></div>
            <div className="p-4 rounded-xl bg-slate-50"><span className="text-slate-500">Upgrades / downgrades</span><strong className="block text-xl">{retention.planChanges.upgrades} / {retention.planChanges.downgrades}</strong></div>
          </div>
          <div className="space-y-2">{retention.activeByPlan.map((p: any) => <div key={p.planId} className="flex justify-between text-sm border-b border-slate-100 pb-2"><span>{p.planName}</span><strong>{p.count} active</strong></div>)}</div>
        </>}
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
