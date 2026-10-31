import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Login } from './pages/auth/Login';
import { Register, ForgotPassword } from './pages/auth/Register';
import { Dashboard } from './pages/admin/Dashboard';
import { Products } from './pages/admin/Products';
import { Plans } from './pages/admin/Plans';
import { Discounts } from './pages/admin/Discounts';
import { Taxes } from './pages/admin/Taxes';
import { Staff } from './pages/admin/Staff';
import { Customers } from './pages/staff/Customers';
import { Quotations } from './pages/staff/Quotations';
import { Subscriptions } from './pages/staff/Subscriptions';
import { Invoices } from './pages/staff/Invoices';
import { Payments } from './pages/staff/Payments';
import { CustomerPortal } from './pages/customer/CustomerPortal';
import { Reports, Settings } from './pages/shared/Reports';
import api from './services/api';
import { CustomerTools, RevenueSimulator, RenewalManagement } from './pages/shared/AdvancedTools';

const AppContent: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const [authPage, setAuthPage] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [billingLoading, setBillingLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Brightloop Subscription Platform...</p>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    if (authPage === 'register') return <Register onNavigate={(p: any) => setAuthPage(p)} />;
    if (authPage === 'forgot-password') return <ForgotPassword onNavigate={(p: any) => setAuthPage(p)} />;
    return <Login onNavigate={(p: any) => setAuthPage(p)} />;
  }

  // Adjust default tab for customer role
  const effectiveTab = user.role === 'CUSTOMER' && currentTab === 'dashboard' ? 'portal' : user.role === 'MANAGER' && currentTab === 'dashboard' ? 'revenue-simulator' : currentTab;

  const handleTriggerBilling = async () => {
    try {
      setBillingLoading(true);
      const res = await api.post('/billing/run');
      alert(`Automated Recurring Billing Run Complete: ${res.data.generatedInvoices.length} invoices generated.`);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error executing billing');
    } finally {
      setBillingLoading(false);
    }
  };

  const renderContent = () => {
    if (user.role === 'CUSTOMER') {
      if (effectiveTab === 'renewals-simulator') return <CustomerTools />;
      return <CustomerPortal />;
    }

    switch (effectiveTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'products':
        return <Products />;
      case 'plans':
        return <Plans />;
      case 'quotations':
        return <Quotations />;
      case 'subscriptions':
        return <Subscriptions />;
      case 'revenue-simulator':
        return <RevenueSimulator />;
      case 'renewal-management':
        return <RenewalManagement />;
      case 'invoices':
        return <Invoices />;
      case 'payments':
        return <Payments />;
      case 'discounts':
        return <Discounts />;
      case 'taxes':
        return <Taxes />;
      case 'staff':
        return <Staff />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar currentTab={effectiveTab} setCurrentTab={setCurrentTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onTriggerBilling={handleTriggerBilling} billingLoading={billingLoading} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
