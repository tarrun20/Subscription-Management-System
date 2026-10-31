import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Payment } from '../../types';

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payments');
      setPayments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payment Ledger & Receipts</h1>
        <p className="text-xs text-slate-500 mt-1">Audit log of all full and partial collections matched against customer invoices</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Receipt Number</th>
                <th className="px-6 py-4">Invoice Ref</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4">Transaction Ref</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Amount Collected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No payment records found.</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-blue-700">{p.paymentNumber}</td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-800">{p.invoice?.invoiceNumber || '-'}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {p.customer?.companyName || p.customer?.user?.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {p.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500">{p.transactionRef || 'N/A'}</td>
                    <td className="px-6 py-4">{new Date(p.paymentDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-sm">
                      +₹{p.amount.toLocaleString('en-IN')}
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
