import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Subscription, Invoice, Payment } from '../../types';
import { Badge } from '../../components/Badge';
import { Repeat, Receipt, Download, CreditCard, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface CustomerPortalProps {
  currentTab?: string;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ currentTab = 'portal' }) => {
  const { user, refreshUser } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payingInvoice, setPayingInvoice] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    companyName: '',
    taxNumber: '',
    billingAddress: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: ''
  });

  useEffect(() => {
    setProfile({
      name: user?.name || '',
      phone: user?.phone || '',
      companyName: user?.customerProfile?.companyName || '',
      taxNumber: user?.customerProfile?.taxNumber || '',
      billingAddress: user?.customerProfile?.billingAddress || '',
      city: user?.customerProfile?.city || '',
      state: user?.customerProfile?.state || '',
      country: user?.customerProfile?.country || 'India',
      zipCode: user?.customerProfile?.zipCode || ''
    });
  }, [user]);

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

  const handleOnlinePayment = async (invoiceId: string) => {
    setPayingInvoice(invoiceId);
    try {
      const orderResponse = await api.post(`/payments/checkout/${invoiceId}`);
      const { keyId, order, invoice } = orderResponse.data;
      const w = window as any;
      if (!w.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Could not load secure checkout.'));
          document.body.appendChild(script);
        });
      }
      const checkout = new w.Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: 'Brightloop Software',
        description: `Invoice ${invoice.invoiceNumber}`,
        handler: async (result: any) => {
          try {
            await api.post('/payments/checkout/verify', { invoiceId, ...result });
            const [nextInvoices, nextPayments] = await Promise.all([
              api.get('/invoices'),
              api.get('/payments')
            ]);
            setInvoices(nextInvoices.data);
            setPayments(nextPayments.data);
            alert('Payment received successfully!');
          } catch (error: any) {
            alert(error.response?.data?.message || 'Payment is awaiting confirmation.');
          }
        }
      });
      checkout.open();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Could not start online payment.');
    } finally {
      setPayingInvoice(null);
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await api.put('/users/me/profile', profile);
      await refreshUser();
      setEditingProfile(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Could not save profile.');
    }
  };

  const showAll = currentTab === 'portal';
  const showSubscriptions = showAll || currentTab === 'portal';
  const showInvoices = showAll || currentTab === 'customer-invoices';
  const showPayments = showAll || currentTab === 'customer-payments';
  const showProfile = currentTab === 'customer-profile' || editingProfile;

  return (
    <div className="p-8 space-y-8">
      {/* Brand Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">Customer Self-Service Hub</span>
            <h1 className="text-2xl font-black mt-1">Hello, {user?.name}!</h1>
            <p className="text-xs text-blue-100 mt-1">
              {user?.customerProfile?.companyName || 'Individual Customer'} • {user?.customerProfile?.city || 'India'}
            </p>
          </div>
          <div className="text-right flex flex-col sm:items-end">
            <span className="text-xs text-blue-200">Active Subscriptions</span>
            <p className="text-3xl font-black">{subscriptions.filter(s => s.status === 'ACTIVE').length}</p>
            <button
              onClick={() => setEditingProfile(v => !v)}
              className="mt-2 text-xs font-semibold text-white underline hover:text-blue-200 transition-colors"
            >
              {editingProfile ? 'Close profile editor' : 'Edit billing profile'}
            </button>
          </div>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Billing profile successfully saved and updated.</span>
        </div>
      )}

      {/* Account Profile Form (shown if tab is customer-profile or editingProfile is true) */}
      {showProfile && (
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700/70 pb-3">
            <UserCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Account & Billing Profile</h2>
          </div>
          <form onSubmit={saveProfile} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {Object.entries(profile).map(([key, value]) => (
              <label key={key} className="space-y-1 block">
                <span className="block text-slate-600 dark:text-slate-400 capitalize font-medium">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <input
                  value={value}
                  onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            ))}
            <div className="md:col-span-3 flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                Save Billing Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Subscriptions Section */}
      {showSubscriptions && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Repeat className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>My Active Subscriptions</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptions.length === 0 ? (
              <div className="col-span-2 p-8 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 text-center text-xs text-slate-400 dark:text-slate-500">
                No subscriptions found for your account.
              </div>
            ) : (
              subscriptions.map(sub => (
                <div key={sub.id} className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{sub.subscriptionNumber}</span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">{sub.plan.name}</h3>
                    </div>
                    <Badge status={sub.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-750/70 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Next Billing Date</span>
                      <strong className="text-slate-900 dark:text-slate-100">{new Date(sub.nextBillingDate).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-500 block text-[10px]">Renewal / Expiry</span>
                      <strong className="text-slate-900 dark:text-slate-100">{new Date(sub.expiryDate).toLocaleDateString()}</strong>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-400">Cycle Price: </span>
                      <span className="font-black text-slate-900 dark:text-slate-100">₹{sub.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Terms: {sub.paymentTerms}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Invoices Section */}
      {showInvoices && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>My Invoices & Receipts</span>
          </h2>
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Invoice Date</th>
                    <th className="px-6 py-3.5">Due Date</th>
                    <th className="px-6 py-3.5">Total Amount</th>
                    <th className="px-6 py-3.5">Outstanding Balance</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-6 text-center text-slate-400 dark:text-slate-500">
                        No invoices issued yet.
                      </td>
                    </tr>
                  ) : (
                    invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{inv.invoiceNumber}</td>
                        <td className="px-6 py-3.5">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                        <td className="px-6 py-3.5">{new Date(inv.dueDate).toLocaleDateString()}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-slate-100">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-3.5 font-bold text-rose-600 dark:text-rose-400">₹{inv.outstandingBalance.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-3.5"><Badge status={inv.status} /></td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="inline-flex gap-2">
                            {inv.outstandingBalance > 0 && (
                              <button
                                disabled={payingInvoice === inv.id}
                                onClick={() => handleOnlinePayment(inv.id)}
                                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs disabled:opacity-50 transition-colors shadow-sm"
                              >
                                {payingInvoice === inv.id ? 'Opening…' : 'Pay Online'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadPdf(inv.id, inv.invoiceNumber)}
                              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-semibold text-xs transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>PDF</span>
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
        </div>
      )}

      {/* Payments History Section */}
      {showPayments && (
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Payment History</span>
          </h2>
          <div className="bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-900/60 text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3.5">Payment #</th>
                    <th className="px-6 py-3.5">Date</th>
                    <th className="px-6 py-3.5">Payment Method</th>
                    <th className="px-6 py-3.5">Reference / Txn ID</th>
                    <th className="px-6 py-3.5">Amount Paid</th>
                    <th className="px-6 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-slate-400 dark:text-slate-500">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    payments.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{p.paymentNumber}</td>
                        <td className="px-6 py-3.5">{new Date(p.paymentDate).toLocaleDateString()}</td>
                        <td className="px-6 py-3.5 font-medium">{p.paymentMethod.replace('_', ' ')}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-500 dark:text-slate-400">{p.transactionRef || 'Direct / Gateway'}</td>
                        <td className="px-6 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">₹{p.amount.toLocaleString('en-IN')}</td>
                        <td className="px-6 py-3.5"><Badge status="CONFIRMED" /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
