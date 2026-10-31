import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { DiscountRule } from '../../types';
import { Modal } from '../../components/Modal';
import { Percent, Plus, Trash2, Tag, Calendar, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export const Discounts: React.FC = () => {
  const [discounts, setDiscounts] = useState<DiscountRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE');
  const [value, setValue] = useState('10');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState('0');
  const [minQuantity, setMinQuantity] = useState('1');
  const [maxUsageLimit, setMaxUsageLimit] = useState('100');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/discounts');
      setDiscounts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const openCreateModal = () => {
    setName('');
    setCode('');
    setType('PERCENTAGE');
    setValue('10');
    setMinPurchaseAmount('0');
    setMinQuantity('1');
    setMaxUsageLimit('100');
    setStartDate('');
    setEndDate('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await api.post('/discounts', {
        name,
        code,
        type,
        value: Number(value),
        minPurchaseAmount: Number(minPurchaseAmount),
        minQuantity: Number(minQuantity),
        maxUsageLimit: maxUsageLimit ? Number(maxUsageLimit) : null,
        startDate: startDate || null,
        endDate: endDate || null
      });
      setIsModalOpen(false);
      fetchDiscounts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating discount rule');
    }
  };

  const handleToggleStatus = async (d: DiscountRule) => {
    try {
      await api.put(`/discounts/${d.id}`, { status: !d.status });
      fetchDiscounts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this discount rule?')) return;
    try {
      await api.delete(`/discounts/${id}`);
      fetchDiscounts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting discount');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Discount Rules & Promotions</h1>
          <p className="text-xs text-slate-500 mt-1">Configure volume discounts, coupons, and automatic invoice price reductions</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Discount Rule</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Rule Name</th>
                <th className="px-6 py-4">Coupon Code</th>
                <th className="px-6 py-4">Discount Value</th>
                <th className="px-6 py-4">Min Spend / Qty</th>
                <th className="px-6 py-4">Usage Count</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading discount rules...</td></tr>
              ) : discounts.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No discount rules found.</td></tr>
              ) : (
                discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{d.name}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {d.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      {d.type === 'PERCENTAGE' ? `${d.value}% Off` : `₹${d.value.toLocaleString('en-IN')} Off`}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      ₹{d.minPurchaseAmount.toLocaleString('en-IN')} / {d.minQuantity} qty
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">{d.currentUsageCount}</span>
                      {d.maxUsageLimit && <span className="text-slate-400"> / {d.maxUsageLimit}</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(d)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          d.status
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-300'
                        }`}
                      >
                        {d.status ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{d.status ? 'Active' : 'Disabled'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Discount Rule" maxWidth="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enterprise Volume Discount"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code *</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VOLUME20"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type *</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Value *</label>
              <input
                type="number"
                required
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Spend (₹)</label>
              <input
                type="number"
                min="0"
                value={minPurchaseAmount}
                onChange={(e) => setMinPurchaseAmount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Seats</label>
              <input
                type="number"
                min="1"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Max Usages</label>
              <input
                type="number"
                min="1"
                value={maxUsageLimit}
                onChange={(e) => setMaxUsageLimit(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl shadow-md">
              Create Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
