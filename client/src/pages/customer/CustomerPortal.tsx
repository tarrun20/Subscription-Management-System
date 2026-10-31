import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Subscription, Invoice, Payment } from '../../types';
import { Badge } from '../../components/Badge';
import { Repeat, Receipt, Download } from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/subscriptions'),
      api.get('/invoices'),
      api.get('/payments')
    ]).then(([resS, resI, resP]) => {
      setSubscriptions(resS.data);
      setInvoices(resI.data);
      setPayments(resP.data);
    }).catch(console.error);
  }, []);

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Error downloading invoice.');
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Customer Self-Service Hub</span>
            <h1 className="text-2xl font-black mt-1">Hello, {user?.name}!</h1>
            <p className="text-xs text-blue-100 mt-1">
              {user?.customerProfile?.companyName || 'Individual Customer'} • {user?.customerProfile?.city || 'India'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-blue-200">Active Subscriptions</span>
            <p className="text-3xl font-black">{subscriptions.filter(s => s.status === 'ACTIVE').length}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
          <Repeat className="w-5 h-5 text-blue-600" />
          <span>My Subscriptions</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subscriptions.length === 0 ? (
            <div className="col-span-2 p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              No subscriptions found for your account.
            </div>
          ) : (
            subscriptions.map(sub => (
              <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-600">{sub.subscriptionNumber}</span>
                    <h3 className="text-base font-bold text-slate-900">{sub.plan.name}</h3>
                  </div>
                  <Badge status={sub.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Next Billing Date</span>
                    <strong className="text-slate-900">{new Date(sub.nextBillingDate).toLocaleDateString()}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Renewal / Expiry</span>
                    <strong className="text-slate-900">{new Date(sub.expiryDate).toLocaleDateString()}</strong>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400">Cycle Price: </span>
                    <span className="font-black text-slate-900">₹{sub.totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">Terms: {sub.paymentTerms}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center space-x-2">
          <Receipt className="w-5 h-5 text-blue-600" />
          <span>My Invoices & Receipts</span>
        </h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Invoice Date</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5">Total Amount</th>
                <th className="px-6 py-3.5">Outstanding Balance</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">PDF Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-slate-400">No invoices issued yet.</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3.5 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                    <td className="px-6 py-3.5">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3.5 font-bold text-rose-600">₹{inv.outstandingBalance.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-3.5"><Badge status={inv.status} /></td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
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
