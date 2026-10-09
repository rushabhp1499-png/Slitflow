import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import {
  Users,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  Building2,
  ArrowRight,
  ShieldCheck,
  UserPlus,
  Phone,
  MapPin,
  FileCheck
} from 'lucide-react';

interface CustomerAuthModalProps {
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  onClose,
  defaultMode = 'login',
}) => {
  const {
    customers,
    loginCustomerByEmail,
    loginCustomerByAccessCode,
    registerCustomer,
    authenticatedEmail,
    selectedCustomerId,
  } = useProduction();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultMode);
  const [authMode, setAuthMode] = useState<'email' | 'code'>('email');
  
  // Login inputs
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');

  // Register inputs
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regGst, setRegGst] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = loginCustomerByEmail(emailInput.trim());
    if (res.success && res.customer) {
      setSuccessMessage(`Access Granted to ${res.customer.companyName}!`);
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      setErrorMessage(
        res.message || 'This email is not recognized. If you are a new customer, click "Create New Account" below.'
      );
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const res = loginCustomerByAccessCode(codeInput.trim());
    if (res.success && res.customer) {
      setSuccessMessage(`Access Granted to ${res.customer.companyName}!`);
      setTimeout(() => {
        onClose();
      }, 800);
    } else {
      setErrorMessage(res.message || 'Invalid access code. Please check your order acknowledgment or create a new account.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!companyName.trim() || !regEmail.trim() || !contactPerson.trim()) {
      setErrorMessage('Please provide Company Name, Contact Person, and Email ID.');
      return;
    }

    const res = registerCustomer({
      name: companyName.trim(),
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim() || '+91 98000 00000',
      address: regAddress.trim() || 'Plant Delivery Address',
      registeredAddress: regAddress.trim() || 'Registered Office Address',
      plantAddress: regAddress.trim() || 'Plant Delivery Works',
      gstNumber: regGst.trim().toUpperCase() || '27AAACP0000A1Z5',
      authorizedEmails: [regEmail.trim()],
    });

    if (res.success) {
      setSuccessMessage(res.message);
      setTimeout(() => {
        onClose();
      }, 1000);
    } else {
      setErrorMessage(res.message || 'Failed to create account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg">
              {activeTab === 'login' ? <KeyRound className="w-5 h-5" /> : <UserPlus className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">
                {activeTab === 'login' ? 'Customer Live Tracking Login' : 'Create New Customer Account'}
              </h3>
              <p className="text-[11px] text-slate-400">
                Progressive Enterprises • Precision Slitting Customer Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          
          {/* Main Top Navigation: Existing Customer Login vs Create New Account */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'login'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Existing Customer Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeTab === 'register'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
              <span>Create New Account</span>
            </button>
          </div>

          {/* Success / Error Alerts */}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="space-y-4">
              <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('email');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded transition ${
                    authMode === 'email'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Authorized Email ID
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('code');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-1.5 rounded transition ${
                    authMode === 'code'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Customer Access Code
                </button>
              </div>

              {authMode === 'email' ? (
                <form onSubmit={handleEmailSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Authorized Email ID *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. supplychain@packwellflex.com"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Enter the email ID registered with Progressive Enterprises.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Log In & View Live Orders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCodeSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Customer Unique Access Code *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. PW-FLEX-2026 or CUST-001"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono uppercase font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <span>Verify Access Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              {/* Quick switch to register */}
              <div className="text-center pt-2">
                <p className="text-xs text-slate-600">
                  New customer sending material for slitting?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Create a new account now →
                  </button>
                </p>
              </div>

              {/* Authorized Test Logins */}
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                  Authorized Test Accounts:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      loginCustomerByEmail('supplychain@packwellflex.com');
                      onClose();
                    }}
                    className="text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 transition"
                  >
                    <span className="font-bold text-slate-900 block truncate">PackWell Flexible Packaging</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate block">supplychain@packwellflex.com</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      loginCustomerByEmail('procurement@autotechstamping.com');
                      onClose();
                    }}
                    className="text-left p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 transition"
                  >
                    <span className="font-bold text-slate-900 block truncate">AutoTech Precision</span>
                    <span className="font-mono text-[10px] text-slate-500 truncate block">procurement@autotechstamping.com</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREATE NEW ACCOUNT */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-start gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p>
                  Register your company to submit material inward, configure reel/bundle slitting instructions, and receive live delivery tracking & delivery challans.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company / Firm Legal Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Transformers & Stampings Pvt. Ltd."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Sharma (Procurement Head)"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Authorized Email ID *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. procurement@apextrans.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. +91 98234 56789"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    GSTIN Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={regGst}
                    onChange={(e) => setRegGst(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-mono uppercase border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Plant / Delivery Unloading Works Address *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Plot 18, MIDC Bhosari Industrial Area, Pune - 411026"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create Customer Account & Enter Portal</span>
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-slate-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Sign in here →
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
