import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import {
  Factory,
  Building2,
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  X,
  KeyRound
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const {
    loginFactory,
    loginCustomerByEmail,
    registerCustomer,
    sendPasswordReset,
    syncError,
    clearSyncError,
  } = useProduction();

  // True while waiting for the database, so buttons cannot be pressed twice.
  const [busy, setBusy] = useState(false);

  // Active portal tab: 'customer' or 'factory'
  const [activePortalTab, setActivePortalTab] = useState<'customer' | 'factory'>('customer');

  // Customer sub-tab: 'login' or 'register'
  const [customerSubTab, setCustomerSubTab] = useState<'login' | 'register'>('login');

  // Factory credentials
  const [factoryEmail, setFactoryEmail] = useState('');
  const [factoryPassword, setFactoryPassword] = useState('');
  const [showFactoryPassword, setShowFactoryPassword] = useState(false);
  const [factoryError, setFactoryError] = useState('');
  const [factorySuccess, setFactorySuccess] = useState('');

  // Customer login inputs (Email + Password)
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [showClientPassword, setShowClientPassword] = useState(false);
  const [clientError, setClientError] = useState('');
  const [clientSuccess, setClientSuccess] = useState('');

  // Customer registration inputs (Company Name & Password Compulsory)
  const [regCompany, setRegCompany] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regGst, setRegGst] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // 1. Factory Login Handler
  const handleFactorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFactoryError('');
    setFactorySuccess('');

    if (!factoryEmail.trim() || !factoryPassword) {
      setFactoryError('Please enter both factory Login ID and Password.');
      return;
    }

    setBusy(true);
    const res = await loginFactory(factoryEmail.trim(), factoryPassword);
    setBusy(false);
    if (res.success) {
      setFactorySuccess(res.message);
    } else {
      setFactoryError(res.message);
    }
  };

  // 2. Customer Email + Password Login Handler
  const handleClientEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError('');
    setClientSuccess('');

    if (!clientEmail.trim()) {
      setClientError('Please enter your authorized company email address.');
      return;
    }

    if (!clientPassword) {
      setClientError('Password is required to sign in.');
      return;
    }

    setBusy(true);
    const res = await loginCustomerByEmail(clientEmail.trim(), clientPassword);
    setBusy(false);
    if (res.success) {
      setClientSuccess(res.message);
    } else {
      setClientError(res.message);
    }
  };

  // Emails a link to choose a new password.
  const handleForgotPassword = async () => {
    setClientError('');
    setClientSuccess('');
    if (!clientEmail.trim()) {
      setClientError('Type your email address above first, then click "Forgot password?".');
      return;
    }
    setBusy(true);
    const res = await sendPasswordReset(clientEmail.trim());
    setBusy(false);
    if (res.success) {
      setClientSuccess(res.message);
    } else {
      setClientError(res.message);
    }
  };

  // 3. Customer Registration Handler with Password Creation & Compulsory Company Name
  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regCompany.trim()) {
      setRegError('Company Name is strictly compulsory. Please enter your registered company or firm name.');
      return;
    }

    if (!regContact.trim()) {
      setRegError('Contact person name is required.');
      return;
    }

    if (!regEmail.trim()) {
      setRegError('Authorized email address is required.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setRegError('Password is compulsory and must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match. Please re-enter matching passwords.');
      return;
    }

    setBusy(true);
    const res = await registerCustomer({
      name: regCompany.trim(),
      companyName: regCompany.trim(),
      contactPerson: regContact.trim(),
      email: regEmail.trim(),
      password: regPassword,
      phone: regPhone.trim(),
      registeredAddress: regAddress.trim(),
      plantAddress: regAddress.trim(),
      gstNumber: regGst.trim().toUpperCase() || '',
      authorizedEmails: [regEmail.trim()],
      city: '',
      state: 'Maharashtra',
      stateCode: '27',
    });
    setBusy(false);

    if (res.success) {
      setRegSuccess(res.message);
    } else {
      setRegError(res.message || 'Registration failed. Please check your details.');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 px-4">
      <div className="max-w-xl w-full">

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-32 bg-white rounded-2xl p-2.5 shadow-sm border border-slate-200 mb-4">
            <img
              src="/pe-logo.svg"
              alt="Progressive Enterprises Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h1
            style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
            className="text-2xl sm:text-3xl font-normal text-slate-900 tracking-normal"
          >
            Progressive Enterprises
          </h1>
          <p className="text-xs uppercase font-medium tracking-wider text-blue-700 mt-1">
            Precision Slitting Works & Live Dispatch Portal
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Secure client workspace & industrial dispatch management
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          {/* Main Role Switch Tabs: Customer Portal vs Factory Management */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setActivePortalTab('customer');
                setFactoryError('');
                setFactorySuccess('');
              }}
              className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                activePortalTab === 'customer'
                  ? 'bg-white text-blue-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>Customer Portal</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePortalTab('factory');
                setClientError('');
                setClientSuccess('');
                setRegError('');
                setRegSuccess('');
              }}
              className={`py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
                activePortalTab === 'factory'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Factory className="w-4 h-4 text-amber-400" />
              <span>Factory Dashboard</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">

            {syncError && (
              <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="flex-1">{syncError}</span>
                <button type="button" onClick={clearSyncError} className="text-amber-700 hover:text-amber-950" title="Dismiss">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TAB 1: CUSTOMER PORTAL */}
            {activePortalTab === 'customer' && (
              <div className="space-y-6">
                
                {/* Customer Sub Tabs: Client Sign In vs Create New Account */}
                <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSubTab('login');
                      setClientError('');
                      setClientSuccess('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      customerSubTab === 'login'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Client Sign In
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSubTab('register');
                      setRegError('');
                      setRegSuccess('');
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      customerSubTab === 'register'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create New Account</span>
                  </button>
                </div>

                {/* Sub-view A: Customer Sign In (Email + Password or Google) */}
                {customerSubTab === 'login' && (
                  <div className="space-y-5">
                    
                    {/* Feedback Messages */}
                    {clientSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{clientSuccess}</span>
                      </div>
                    )}
                    {clientError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <span>{clientError}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerSubTab('register');
                              setRegEmail(clientEmail);
                              setClientError('');
                            }}
                            className="block font-bold underline mt-1 text-red-800 hover:text-red-950"
                          >
                            Click here to register your company now →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Email + Password Sign In Form */}
                    <form onSubmit={handleClientEmailSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Authorized Company Email ID <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="email"
                            required
                            placeholder="e.g. procurement@yourcompany.com"
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type={showClientPassword ? 'text' : 'password'}
                            required
                            placeholder="Enter your account password"
                            value={clientPassword}
                            onChange={(e) => setClientPassword(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowClientPassword(!showClientPassword)}
                            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            {showClientPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={busy}
                          className="mt-1.5 text-[11px] font-semibold text-blue-700 hover:text-blue-900 underline"
                        >
                          Forgot password?
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={busy}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Sign In to Customer Portal</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* Sub-view B: Create New Customer Account with Password Creation */}
                {customerSubTab === 'register' && (
                  <form onSubmit={handleCustomerRegister} className="space-y-4">
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
                      <span className="font-bold block text-emerald-900 mb-0.5">
                        New Customer Self-Registration
                      </span>
                      Register your company to send inward material, track precision slitting stages, and download verified digital delivery challans.
                    </div>

                    {regSuccess && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{regSuccess}</span>
                      </div>
                    )}
                    {regError && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <span>{regError}</span>
                      </div>
                    )}

                    {/* Company Legal Name - STRICTLY COMPULSORY */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-900">
                          Company / Firm Legal Name <span className="text-red-600 font-black">*</span>
                        </label>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                          Compulsory
                        </span>
                      </div>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Paramount Electricals & Stampings Pvt Ltd"
                          value={regCompany}
                          onChange={(e) => setRegCompany(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                          Contact Person <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Ramesh Patil"
                            value={regContact}
                            onChange={(e) => setRegContact(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                          Authorized Email ID <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="email"
                            required
                            placeholder="e.g. purchase@paramount.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Password Creation Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-900">
                            Create Password <span className="text-red-600">*</span>
                          </label>
                          <span className="text-[10px] text-slate-500 font-mono">Min 6 chars</span>
                        </div>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="Enter password"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPassword(!showRegPassword)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showRegPassword ? (
                              <EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-900 mb-1">
                          Confirm Password <span className="text-red-600">*</span>
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type={showRegPassword ? 'text' : 'password'}
                            required
                            minLength={6}
                            placeholder="Confirm password"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          Phone Number
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="tel"
                            placeholder="e.g. +91 98220 12345"
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1">
                          GSTIN (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 27ABCDE1234F1Z5"
                          value={regGst}
                          onChange={(e) => setRegGst(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Plant Delivery / Works Address
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <textarea
                          rows={2}
                          placeholder="e.g. Plot No. 12, Bhosari MIDC, Pune - 411026"
                          value={regAddress}
                          onChange={(e) => setRegAddress(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Create Account & Access Portal</span>
                    </button>
                  </form>
                )}

              </div>
            )}

            {/* TAB 2: FACTORY MANAGEMENT DASHBOARD LOGIN */}
            {activePortalTab === 'factory' && (
              <form onSubmit={handleFactorySubmit} className="space-y-5">
                <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-900">
                      Restricted Factory Management Access
                    </span>
                    <p className="text-slate-700 mt-0.5">
                      This area is strictly for Progressive Enterprises factory management, machine shop operators, and dispatch masters.
                    </p>
                  </div>
                </div>

                {factorySuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{factorySuccess}</span>
                  </div>
                )}
                {factoryError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 text-xs text-red-900 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{factoryError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Factory Login ID (Email) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="progressive.ent8@gmail.com"
                      value={factoryEmail}
                      onChange={(e) => setFactoryEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showFactoryPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter factory password"
                      value={factoryPassword}
                      onChange={(e) => setFactoryPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowFactoryPassword(!showFactoryPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showFactoryPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-black text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Unlock Factory Dashboard</span>
                </button>
              </form>
            )}

          </div>
        </div>

        {/* Security & Isolation Disclaimer */}
        <div className="text-center mt-6 text-[11px] text-slate-500">
          <p>
            Customer data is strictly isolated. Customers can only view their own company orders & challans.
          </p>
        </div>
      </div>
    </div>
  );
};
