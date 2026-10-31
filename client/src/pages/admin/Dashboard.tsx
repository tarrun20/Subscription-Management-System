import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { AnalyticsData } from '../../types';
import { StatCard } from '../../components/StatCard';
import {
  Users,
  Repeat,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMsg, setBillingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/dashboard');
      setData(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRunBilling = async () => {
    try {
      setBillingLoading(true);
      setBillingMsg(null);
      const res = await api.post('/billing/run');
      setBillingMsg({
        type: 'success',
        text: `Automated billing processed: ${res.data.processedCount} evaluated, ${res.data.generatedInvoices.length} invoices generated, ${res.data.skippedCount} cycles already up-to-date.`
      });
      fetchAnalytics();
    } catch (err: any) {
      setBillingMsg({
        type: 'error',
        text: err.response?.data?.message || 'Error running automated billing.'
      });
    } finally {
      setBillingLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Calculating real-time financial metrics from PostgreSQL...</p>
        </div>
      </div>
    );
  }

  const { metrics, charts } = data;

  return (
    <div className="p-8 space-y-8">
      {/* Header and Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Executive Billing Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time subscription metrics, revenue recognition, and recurring billing operations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunBilling}
            disabled={billingLoading}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{billingLoading ? 'Processing Invoices...' : 'Trigger Recurring Billing Run'}</span>
          </button>
        </div>
      </div>

      {billingMsg && (
        <div className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
          billingMsg.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{billingMsg.text}</span>
          <button onClick={() => setBillingMsg(null)} className="text-slate-500 hover:text-slate-800 ml-4">✕</button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Monthly Recurring Revenue"
          value={`₹${metrics.mrr.toLocaleString('en-IN')}`}
          subtitle="Normalized active run rate"
          icon={TrendingUp}
          trend="+14.2%"
          isPositive={true}
          color="blue"
        />
        <StatCard
          title="Annual Recurring Revenue"
          value={`₹${metrics.arr.toLocaleString('en-IN')}`}
          subtitle="ARR Projection"
          icon={DollarSign}
          trend="+18.5%"
          isPositive={true}
          color="purple"
        />
        <StatCard
          title="Revenue Collected"
          value={`₹${metrics.totalRevenueCollected.toLocaleString('en-IN')}`}
          subtitle="Actual payments cleared"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Outstanding Balance"
          value={`₹${metrics.outstandingPayments.toLocaleString('en-IN')}`}
          subtitle={`${metrics.overdueInvoicesCount} invoices overdue`}
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Second Row Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Customers</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{metrics.totalCustomers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Subscriptions</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{metrics.activeSubscriptions}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Expired / Closed</p>
          <p className="text-2xl font-black text-slate-500 mt-1">{metrics.expiredSubscriptions}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Renewals</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{metrics.upcomingRenewalsCount}</p>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue Growth Trend</h3>
              <p className="text-xs text-slate-400">Monthly invoice collection trajectory</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg">Last 6 Months</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyRevenueTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: 8, color: '#fff', fontSize: 12, border: 'none' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Subscription Plan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Revenue by Plan</h3>
              <p className="text-xs text-slate-400">Total earned distribution across plans</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueByPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="planName" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1E293B', borderRadius: 8, color: '#fff', fontSize: 12, border: 'none' }}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Payment Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Invoice Status Distribution</h3>
              <p className="text-xs text-slate-400">Breakdown of all billed invoices</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.invoiceStatusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                >
                  {charts.invoiceStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderRadius: 8, color: '#fff', fontSize: 12, border: 'none' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Status Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Subscription Health</h3>
              <p className="text-xs text-slate-400">Active vs Paused vs Closed accounts</p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.subscriptionStatusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={4}
                >
                  {charts.subscriptionStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E293B', borderRadius: 8, color: '#fff', fontSize: 12, border: 'none' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
