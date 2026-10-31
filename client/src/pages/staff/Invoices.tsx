import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Invoice, PaymentMethod } from '../../types';
import { Badge } from '../../components/Badge';
import { Modal } from '../../components/Modal';
import { Receipt, Download, CreditCard, CheckCircle, AlertTriangle, Filter } from 'lucide-react';

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  // Payment Recording Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices', {
        params: {
          status: filterStatus || undefined,
          overdue: filterOverdue ? 'true' : undefined
        }
      });
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, filterOverdue]);

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
    } catch (err) {
      alert('Error downloading PDF invoice.');
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(String(inv.outstandingBalance));
    setPaymentMethod('BANK_TRANSFER');
    setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`);
    setPaymentNotes('');
    setPaymentError('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPaymentError('');
    setSubmittingPayment(true);

    try {
      await api.post('/payments', {
        invoiceId: selectedInvoice.id,
        amount: Number(paymentAmount),
        paymentMethod,
        transactionRef,
        notes: paymentNotes
      });
      setIsPaymentModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      setPaymentError(err.response?.data?.message || 'Error recording payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Invoices & Billing Hub</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated recurring invoices, payment collection, and PDF generation
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <div className="flex items-center space-x-1 p-1 bg-slate-200/70 rounded-xl">
            {['', 'DRAFT', 'CONFIRMED', 'PAID'].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilterStatus(s);
                  setFilterOverdue(false);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  filterStatus === s && !filterOverdue
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-50'
                }`}
              >
                {s ? s.charAt(0) + s.slice(1).toLowerCase() : 'All Invoices'}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setFilterOverdue(!filterOverdue);
              setFilterStatus('');
            }}
            className={`px-3 py-2 rounded-xl border flex items-center space-x-1.5 transition-all ${
              filterOverdue
                ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Overdue Only</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-400">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Invoice Number</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Invoice Date</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Total Amount</th>
                <th className="px-6 py-4">Paid / Balance Due</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-400">No invoices match selected criteria.</td></tr>
              ) : (
                invoices.map((inv) => {
                  const isOverdue = inv.status !== 'PAID' && new Date(inv.dueDate) < new Date();
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-700">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-slate-50">{inv.customer?.companyName || inv.customer?.user?.name}</div>
                        {inv.subscription && (
                          <div className="text-[11px] text-slate-400">{inv.subscription.plan.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-50">
                        ₹{inv.totalAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <span className="font-bold text-emerald-600">₹{inv.paidAmount.toLocaleString('en-IN')}</span>
                          <span className="text-slate-400"> / </span>
                          <span className={`font-bold ${inv.outstandingBalance > 0 ? 'text-rose-600' : 'text-slate-500 dark:text-slate-400'}`}>
                            ₹{inv.outstandingBalance.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <Badge status="OVERDUE" />
                        ) : (
                          <Badge status={inv.status} />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download PDF Invoice"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-all"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Record Payment</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Recording Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${selectedInvoice?.invoiceNumber}`}
        maxWidth="max-w-md"
      >
        {selectedInvoice && (
          <form onSubmit={handleRecordPayment} className="space-y-4">
            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-xs text-rose-700 rounded-xl">
                {paymentError}
              </div>
            )}

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Invoice Total:</span>
                <span className="font-bold text-slate-900 dark:text-slate-50">₹{selectedInvoice.totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Already Paid:</span>
                <span className="font-bold text-emerald-600">₹{selectedInvoice.paidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-1.5 font-bold">
                <span className="text-slate-700 dark:text-slate-300">Remaining Balance Due:</span>
                <span className="text-rose-600">₹{selectedInvoice.outstandingBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (₹) *</label>
              <input
                type="number"
                step="0.01"
                required
                max={selectedInvoice.outstandingBalance}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">Supports both full and partial payments.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e: any) => setPaymentMethod(e.target.value)}
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other Method</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Reference</label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. UTR-9238491823"
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Optional billing note..."
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
              <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {submittingPayment ? 'Recording...' : 'Confirm & Record Payment'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
