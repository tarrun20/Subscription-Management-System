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
  Filter,
  RefreshCw
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
import { useTheme } from '../../context/ThemeContext';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingMsg, setBillingMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { isDark } = useTheme();

  // Filter states
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [renewalStatus, setRenewalStatus] = useState<string>('ALL');

  const tooltipStyle = {
    backgroundColor: isDark ? '#1e293b' : '#1E293B',
    borderRadius: 8,
    color: '#fff',
    fontSize: 12,
    border: 'none',
  };
  const gridStroke = isDark ? '#334155' : '#F1F5F9';
  const axisStroke = isDark ? '#64748b' : '#94A3B8';

  const applyPreset = (preset: string) => {
    setDateRangePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === '30d') {
      const past = new Date(now.getTime() - 30 * 86400000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'quarter') {
      const past = new Date(now.getTime() - 90 * 86400000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'year') {
      const past = new Date(now.getFullYear(), 0, 1);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (renewalStatus && renewalStatus !== 'ALL') params.renewalStatus = renewalStatus;

      const res = await api.get('/analytics/dashboard', { params });
      setData(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, renewalStatus]);

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

  if (loading && !data) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Calculating real-time financial metrics from PostgreSQL...</p>
        </div>
      </div>
    );
  }

  const { metrics, charts } = data || {
    metrics: { mrr: 0, arr: 0, totalRevenueCollected: 0, outstandingPayments: 0, overdueInvoicesCount: 0, upcomingRenewalsCount: 0, totalCustomers: 0, activeSubscriptions: 0, expiredSubscriptions: 0 },
    charts: { revenueByPlan: [], monthlyRevenueTrend: [], invoiceStatusDistribution: [], subscriptionStatusDistribution: [] }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header and Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Executive Billing Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
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

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mr-2">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <span>Dashboard Filters:</span>
          </div>

          {/* Quick Date Presets */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-700">
            {[
              { id: 'all', label: 'All Time' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'quarter', label: 'Last 90 Days' },
              { id: 'year', label: 'This Year' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dateRangePreset === p.id
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-slate-50 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-500">
            <input
              type="date"
              aria-label="Start date filter"
              value={startDate}
              onChange={e => { setDateRangePreset('custom'); setStartDate(e.target.value); }}
              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
            />
            <span>to</span>
            <input
              type="date"
              aria-label="End date filter"
              value={endDate}
              onChange={e => { setDateRangePreset('custom'); setEndDate(e.target.value); }}
              className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs"
            />
          </div>
        </div>

        {/* Renewal Status Dropdown */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Renewal Status:</label>
          <select
            value={renewalStatus}
            onChange={e => setRenewalStatus(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
          >
            <option value="ALL">All Renewals</option>
            <option value="DUE_30">Due in 30 Days</option>
            <option value="DUE_15">Due in 15 Days</option>
            <option value="DUE_7">Due in 7 Days (Critical)</option>
            <option value="EXPIRED">Expired Subscriptions</option>
          </select>
          {(startDate || endDate || renewalStatus !== 'ALL') && (
            <button
              onClick={() => { applyPreset('all'); setRenewalStatus('ALL'); }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {billingMsg && (
        <div className={`p-4 rounded-xl border text-xs font-medium flex items-center justify-between ${
          billingMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700/60 text-rose-800 dark:text-rose-300'
        }`}>
          <span>{billingMsg.text}</span>
          <button onClick={() => setBillingMsg(null)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 ml-4">✕</button>
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
        <div className="bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Customers</p>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-1">{metrics.totalCustomers}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Subscriptions</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{metrics.activeSubscriptions}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Expired / Closed</p>
          <p className="text-2xl font-black text-slate-500 dark:text-slate-400 mt-1">{metrics.expiredSubscriptions}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {renewalStatus === 'ALL' ? 'Upcoming Renewals (30d)' : `Renewals (${renewalStatus.replace('_', ' ')})`}
          </p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{metrics.upcomingRenewalsCount}</p>
        </div>
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Trend */}
        <div className="bg-white dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Revenue Growth Trend</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Monthly invoice collection trajectory</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg">Last 6 Months</span>
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
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="month" stroke={axisStroke} fontSize={11} />
                <YAxis stroke={axisStroke} fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={tooltipStyle}
                />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Subscription Plan */}
        <div className="bg-white dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Revenue by Plan</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Total earned distribution across plans</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueByPlan}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="planName" stroke={axisStroke} fontSize={11} />
                <YAxis stroke={axisStroke} fontSize={11} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Invoice Payment Status */}
        <div className="bg-white dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Invoice Status Distribution</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Breakdown of all billed invoices</p>
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
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: isDark ? '#94a3b8' : undefined }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Status Distribution */}
        <div className="bg-white dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">Subscription Health</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Active vs Paused vs Closed accounts</p>
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
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ color: isDark ? '#94a3b8' : undefined }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
