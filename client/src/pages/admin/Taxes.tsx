import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { TaxRule } from '../../types';
import { Modal } from '../../components/Modal';
import { ShieldCheck, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

export const Taxes: React.FC = () => {
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [rate, setRate] = useState('18');
  const [isDefault, setIsDefault] = useState(false);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/taxes');
      setTaxes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/taxes', {
        name,
        rate: Number(rate),
        isDefault
      });
      setIsModalOpen(false);
      setName('');
      setRate('18');
      setIsDefault(false);
      fetchTaxes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error creating tax');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete tax rule?')) return;
    try {
      await api.delete(`/taxes/${id}`);
      fetchTaxes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting tax rule');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Tax Rules & Fiscal Positions</h1>
          <p className="text-xs text-slate-500 mt-1">Configure applicable GST and VAT rates automatically applied on invoice line items</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tax Rate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {taxes.map(tax => (
          <div key={tax.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-black text-slate-900">{tax.rate}%</span>
                {tax.isDefault && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    Default
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold text-slate-800">{tax.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Automatically computed on subscriptions & invoices</p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleDelete(tax.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Tax Rate" maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. GST 18%"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tax Rate (%) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <label className="flex items-center space-x-2 cursor-pointer p-3 rounded-xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded text-blue-600"
            />
            <span className="text-xs font-medium text-slate-700">Set as System Default Tax</span>
          </label>
          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-xl">Save Tax Rate</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
