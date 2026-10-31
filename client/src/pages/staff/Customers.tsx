import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { CustomerProfile } from '../../types';
import { Users, Mail, Phone, MapPin, Building, FileText, CheckCircle2 } from 'lucide-react';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/customers');
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Customer Directory</h1>
        <p className="text-xs text-slate-500 mt-1">Manage SME and enterprise client profiles, subscription engagements, and billing history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-slate-400">Loading customer profiles...</div>
        ) : customers.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-slate-400">No customers registered yet.</div>
        ) : customers.map((c) => {
          const totalOutstanding = c.invoices?.reduce((acc: number, inv: any) => acc + (inv.outstandingBalance || 0), 0) || 0;
          return (
            <div key={c.id} className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-50">{c.companyName || c.user.name}</h3>
                  {c.companyName && <p className="text-xs text-slate-400 mt-0.5">Contact: {c.user.name}</p>}
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {c.user.name.charAt(0)}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{c.user.email}</span>
                </div>
                {c.user.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.user.phone}</span>
                  </div>
                )}
                {(c.city || c.state) && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.city ? `${c.city}, ` : ''}{c.state || ''}</span>
                  </div>
                )}
                {c.taxNumber && (
                  <div className="text-[11px] font-mono text-slate-400">
                    GSTIN: {c.taxNumber}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Subscriptions: </span>
                  <span className="font-bold text-slate-900 dark:text-slate-50">{c.subscriptions?.length || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400">Outstanding: </span>
                  <span className={`font-bold ${totalOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{totalOutstanding.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
