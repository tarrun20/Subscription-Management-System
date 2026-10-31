import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Subscription } from '../../types';
import { Badge } from '../../components/Badge';
import { Repeat, Pause, Play, RefreshCw, XOctagon, Calendar, AlertCircle, Plus } from 'lucide-react';

export const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/subscriptions', {
        params: { status: statusFilter || undefined }
      });
      setSubscriptions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [statusFilter]);

  const handlePause = async (id: string) => {
    try {
      setActionLoading(id);
      await api.post(`/subscriptions/${id}/pause`);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error pausing subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string) => {
    try {
      setActionLoading(id);
      await api.post(`/subscriptions/${id}/resume`);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error resuming subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRenew = async (id: string) => {
    try {
      setActionLoading(id);
      await api.post(`/subscriptions/${id}/renew`);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error renewing subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (id: string) => {
    if (!window.confirm('Close this subscription early?')) return;
    try {
      setActionLoading(id);
      await api.post(`/subscriptions/${id}/close`);
      fetchSubscriptions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error closing subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecordUsage = async (id: string) => {
    const description = window.prompt('Usage description (for example, API calls):');
    if (!description?.trim()) return;
    const quantity = Number(window.prompt('Quantity:', '1'));
    const unitPrice = Number(window.prompt('Price per unit (₹):', '0'));
    const taxRate = Number(window.prompt('Tax rate (%):', '18'));
    try { await api.post(`/subscriptions/${id}/usage`, { description, quantity, unitPrice, taxRate }); alert('Usage added to the next invoice.'); }
    catch (err: any) { alert(err.response?.data?.message || 'Could not record usage.'); }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Active Subscriptions</h1>
          <p className="text-xs text-slate-500 mt-1">
            State transitions: <code>Draft → Quotation → Confirmed → Active → Closed</code>
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-slate-200/70 rounded-xl text-xs font-semibold">
          {['', 'ACTIVE', 'PAUSED', 'CLOSED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === s
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-50'
              }`}
            >
              {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All Subscriptions'}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Subscription Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Plan & Frequency</th>
                <th className="px-6 py-4">Next Billing Date</th>
                <th className="px-6 py-4">Expiry Date</th>
                <th className="px-6 py-4">Billing Rate</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Loading subscriptions...</td></tr>
              ) : subscriptions.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">No subscriptions matching filter.</td></tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-700">{sub.subscriptionNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-50">{sub.customer?.companyName || sub.customer?.user?.name}</div>
                      <div className="text-[11px] text-slate-400">{sub.customer?.user?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">{sub.plan.name}</div>
                      <div className="text-[11px] text-blue-600 font-medium">{sub.plan.billingFrequency}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-800">
                      {new Date(sub.nextBillingDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                      {new Date(sub.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">
                      ₹{sub.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {sub.status === 'ACTIVE' && <button onClick={() => handleRecordUsage(sub.id)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Record billable usage"><Plus className="w-3.5 h-3.5" /></button>}
                        {sub.status === 'ACTIVE' && sub.plan.allowPause && (
                          <button
                            onClick={() => handlePause(sub.id)}
                            disabled={actionLoading === sub.id}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Pause Subscription"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {sub.status === 'PAUSED' && (
                          <button
                            onClick={() => handleResume(sub.id)}
                            disabled={actionLoading === sub.id}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Resume Subscription"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {sub.plan.allowRenewal && sub.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleRenew(sub.id)}
                            disabled={actionLoading === sub.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Renew Subscription"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {sub.plan.allowEarlyClosure && sub.status !== 'CLOSED' && (
                          <button
                            onClick={() => handleClose(sub.id)}
                            disabled={actionLoading === sub.id}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Close Subscription Early"
                          >
                            <XOctagon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
