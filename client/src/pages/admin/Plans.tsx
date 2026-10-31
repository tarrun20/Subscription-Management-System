import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { SubscriptionPlan, Product } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Layers, Plus, Trash2, Edit2, Calendar, CheckSquare, AlertCircle } from 'lucide-react';

export const Plans: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('5000');
  const [billingFrequency, setBillingFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [minimumQuantity, setMinimumQuantity] = useState('1');
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableUntil, setAvailableUntil] = useState('');
  const [autoCloseOnExpiry, setAutoCloseOnExpiry] = useState(false);
  const [allowEarlyClosure, setAllowEarlyClosure] = useState(true);
  const [allowPause, setAllowPause] = useState(true);
  const [allowRenewal, setAllowRenewal] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [error, setError] = useState('');

  const fetchPlansAndProducts = async () => {
    try {
      setLoading(true);
      const [resPlans, resProds] = await Promise.all([
        api.get('/plans'),
        api.get('/products')
      ]);
      setPlans(resPlans.data);
      setProducts(resProds.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansAndProducts();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setDescription('');
    setPrice('5000');
    setBillingFrequency('MONTHLY');
    setMinimumQuantity('1');
    setAvailableFrom('');
    setAvailableUntil('');
    setAutoCloseOnExpiry(false);
    setAllowEarlyClosure(true);
    setAllowPause(true);
    setAllowRenewal(true);
    setSelectedProductIds([]);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: SubscriptionPlan) => {
    setEditingPlan(p);
    setName(p.name);
    setDescription(p.description || '');
    setPrice(String(p.price));
    setBillingFrequency(p.billingFrequency);
    setMinimumQuantity(String(p.minimumQuantity));
    setAvailableFrom(p.availableFrom ? p.availableFrom.split('T')[0] : '');
    setAvailableUntil(p.availableUntil ? p.availableUntil.split('T')[0] : '');
    setAutoCloseOnExpiry(p.autoCloseOnExpiry);
    setAllowEarlyClosure(p.allowEarlyClosure);
    setAllowPause(p.allowPause);
    setAllowRenewal(p.allowRenewal);
    setSelectedProductIds(p.planProducts?.map(pp => pp.product.id) || []);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        name,
        description,
        price: Number(price),
        billingFrequency,
        minimumQuantity: Number(minimumQuantity),
        availableFrom: availableFrom || null,
        availableUntil: availableUntil || null,
        autoCloseOnExpiry,
        allowEarlyClosure,
        allowPause,
        allowRenewal,
        productIds: selectedProductIds
      };

      if (editingPlan) {
        await api.put(`/plans/${editingPlan.id}`, payload);
      } else {
        await api.post('/plans', payload);
      }

      setIsModalOpen(false);
      fetchPlansAndProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving plan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
    try {
      await api.delete(`/plans/${id}`);
      fetchPlansAndProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting plan');
    }
  };

  const toggleProductSelect = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter(pid => pid !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-xs text-slate-500 mt-1">Configure recurring billing cycles, terms, and lifecycle rules</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Plan</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400">Loading plans...</div>
        ) : plans.map((plan) => (
          <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-wider">
                  {plan.billingFrequency}
                </span>
                <Badge status={plan.status} />
              </div>

              <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description || 'No description provided'}</p>

              <div className="mt-4 flex items-baseline space-x-1">
                <span className="text-3xl font-black text-slate-900">₹{plan.price.toLocaleString('en-IN')}</span>
                <span className="text-xs text-slate-400">/{plan.billingFrequency.toLowerCase()}</span>
              </div>

              {/* Lifecycle Features Pill List */}
              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Minimum Seats:</span>
                  <span className="font-semibold text-slate-900">{plan.minimumQuantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Auto-close on Expiry:</span>
                  <span className={`font-semibold ${plan.autoCloseOnExpiry ? 'text-amber-600' : 'text-slate-400'}`}>
                    {plan.autoCloseOnExpiry ? 'Yes (Auto-close)' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Allow Pausing:</span>
                  <span className={`font-semibold ${plan.allowPause ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {plan.allowPause ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Allow Early Closure:</span>
                  <span className={`font-semibold ${plan.allowEarlyClosure ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {plan.allowEarlyClosure ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Allow Renewals:</span>
                  <span className={`font-semibold ${plan.allowRenewal ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {plan.allowRenewal ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                onClick={() => openEditModal(plan)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit Plan
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPlan ? 'Edit Subscription Plan' : 'Create New Subscription Plan'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Plan Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Business Pro"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Billing Frequency *</label>
              <select
                value={billingFrequency}
                onChange={(e: any) => setBillingFrequency(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Min Quantity</label>
              <input
                type="number"
                min="1"
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Features, SLA guarantees, or user quotas included in this plan..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Available From</label>
              <input
                type="date"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Available Until</label>
              <input
                type="date"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Lifecycle Toggles */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <p className="text-xs font-bold text-slate-800">Lifecycle Permissions & Rules:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={autoCloseOnExpiry}
                  onChange={(e) => setAutoCloseOnExpiry(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-medium text-slate-700">Auto-close on Expiry</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={allowEarlyClosure}
                  onChange={(e) => setAllowEarlyClosure(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-medium text-slate-700">Allow Early Closure</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={allowPause}
                  onChange={(e) => setAllowPause(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-medium text-slate-700">Allow Pause / Resume</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg bg-slate-50 border border-slate-200">
                <input
                  type="checkbox"
                  checked={allowRenewal}
                  onChange={(e) => setAllowRenewal(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="font-medium text-slate-700">Allow Renewals</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
            >
              {editingPlan ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
