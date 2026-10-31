import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Quotation, Product, SubscriptionPlan } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { FileText, Plus, CheckCircle, ArrowRight, Trash2, AlertCircle } from 'lucide-react';

export const Quotations: React.FC = () => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [convertLoading, setConvertLoading] = useState<string | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [planId, setPlanId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; variantId?: string; quantity: number; discount: number; taxRate: number }>>([]);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resQ, resC, resP, resProd, resT] = await Promise.all([
        api.get('/quotations'),
        api.get('/users/customers'),
        api.get('/plans'),
        api.get('/products'),
        api.get('/quotations/templates')
      ]);
      setQuotations(resQ.data);
      setCustomers(resC.data);
      setPlans(resP.data);
      setProducts(resProd.data);
      setTemplates(resT.data);

      if (resC.data.length > 0 && !customerId) setCustomerId(resC.data[0].id);
      if (resP.data.length > 0 && !planId) setPlanId(resP.data[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    if (customers.length > 0) setCustomerId(customers[0].id);
    if (plans.length > 0) setPlanId(plans[0].id);
    setTemplateId('');
    setValidityDays('30');
    setNotes('Standard enterprise quotation valid for 30 calendar days.');
    if (products.length > 0) {
      const p = products[0];
      const defaultVariant = p.variants.length > 0 ? p.variants[0].id : undefined;
      setLines([{ productId: p.id, variantId: defaultVariant, quantity: 1, discount: 0, taxRate: 18.0 }]);
    } else {
      setLines([]);
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleAddLine = () => {
    if (products.length === 0) return;
    const p = products[0];
    const defaultVariant = p.variants.length > 0 ? p.variants[0].id : undefined;
    setLines([...lines, { productId: p.id, variantId: defaultVariant, quantity: 1, discount: 0, taxRate: 18.0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'productId') {
      const prod = products.find(p => p.id === value);
      updated[idx].variantId = prod?.variants.length ? prod.variants[0].id : undefined;
    }
    setLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (lines.length === 0) {
      setError('At least one product line is required.');
      return;
    }

    try {
      await api.post('/quotations', {
        customerId,
        planId,
        templateId: templateId || undefined,
        validityDays: Number(validityDays),
        notes,
        lines
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating quotation');
    }
  };

  const handleConvert = async (quoteId: string) => {
    try {
      setConvertLoading(quoteId);
      await api.post(`/quotations/${quoteId}/convert`, { paymentTerms: 'IMMEDIATE' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error converting quotation');
    } finally {
      setConvertLoading(null);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quotations & Offers</h1>
          <p className="text-xs text-slate-500 mt-1">Generate customer offers with predefined templates and convert to live subscriptions</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create Quotation</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Quote Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Valid Until</th>
                <th className="px-6 py-4">Total Amount (incl. Tax)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Convert / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading quotations...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No quotations found.</td></tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-700">{q.quotationNumber}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{q.customer?.companyName || q.customer?.user?.name}</div>
                      <div className="text-[11px] text-slate-400">{q.customer?.user?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{q.plan?.name || 'Custom'}</td>
                    <td className="px-6 py-4">{new Date(q.validUntil).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">₹{q.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <Badge status={q.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {q.status !== 'CONVERTED' ? (
                        <button
                          onClick={() => handleConvert(q.id)}
                          disabled={convertLoading === q.id}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>{convertLoading === q.id ? 'Converting...' : 'Convert to Subscription'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          Active Sub: {q.subscription?.subscriptionNumber || 'Linked'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Quotation Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Customer Quotation" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Select Customer *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName || c.user.name} ({c.user.email})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subscription Plan *</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {plans.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (₹{p.price} /{p.billingFrequency.toLowerCase()})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quotation Template (Optional)</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Custom Quotation (No Template)</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.validityDays} days validity)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Validity (Days)</label>
              <input
                type="number"
                min="1"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Product Lines Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">Quotation Line Items</label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {lines.map((line, idx) => {
                const prod = products.find(p => p.id === line.productId);
                return (
                  <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <select
                      value={line.productId}
                      onChange={(e) => handleLineChange(idx, 'productId', e.target.value)}
                      className="flex-1 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (Base: ₹{p.salesPrice})</option>
                      ))}
                    </select>

                    <select
                      value={line.variantId || ''}
                      onChange={(e) => handleLineChange(idx, 'variantId', e.target.value || undefined)}
                      className="w-40 bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                    >
                      <option value="">Base Variant</option>
                      {prod?.variants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.variantName} {v.priceAdjustment > 0 ? `(+₹${v.priceAdjustment})` : ''}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center space-x-1">
                      <span className="text-[11px] text-slate-400">Qty:</span>
                      <input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(e) => handleLineChange(idx, 'quantity', Number(e.target.value))}
                        className="w-14 bg-white px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Terms</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl shadow-md">Create Quotation</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
