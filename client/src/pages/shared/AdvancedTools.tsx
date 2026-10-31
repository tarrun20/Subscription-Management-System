import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import {
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Download,
  Percent,
  Sliders,
  Bell,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const card = 'bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-6 shadow-sm';
const labelCls = 'text-xs font-semibold text-slate-700 dark:text-slate-300';
const headingCls = 'font-bold text-lg text-slate-900 dark:text-slate-50';
const subheadingCls = 'font-semibold mt-5 text-slate-900 dark:text-slate-50 flex items-center space-x-2';
const inputCls = 'border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none';
const btnPrimary = 'px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm';
const btnSecondary = 'px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors';
const btnIndigo = 'px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors shadow-sm';

export const CustomerTools: React.FC = () => {
  const { isDark } = useTheme();
  const [timeline, setTimeline] = useState<any>({ subscriptions: [], history: [], notifications: [], changes: [] });
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState('');
  const [frequencyOverride, setFrequencyOverride] = useState<string>('');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [comparison, setComparison] = useState<any[]>([]);
  const [changePlanIds, setChangePlanIds] = useState<Record<string, string>>({});
  const [changeQuotes, setChangeQuotes] = useState<Record<string, any>>({});
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const tooltipStyle = { backgroundColor: isDark ? '#1e293b' : '#1E293B', borderRadius: 8, color: '#fff', fontSize: 12, border: 'none' };
  const gridStroke = isDark ? '#334155' : '#F1F5F9';
  const axisStroke = isDark ? '#64748b' : '#94A3B8';

  const loadData = async () => {
    try {
      const [rTimeline, rPlans, rProducts] = await Promise.all([
        api.get('/advanced/renewals'),
        api.get('/plans'),
        api.get('/products')
      ]);
      setTimeline(rTimeline.data);
      setPlans(rPlans.data);
      setProducts(rProducts.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const run = async () => {
    try {
      setLoadingEstimate(true);
      const res = await api.post('/advanced/customer-simulator', {
        planIds: selected,
        quantity,
        discountCode: discount || undefined,
        variantIds: selectedVariants,
        frequency: frequencyOverride || undefined
      });
      setComparison(res.data);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Unable to calculate estimate');
    } finally {
      setLoadingEstimate(false);
    }
  };

  const renew = async (sub: any) => {
    const key = crypto.randomUUID();
    try {
      await api.post(`/subscriptions/${sub.id}/renew`, { idempotencyKey: key }, { headers: { 'Idempotency-Key': key } });
      alert('Renewal confirmed! An updated invoice has been generated.');
      const r = await api.get('/advanced/renewals');
      setTimeline(r.data);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Renewal is not available yet.');
    }
  };

  const previewChange = async (sub: any) => {
    try {
      const r = await api.post(`/subscriptions/${sub.id}/change-plan`, { planId: changePlanIds[sub.id] });
      setChangeQuotes({ ...changeQuotes, [sub.id]: r.data });
    } catch (e: any) {
      alert(e.response?.data?.message || 'Unable to preview plan change');
    }
  };

  const confirmChange = async (sub: any) => {
    const key = crypto.randomUUID();
    try {
      const r = await api.post(
        `/subscriptions/${sub.id}/change-plan`,
        { planId: changePlanIds[sub.id], confirm: true, idempotencyKey: key },
        { headers: { 'Idempotency-Key': key } }
      );
      if (r.data.effectiveTiming === 'NEXT_CYCLE') {
        alert(`Plan downgrade scheduled for your next billing cycle. No immediate credit deducted.`);
      } else if (r.data.invoiceNumber) {
        alert(`Plan change confirmed! Adjustment invoice ${r.data.invoiceNumber} created for ₹${r.data.change.prorationAmount}.`);
      } else {
        alert(`Plan change confirmed! Customer credit ₹${r.data.creditIssued} added to your account.`);
      }
      setChangeQuotes({ ...changeQuotes, [sub.id]: null });
      const fresh = await api.get('/advanced/renewals');
      setTimeline(fresh.data);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Unable to confirm plan change');
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.put(`/advanced/notifications/${id}/read`);
      const r = await api.get('/advanced/renewals');
      setTimeline(r.data);
    } catch (e: any) {
      console.error(e);
    }
  };

  // Find products belonging to selected plans for variant selection
  const selectedPlansList = plans.filter(p => selected.includes(p.id));
  const candidateProducts = products.filter(p =>
    selectedPlansList.some(plan => plan.planProducts?.some((pp: any) => pp.productId === p.id || pp.product?.id === p.id))
  );

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">Renewals &amp; Plan Simulator</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review renewal dates, proration quotes, and run multi-plan cost comparisons with dynamic variant adjustments.
        </p>
      </header>

      {/* Subscription Timeline & Actions */}
      <section className={card}>
        <h2 className={headingCls + ' mb-4'}>Active Subscriptions &amp; Renewal Status</h2>
        {timeline.subscriptions.length ? (
          <div className="space-y-3">
            {timeline.subscriptions.map((s: any) => (
              <article key={s.id} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <b className="text-slate-900 dark:text-slate-100 text-base">{s.subscriptionNumber} · {s.plan.name}</b>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {s.lines.map((l: any) => l.product?.name || 'Product').join(', ')} · Expires {new Date(s.expiryDate).toLocaleDateString()} ·
                      <span className={`font-semibold ml-1 ${s.daysRemaining <= 7 ? 'text-rose-600' : s.daysRemaining <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {s.daysRemaining} days remaining
                      </span>
                    </p>
                    <p className="text-xs mt-1 text-slate-600 dark:text-slate-400">
                      Cycle Amount: <b>₹{s.totalAmount.toLocaleString('en-IN')}</b> · Status: <span className="font-semibold text-slate-700 dark:text-slate-300">{s.status}</span> ·
                      Renewal Eligibility: <span className={`font-semibold ${s.renewalEligible ? 'text-emerald-600' : 'text-slate-400'}`}>{s.renewalEligible ? 'Eligible' : 'Not eligible'}</span>
                    </p>
                  </div>
                  {s.renewalEligible && s.daysRemaining <= 30 && (
                    <button onClick={() => renew(s)} className={btnPrimary}>
                      Confirm 1-Click Renewal
                    </button>
                  )}
                </div>

                {/* Plan Change Previewer */}
                {s.status === 'ACTIVE' && (
                  <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Change or Upgrade Plan (with Real-time Proration)</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Choose a replacement plan"
                        value={changePlanIds[s.id] || ''}
                        onChange={e => {
                          setChangePlanIds({ ...changePlanIds, [s.id]: e.target.value });
                          setChangeQuotes({ ...changeQuotes, [s.id]: null });
                        }}
                        className={inputCls}
                      >
                        <option value="">Select target plan…</option>
                        {plans.filter((p: any) => p.status === 'ACTIVE' && p.id !== s.planId).map((p: any) => (
                          <option key={p.id} value={p.id}>{p.name} · ₹{p.price}/{p.billingFrequency}</option>
                        ))}
                      </select>
                      <button disabled={!changePlanIds[s.id]} onClick={() => previewChange(s)} className={btnSecondary}>
                        Preview Proration
                      </button>
                      {changeQuotes[s.id] && (
                        <button onClick={() => confirmChange(s)} className={btnIndigo}>
                          Confirm Plan Change
                        </button>
                      )}
                    </div>
                    {changeQuotes[s.id] && (
                      <div className="mt-2 p-3 bg-white dark:bg-slate-700/60 rounded-lg border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300">
                        <p>
                          <strong>Period:</strong> {changeQuotes[s.id].remainingDays} of {changeQuotes[s.id].totalDays} days remaining in cycle ·
                          <strong> Adjustment: </strong>
                          <span className={changeQuotes[s.id].prorationAmount >= 0 ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                            {changeQuotes[s.id].prorationAmount >= 0 ? 'Due ' : 'Customer Credit '}
                            ₹{Math.abs(changeQuotes[s.id].prorationAmount).toLocaleString('en-IN')}
                          </span>
                          · Tax at new rate: ₹{changeQuotes[s.id].taxAmount.toLocaleString('en-IN')}
                        </p>
                        {changeQuotes[s.id].note && (
                          <p className="mt-1 text-blue-600 dark:text-blue-400 font-medium">ℹ {changeQuotes[s.id].note}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No active subscriptions found.</p>
        )}

        {/* Notifications with Read Status */}
        <h3 className={subheadingCls}><Bell className="w-4 h-4 text-blue-500" /><span>Renewal Notifications &amp; Reminders</span></h3>
        {timeline.notifications.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No reminders triggered yet.</p>
        ) : (
          <div className="space-y-2 mt-2">
            {timeline.notifications.slice(0, 5).map((n: any) => (
              <div key={n.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40 text-xs">
                <div>
                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${n.isRead ? 'bg-slate-300 dark:bg-slate-600' : 'bg-blue-600'}`} />
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    Expiry due in {n.stageDays} days · ₹{n.renewalAmount.toLocaleString('en-IN')}
                  </span>
                  <span className="text-slate-400 ml-2">Sent via Email: {n.deliveryStatus || 'DELIVERED'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!n.isRead && (
                    <button onClick={() => markRead(n.id)} className="text-blue-600 dark:text-blue-400 hover:underline">
                      Mark as read
                    </button>
                  )}
                  {n.actionLink && (
                    <a href={n.actionLink} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center space-x-1">
                      <span>Action</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        <h3 className={subheadingCls}><Clock className="w-4 h-4 text-emerald-500" /><span>Renewal History</span></h3>
        {timeline.history.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">No renewal history yet.</p>
        ) : (
          timeline.history.slice(0, 5).map((h: any) => (
            <p key={h.id} className="text-xs text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/60 py-1.5">
              {h.planName} renewed on {new Date(h.renewedAt).toLocaleDateString()} through {new Date(h.newExpiryDate).toLocaleDateString()} · <b>₹{h.renewalAmount.toLocaleString('en-IN')}</b>
            </p>
          ))
        )}
      </section>

      {/* Customer Cost Simulator */}
      <section className={card}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={headingCls}>Interactive Plan Cost &amp; Variant Simulator</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Simulate pricing across multiple plans, variants (e.g. Odoo Brand +₹560), quantities, and discount codes.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Select Plans (Hold Ctrl/Cmd to compare multiple)</label>
            <select
              multiple
              value={selected}
              onChange={e => setSelected(Array.from(e.target.selectedOptions).map(o => o.value))}
              className={inputCls + ' w-full h-32 mt-1'}
            >
              {plans.filter(p => p.status === 'ACTIVE').map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} — ₹{p.price} / {p.billingFrequency}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Quantity (Seats/Licenses)</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
              className={inputCls + ' w-full mt-1'}
            />
          </div>

          <div>
            <label className={labelCls}>Discount Promo Code</label>
            <input
              placeholder="e.g. EARLYBIRD"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              className={inputCls + ' w-full mt-1'}
            />
          </div>
        </div>

        {/* Dynamic Variant Selector (if products have variants) */}
        {candidateProducts.some(p => p.variants && p.variants.length > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>Product Variant Selection (Dynamic Price Modifiers)</span>
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {candidateProducts.filter(p => p.variants && p.variants.length > 0).map(p => (
                <div key={p.id}>
                  <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">{p.name} Variant</label>
                  <select
                    value={selectedVariants[p.id] || ''}
                    onChange={e => setSelectedVariants({ ...selectedVariants, [p.id]: e.target.value })}
                    className={inputCls + ' w-full text-xs'}
                  >
                    <option value="">Base Edition (+₹0)</option>
                    {p.variants.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.variantName} (+₹{v.priceAdjustment})
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={run}
          disabled={!selected.length || loadingEstimate}
          className={btnPrimary + ' mt-5 flex items-center space-x-2 disabled:opacity-50'}
        >
          <Sparkles className="w-4 h-4" />
          <span>{loadingEstimate ? 'Calculating Rates...' : 'Calculate Cost Comparison & Future Projections'}</span>
        </button>

        {/* Comparison Cards */}
        {comparison.length > 0 && (
          <div className="mt-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {comparison.map(p => (
                <div key={p.id} className="border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/40 shadow-xs">
                  <div className="flex items-center justify-between">
                    <b className="text-base text-slate-900 dark:text-slate-50">{p.name}</b>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                      {p.billingFrequency}
                    </span>
                  </div>

                  {p.selectedVariants?.length > 0 && (
                    <div className="mt-2 text-[11px] text-blue-600 dark:text-blue-400">
                      Variants: {p.selectedVariants.map((v: any) => `${v.variantName} (+₹${v.priceAdjustment})`).join(', ')}
                    </div>
                  )}

                  <div className="mt-3 space-y-1 text-xs text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-2">
                    <p className="flex justify-between"><span>Base Subtotal:</span> <span>₹{p.base.toLocaleString('en-IN')}</span></p>
                    {p.discount > 0 && (
                      <p className="flex justify-between text-emerald-600"><span>Discount Applied:</span> <span>-₹{p.discount.toLocaleString('en-IN')}</span></p>
                    )}
                    <p className="flex justify-between"><span>Tax (GST {p.taxRate}%):</span> <span>₹{p.tax.toLocaleString('en-IN')}</span></p>
                    <p className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-50 border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
                      <span>Total Per Cycle:</span> <span>₹{p.total.toLocaleString('en-IN')}</span>
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2 bg-white dark:bg-slate-700/50 rounded-lg">
                      <p className="text-[10px] text-slate-400 uppercase">Monthly Equiv.</p>
                      <b className="text-slate-900 dark:text-slate-100">₹{p.monthlyEquivalent.toLocaleString('en-IN')}</b>
                    </div>
                    <div className="p-2 bg-white dark:bg-slate-700/50 rounded-lg">
                      <p className="text-[10px] text-slate-400 uppercase">Annual Equiv.</p>
                      <b className="text-slate-900 dark:text-slate-100">₹{p.annualEquivalent.toLocaleString('en-IN')}</b>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Future-Cost Chart (1, 3, 6, 12, 24 months projection) */}
            <div className="bg-white dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50 mb-1">Future Cost Horizon Projection</h3>
              <p className="text-xs text-slate-400 mb-4">Estimated cumulative expenditure over upcoming operating horizons</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { horizon: '1 Month', ...Object.fromEntries(comparison.map(c => [c.name, c.futureProjections?.oneMonth || 0])) },
                      { horizon: '3 Months', ...Object.fromEntries(comparison.map(c => [c.name, c.futureProjections?.threeMonths || 0])) },
                      { horizon: '6 Months', ...Object.fromEntries(comparison.map(c => [c.name, c.futureProjections?.sixMonths || 0])) },
                      { horizon: '12 Months', ...Object.fromEntries(comparison.map(c => [c.name, c.futureProjections?.twelveMonths || 0])) },
                      { horizon: '24 Months', ...Object.fromEntries(comparison.map(c => [c.name, c.futureProjections?.twentyFourMonths || 0])) }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                    <XAxis dataKey="horizon" stroke={axisStroke} fontSize={11} />
                    <YAxis stroke={axisStroke} fontSize={11} tickFormatter={v => `₹${v/1000}k`} />
                    <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={tooltipStyle} />
                    <Legend />
                    {comparison.map((c, i) => (
                      <Bar key={c.id} dataKey={c.name} fill={['#2563eb', '#7c3aed', '#059669', '#d97706'][i % 4]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export const RevenueSimulator: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [values, setValues] = useState<any>({});
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<any>(null);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | undefined>();

  const refresh = () => api.get('/advanced/revenue-simulator/scenarios').then(r => setScenarios(r.data));
  useEffect(() => { refresh(); }, []);

  const run = async (save = false) => {
    try {
      const r = await api.post('/advanced/revenue-simulator', {
        assumptions: values,
        name,
        description,
        save,
        scenarioId: save ? editingId : undefined
      });
      setResult(r.data);
      if (save) { setEditingId(undefined); refresh(); }
    } catch (e: any) {
      alert(e.response?.data?.message || 'Unable to simulate revenue');
    }
  };

  const selectedScenarios = scenarios.filter(s => compareIds.includes(s.id));

  const exportScenario = (s: any) => {
    const rows = [
      ['Metric', 'Value'],
      ['Scenario', s.name],
      ['Created', new Date(s.createdAt).toISOString()],
      ['Baseline MRR', s.result.baselineMrr],
      ['Projected MRR', s.result.projectedMrr],
      ['Projected ARR', s.result.projectedArr],
      ['Projected customers', s.result.projectedCustomers],
      ['Estimated first month cash collection', s.result.estimatedFirstMonthCashCollection],
      ['3 month projection', s.result.projections.threeMonths],
      ['6 month projection', s.result.projections.sixMonths],
      ['12 month projection', s.result.projections.twelveMonths],
      ...Object.entries(s.assumptions).map(([k, v]) => [`Assumption: ${k}`, v])
    ];
    const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.name.replace(/[^a-z0-9-]/gi, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = (s: any) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(s, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${s.name.replace(/[^a-z0-9-]/gi, '-')}.json`;
    a.click();
  };

  const fields = [
    ['priceChangePercent', 'Price change %'],
    ['newCustomers', 'New customers'],
    ['churnPercent', 'Churn %'],
    ['upgradePercent', 'Upgrade %'],
    ['downgradePercent', 'Downgrade %'],
    ['discountPercent', 'Campaign discount %'],
    ['renewalRatePercent', 'Renewal rate %'],
    ['additionalSeats', 'Additional seats'],
    ['annualMixPercent', 'Annual billing mix %'],
  ];

  const tooltipStyle = { backgroundColor: isDark ? '#1e293b' : '#1E293B', borderRadius: 8, color: '#fff', fontSize: 12, border: 'none' };
  const gridStroke = isDark ? '#334155' : '#F1F5F9';
  const axisStroke = isDark ? '#64748b' : '#94A3B8';

  return (
    <div className="p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">Revenue Simulator &amp; Modeling</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Executive modeling for Admin &amp; Manager roles. Projections use active subscriptions as live baselines and never touch accounting records.
        </p>
      </header>

      <section className={card}>
        <div className="grid sm:grid-cols-3 gap-4">
          {fields.map(([key, label]) => (
            <label key={key} className={labelCls}>
              {label}
              <input
                type="number"
                value={values[key] || 0}
                onChange={e => setValues({ ...values, [key]: Number(e.target.value) })}
                className={'block mt-1 ' + inputCls + ' w-full'}
              />
            </label>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 mt-4 items-center">
          <button onClick={() => run()} className={btnPrimary}>Simulate Scenario</button>
          <input placeholder="Scenario name" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          <input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className={inputCls} />
          <button onClick={() => run(true)} className={btnIndigo}>{editingId ? 'Update Scenario' : 'Save Scenario'}</button>
        </div>

        {result && (
          <div className="grid sm:grid-cols-4 gap-4 mt-6">
            {[
              ['Baseline MRR', result.baselineMrr],
              ['Projected MRR', result.projectedMrr],
              ['Projected ARR', result.projectedArr],
              ['Projected Customers', result.projectedCustomers]
            ].map(([l, v]) => (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60" key={String(l)}>
                <p className="text-xs text-slate-500 dark:text-slate-400">{l}</p>
                <b className="text-slate-900 dark:text-slate-50 text-lg">
                  {l === 'Projected Customers' ? v : `₹${Number(v).toLocaleString('en-IN')}`}
                </b>
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-xs text-slate-700 dark:text-slate-300">
            <p className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Cash Collection &amp; Projection Assumptions:</p>
            <p>• Estimated First Month Cash Collection: <strong>₹{result.estimatedFirstMonthCashCollection.toLocaleString('en-IN')}</strong> (reflects upfront cash from annual billing mix)</p>
            <p className="mt-1">• Horizon Cash Yields: 3 Months: <strong>₹{result.projections.threeMonths.toLocaleString('en-IN')}</strong> · 6 Months: <strong>₹{result.projections.sixMonths.toLocaleString('en-IN')}</strong> · 12 Months: <strong>₹{result.projections.twelveMonths.toLocaleString('en-IN')}</strong></p>
          </div>
        )}
      </section>

      {/* Saved Scenarios & Comparisons */}
      <section className={card}>
        <h2 className={headingCls}>Saved Scenarios &amp; Comparative Analysis</h2>
        {scenarios.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">No saved scenarios found. Run a simulation and save it above.</p>
        ) : (
          scenarios.map(s => (
            <article key={s.id} className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-100 dark:border-slate-700/60 py-3">
              <div>
                <label className="flex gap-2 items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={compareIds.includes(s.id)}
                    onChange={e => setCompareIds(e.target.checked ? [...compareIds, s.id] : compareIds.filter(id => id !== s.id))}
                  />
                  <b className="text-slate-900 dark:text-slate-100 text-sm">{s.name}</b>
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  MRR ₹{s.result.projectedMrr.toLocaleString('en-IN')} · ARR ₹{s.result.projectedArr.toLocaleString('en-IN')} · {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-3 text-xs font-semibold">
                <button onClick={() => { setEditingId(s.id); setName(s.name); setDescription(s.description || ''); setValues(s.assumptions); setResult(s.result); }} className="text-blue-600 dark:text-blue-400 hover:underline">Edit</button>
                <button onClick={() => { setEditingId(undefined); setName(`${s.name} Copy`); setDescription(s.description || ''); setValues(s.assumptions); setResult(s.result); }} className="text-blue-600 dark:text-blue-400 hover:underline">Duplicate</button>
                <button onClick={() => exportScenario(s)} className="text-indigo-600 dark:text-indigo-400 hover:underline">Export CSV</button>
                <button onClick={() => exportJSON(s)} className="text-emerald-600 dark:text-emerald-400 hover:underline">Export JSON</button>
                <button onClick={async () => { await api.delete(`/advanced/revenue-simulator/scenarios/${s.id}`); setCompareIds(compareIds.filter(id => id !== s.id)); refresh(); }} className="text-rose-600 dark:text-rose-400 hover:underline">Delete</button>
              </div>
            </article>
          ))
        )}

        {selectedScenarios.length > 0 && (
          <div className="h-72 mt-6">
            <h3 className="font-semibold mb-3 text-slate-900 dark:text-slate-50 text-sm">Scenario MRR Comparison</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={selectedScenarios.map(s => ({ name: s.name, mrr: s.result.projectedMrr }))}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="name" stroke={axisStroke} fontSize={11} />
                <YAxis stroke={axisStroke} fontSize={11} tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip formatter={(v: any) => `₹${Number(v).toLocaleString('en-IN')}`} contentStyle={tooltipStyle} />
                <Bar dataKey="mrr" fill="#2563eb" name="Projected MRR" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
};

export const RenewalManagement: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>({ subscriptions: [], history: [], notifications: [], changes: [] });
  const [filter, setFilter] = useState('');
  const [intervals, setIntervals] = useState('30,15,7,3');
  const [downgradeTiming, setDowngradeTiming] = useState('IMMEDIATE');
  const [message, setMessage] = useState('');
  const [triggeringReminders, setTriggeringReminders] = useState(false);

  const load = () =>
    api.get('/advanced/renewals')
      .then(r => setData(r.data))
      .catch(e => setMessage(e.response?.data?.message || 'Could not load renewal data'));

  useEffect(() => {
    load();
    if (user?.role === 'ADMIN') {
      api.get('/advanced/renewal-settings')
        .then(r => {
          setIntervals((r.data.reminderIntervals || []).join(','));
          if (r.data.downgradeTiming) setDowngradeTiming(r.data.downgradeTiming);
        })
        .catch(() => {});
    }
  }, []);

  const saveSettings = async () => {
    try {
      const r = await api.put('/advanced/renewal-settings', {
        reminderIntervals: intervals.split(',').map(x => Number(x.trim())).filter(Number.isFinite),
        downgradeTiming
      });
      setIntervals(r.data.reminderIntervals.join(','));
      setDowngradeTiming(r.data.downgradeTiming);
      setMessage('Business settings saved successfully.');
    } catch (e: any) {
      setMessage(e.response?.data?.message || 'Could not save settings');
    }
  };

  const handleTriggerReminders = async () => {
    try {
      setTriggeringReminders(true);
      const res = await api.post('/advanced/renewals/trigger-reminders');
      alert(`Reminders triggered: ${res.data.created} notifications recorded, ${res.data.emailsSent} emails sent.`);
      load();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error triggering reminders');
    } finally {
      setTriggeringReminders(false);
    }
  };

  const visible = data.subscriptions.filter((s: any) =>
    `${s.subscriptionNumber} ${s.customer?.user?.name || ''} ${s.plan?.name || ''} ${s.status}`.toLowerCase().includes(filter.toLowerCase())
  );
  const active = data.subscriptions.filter((s: any) => s.status === 'ACTIVE');
  const due = (days: number) => active.filter((s: any) => s.daysRemaining >= 0 && s.daysRemaining <= days).length;
  const expired = data.subscriptions.filter((s: any) => s.daysRemaining < 0 && s.status !== 'CLOSED').length;

  return (
    <div className="p-8 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50">Renewal Management &amp; Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Upcoming renewals, transactional notifications, reminder schedules, and proration settings.
          </p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'STAFF') && (
          <button
            onClick={handleTriggerReminders}
            disabled={triggeringReminders}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${triggeringReminders ? 'animate-spin' : ''}`} />
            <span>{triggeringReminders ? 'Sending Reminders...' : 'Run Reminder Dispatch Now'}</span>
          </button>
        )}
      </header>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          ['Next 30 days', due(30)],
          ['Next 15 days', due(15)],
          ['Next 7 days (Critical)', due(7)],
          ['Expired', expired],
          ['Successfully renewed', data.history.length]
        ].map(([a, b]) => (
          <div key={String(a)} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 shadow-xs">
            <p className="text-xs text-slate-500 dark:text-slate-400">{a}</p>
            <b className="text-2xl text-slate-900 dark:text-slate-50 mt-1 block">{b}</b>
          </div>
        ))}
      </div>

      {/* Admin Business Settings */}
      {user?.role === 'ADMIN' && (
        <section className={card}>
          <h2 className={headingCls}>Business Settings: Reminders &amp; Downgrade Timing</h2>
          <div className="grid md:grid-cols-2 gap-6 mt-4">
            <div>
              <label className={labelCls}>Reminder Intervals (Days before expiry, comma-separated)</label>
              <input
                value={intervals}
                onChange={e => setIntervals(e.target.value)}
                className={'block mt-1 ' + inputCls + ' w-full'}
                placeholder="30,15,7,3,0"
              />
              <p className="text-[11px] text-slate-500 mt-1">One in-app reminder + email notification per stage.</p>
            </div>

            <div>
              <label className={labelCls}>Downgrade Effect Timing</label>
              <select
                value={downgradeTiming}
                onChange={e => setDowngradeTiming(e.target.value)}
                className={'block mt-1 ' + inputCls + ' w-full'}
              >
                <option value="IMMEDIATE">Immediate (Prorates immediately &amp; records customer credit)</option>
                <option value="NEXT_CYCLE">Next Billing Cycle (No immediate credit; scheduled for next renewal)</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Controls how downgrades are treated financial-wise.</p>
            </div>
          </div>

          <div className="mt-4 flex items-center space-x-3">
            <button onClick={saveSettings} className={btnPrimary}>
              Save Business Settings
            </button>
            {message && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{message}</span>}
          </div>
        </section>
      )}

      {/* Subscriptions Table */}
      <section className={card}>
        <div className="flex justify-between items-center gap-3 flex-wrap mb-3">
          <h2 className={headingCls}>Subscriptions Overview</h2>
          <input
            placeholder="Filter customer, subscription, plan, or status..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className={inputCls + ' w-72'}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700/60">
                <th className="py-2.5">Subscription</th>
                <th>Customer</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Renewal Date</th>
                <th>Days Remaining</th>
                <th>Cycle Total</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((s: any) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-3 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">{s.subscriptionNumber}</td>
                  <td className="text-slate-700 dark:text-slate-300">{s.customer?.user?.name || 'Customer'}</td>
                  <td className="text-slate-700 dark:text-slate-300">{s.plan.name}</td>
                  <td className="text-slate-700 dark:text-slate-300">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {s.status}
                    </span>
                  </td>
                  <td className="text-slate-700 dark:text-slate-300">{new Date(s.expiryDate).toLocaleDateString()}</td>
                  <td className="text-slate-700 dark:text-slate-300">
                    <span className={`font-semibold ${s.daysRemaining <= 7 ? 'text-rose-600' : s.daysRemaining <= 30 ? 'text-amber-600' : 'text-slate-600 dark:text-slate-400'}`}>
                      {s.daysRemaining} days
                    </span>
                  </td>
                  <td className="text-slate-700 dark:text-slate-300 font-semibold">₹{s.totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* History Tables */}
        <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-50 mb-2">Renewal Execution History</h3>
            {data.history.length === 0 ? (
              <p className="text-xs text-slate-400">No renewals executed yet.</p>
            ) : (
              data.history.slice(0, 10).map((h: any) => (
                <p key={h.id} className="text-xs text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/60 py-2">
                  <strong>{h.planName}</strong> · Renewed {new Date(h.renewedAt).toLocaleDateString()} · New Expiry: {new Date(h.newExpiryDate).toLocaleDateString()} · ₹{h.renewalAmount.toLocaleString('en-IN')}
                </p>
              ))
            )}
          </div>

          <div>
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-50 mb-2">Plan Change &amp; Downgrade Log</h3>
            {data.changes.length === 0 ? (
              <p className="text-xs text-slate-400">No plan changes recorded yet.</p>
            ) : (
              data.changes.slice(0, 10).map((c: any) => (
                <p key={c.id} className="text-xs text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-700/60 py-2">
                  {c.oldPlanName} → <strong>{c.newPlanName}</strong> · Status: <span className="font-semibold">{c.status}</span> · {c.prorationAmount >= 0 ? `+₹${c.prorationAmount} invoiced` : `Credit ₹${Math.abs(c.prorationAmount)}`}
                </p>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
