import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Product } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Package, Plus, Trash2, Edit2, Calculator, Check, AlertCircle } from 'lucide-react';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'SOFTWARE' | 'SERVICE' | 'HARDWARE' | 'CONSUMABLE'>('SOFTWARE');
  const [salesPrice, setSalesPrice] = useState('5000');
  const [costPrice, setCostPrice] = useState('2000');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<Array<{ variantName: string; priceAdjustment: number; sku: string }>>([
    { variantName: 'Standard', priceAdjustment: 0, sku: 'STD' },
    { variantName: 'Odoo Brand', priceAdjustment: 560, sku: 'ODOO' }
  ]);
  const [error, setError] = useState('');

  // Interactive dynamic price calculator state
  const [calcProductId, setCalcProductId] = useState('');
  const [calcVariantId, setCalcVariantId] = useState('');
  const [calcQty, setCalcQty] = useState('1');
  const [calcResult, setCalcResult] = useState<any>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products');
      setProducts(res.data);
      if (res.data.length > 0 && !calcProductId) {
        setCalcProductId(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setType('SOFTWARE');
    setSalesPrice('5000');
    setCostPrice('2000');
    setDescription('');
    setVariants([
      { variantName: 'Standard', priceAdjustment: 0, sku: 'STD' },
      { variantName: 'Odoo Brand', priceAdjustment: 560, sku: 'ODOO' }
    ]);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setType(p.type);
    setSalesPrice(String(p.salesPrice));
    setCostPrice(String(p.costPrice));
    setDescription(p.description || '');
    setVariants(p.variants.map(v => ({
      variantName: v.variantName,
      priceAdjustment: v.priceAdjustment,
      sku: v.sku || ''
    })));
    setError('');
    setIsModalOpen(true);
  };

  const handleAddVariantRow = () => {
    setVariants([...variants, { variantName: '', priceAdjustment: 0, sku: '' }]);
  };

  const handleRemoveVariantRow = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleVariantChange = (index: number, field: string, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        name,
        type,
        salesPrice: Number(salesPrice),
        costPrice: Number(costPrice),
        description,
        variants
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
      } else {
        await api.post('/products', payload);
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error deleting product');
    }
  };

  const handleCalculatePrice = async () => {
    if (!calcProductId) return;
    try {
      const res = await api.get('/products/calculate-price', {
        params: {
          productId: calcProductId,
          variantId: calcVariantId || undefined,
          quantity: calcQty
        }
      });
      setCalcResult(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Product Catalog & Variants</h1>
          <p className="text-xs text-slate-500 mt-1">Manage software products, services, and dynamic variant pricing rules</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Dynamic Pricing Interactive Demonstration Tool */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center space-x-2 mb-2">
          <Calculator className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold">Dynamic Variant Pricing Calculator</h2>
        </div>
        <p className="text-xs text-slate-300 mb-4">
          Test real-time price adjustment rules (e.g., selecting the <strong>Odoo Brand</strong> variant automatically adds <strong>+₹560</strong> to base price).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select Product</label>
            <select
              value={calcProductId}
              onChange={(e) => {
                setCalcProductId(e.target.value);
                setCalcVariantId('');
                setCalcResult(null);
              }}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (Base: ₹{p.salesPrice})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Select Variant</label>
            <select
              value={calcVariantId}
              onChange={(e) => setCalcVariantId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="">Base Product (No Variant)</option>
              {products.find(p => p.id === calcProductId)?.variants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.variantName} {v.priceAdjustment > 0 ? `(+₹${v.priceAdjustment})` : '(+₹0)'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              value={calcQty}
              onChange={(e) => setCalcQty(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleCalculatePrice}
            className="w-full py-2 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all"
          >
            Compute Dynamic Total
          </button>
        </div>

        {calcResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-slate-400">Selected: </span>
              <strong className="text-white">{calcResult.productName}</strong>
              <span className="text-blue-300 ml-1">({calcResult.variantName})</span>
            </div>
            <div>
              <span className="text-slate-400">Formula: </span>
              <span className="font-mono text-emerald-400">
                (₹{calcResult.basePrice} base + ₹{calcResult.adjustment} variant) × {calcResult.quantity} seats
              </span>
            </div>
            <div className="text-base font-black text-emerald-400">
              Total: ₹{calcResult.total.toLocaleString('en-IN')}
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Base Sales Price</th>
                <th className="px-6 py-4">Cost Price</th>
                <th className="px-6 py-4">Available Variants</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No products found. Click "Add New Product" to create one.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      {p.description && <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{p.description}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {p.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">₹{p.salesPrice.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4 text-slate-500">₹{p.costPrice.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {p.variants.map((v) => (
                          <span
                            key={v.id}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                              v.priceAdjustment > 0
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {v.variantName} {v.priceAdjustment > 0 && `(+₹${v.priceAdjustment})`}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={p.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Create New Product'}
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Business Software"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="SOFTWARE">Software</option>
                <option value="SERVICE">Service</option>
                <option value="HARDWARE">Hardware</option>
                <option value="CONSUMABLE">Consumable</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sales Price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product capabilities, terms, or specifications..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Variants Section */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">Product Variants & Price Adjustments</label>
              <button
                type="button"
                onClick={handleAddVariantRow}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="Variant name (e.g. Odoo Brand)"
                    value={v.variantName}
                    onChange={(e) => handleVariantChange(idx, 'variantName', e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-slate-400">+₹</span>
                    <input
                      type="number"
                      placeholder="560"
                      value={v.priceAdjustment}
                      onChange={(e) => handleVariantChange(idx, 'priceAdjustment', Number(e.target.value))}
                      className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="SKU"
                    value={v.sku}
                    onChange={(e) => handleVariantChange(idx, 'sku', e.target.value)}
                    className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveVariantRow(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
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
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
