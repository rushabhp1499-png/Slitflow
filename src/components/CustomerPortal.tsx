import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward, ProductionStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  Building2,
  Calendar,
  Clock,
  Scissors,
  Package,
  Truck,
  FileText,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Send,
  Printer,
  ChevronRight,
  ShieldCheck,
  Scale,
  Lock,
  Mail,
  Copy,
  Check,
  Share2,
  Layers,
  Sliders,
  History,
  AlertTriangle,
  LogOut,
  Download
} from 'lucide-react';
import { downloadChallanAsHtml } from '../utils/challanExport';

interface CustomerPortalProps {
  onOpenInwardModal: () => void;
  onOpenChallanModal: (job: MaterialInward) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  onOpenInwardModal,
  onOpenChallanModal,
}) => {
  const {
    jobs,
    customers,
    selectedCustomerId,
    setSelectedCustomerId,
    authenticatedEmail,
    logoutCustomer,
    loginCustomerByEmail,
    loginCustomerByAccessCode,
    registerCustomer,
  } = useProduction();

  const [copiedLink, setCopiedLink] = useState(false);

  // Login & Registration State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [authTab, setAuthTab] = useState<'email' | 'code' | 'register'>('email');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // New Customer Registration Inputs
  const [regCompany, setRegCompany] = useState('');
  const [regContact, setRegContact] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regGst, setRegGst] = useState('');

  // Find customer matching the authenticated email
  const matchedCustomer = authenticatedEmail
    ? customers.find((c) =>
        c.authorizedEmails.some(
          (ae) => ae.toLowerCase() === authenticatedEmail.toLowerCase()
        ) || c.email.toLowerCase() === authenticatedEmail.toLowerCase()
      )
    : null;

  const isAuthenticated = !!matchedCustomer;
  const currentCustomer = matchedCustomer || customers.find((c) => c.id === selectedCustomerId) || customers[0];

  const [bundleFilter, setBundleFilter] = useState<'all' | 'ready' | 'dispatched'>('all');

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!loginEmail.trim()) return;

    const res = loginCustomerByEmail(loginEmail.trim());
    if (!res.success) {
      setAuthError(
        res.message ||
          `Access Denied: "${loginEmail}" is not registered. Click "Create New Account" below to register your company.`
      );
    }
  };

  const handleCodeLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    if (!loginCode.trim()) return;

    const res = loginCustomerByAccessCode(loginCode.trim());
    if (!res.success) {
      setAuthError(
        res.message ||
          `Invalid Access Code "${loginCode}". Check your receipt or click "Create New Account" to register.`
      );
    }
  };

  const handleRegisterNewCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!regCompany.trim() || !regEmail.trim() || !regContact.trim()) {
      setAuthError('Please provide Company Name, Contact Person, and Email ID.');
      return;
    }

    const res = registerCustomer({
      name: regCompany.trim(),
      companyName: regCompany.trim(),
      contactPerson: regContact.trim(),
      email: regEmail.trim(),
      phone: regPhone.trim() || '+91 98000 00000',
      address: regAddress.trim() || 'Plant Delivery Address',
      registeredAddress: regAddress.trim() || 'Registered Office Address',
      plantAddress: regAddress.trim() || 'Plant Delivery Works',
      gstNumber: regGst.trim().toUpperCase() || '27AAACP0000A1Z5',
      authorizedEmails: [regEmail.trim()],
    });

    if (res.success) {
      setAuthSuccess(res.message);
    } else {
      setAuthError(res.message || 'Failed to create customer account.');
    }
  };

  // Filter jobs only for this authenticated customer
  const customerJobs = jobs.filter((j) => j.customerId === currentCustomer?.id);

  const [selectedJobId, setSelectedJobId] = useState<string>(
    customerJobs[0]?.id || ''
  );

  // Sync selectedJobId if customer changes
  React.useEffect(() => {
    if (!customerJobs.some((j) => j.id === selectedJobId)) {
      setSelectedJobId(customerJobs[0]?.id || '');
    }
  }, [selectedCustomerId, customerJobs, selectedJobId]);

  const activeJob =
    customerJobs.find((j) => j.id === selectedJobId) || customerJobs[0];

  const handleCopyTrackingLink = () => {
    const origin = window.location.origin;
    const trackingUrl = `${origin}?track=${currentCustomer?.accessCode || currentCustomer?.id}`;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // 4 Steps Live Update (Club steps 1 & 2, and club steps 5 & 6)
  const stages: Array<{
    id: number;
    label: string;
    sub: string;
  }> = [
    {
      id: 1,
      label: 'Material Inward & Scheduled',
      sub: 'Gate entry verified & slotted in queue',
    },
    {
      id: 2,
      label: 'Under Slitting',
      sub: 'Active slitter precision machine run',
    },
    {
      id: 3,
      label: 'Slitting & Bundling',
      sub: 'Floor inspection & calibrated scale weighing',
    },
    {
      id: 4,
      label: 'Packaging & Dispatched',
      sub: 'Secure strap pack & e-Challan delivery',
    },
  ];

  const getStageIndex = (status: ProductionStatus) => {
    switch (status) {
      case 'received':
      case 'pending_production':
        return 0; // Clubbed Step 1 & 2
      case 'in_production':
        return 1; // Step 2: Under Slitting
      case 'slitting_completed':
        return 2; // Step 3: Slitting & Bundling
      case 'ready_for_dispatch':
      case 'dispatched':
      case 'po_closed':
        return 3; // Clubbed Step 5 & 6
      default:
        return 0;
    }
  };

  const currentStageIndex = activeJob ? getStageIndex(activeJob.status) : 0;
  const isPermanentlyClosed =
    activeJob?.poStatus === 'closed' ||
    activeJob?.poStatus === 'permanently_closed' ||
    activeJob?.status === 'po_closed';
  const dispatchedWeight = activeJob?.dispatchedWeightKg || 0;
  const remainingWeight = activeJob ? Math.max(0, activeJob.incomingWeight - dispatchedWeight) : 0;
  const challansList = activeJob?.challans && activeJob.challans.length > 0
    ? activeJob.challans
    : activeJob?.challan
    ? [activeJob.challan]
    : [];

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-6 animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Customer Portal & Order Tracking</h2>
                <p className="text-xs text-slate-400">
                  Progressive Enterprises Precision Slitting Works
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Factory Machine Registration Notice */}
            <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 text-xs text-blue-950 flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-blue-900">
                  Factory-Registered Account Authorization
                </span>
                <p className="text-slate-700 leading-relaxed">
                  The factory registers customer company details and authorized email IDs into the machine system. Only users with registered email IDs can open up their customer account.
                </p>
              </div>
            </div>

            {/* Error / Success Notifications */}
            {authSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-950 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block text-emerald-900">Account Ready</span>
                  <p className="leading-relaxed">{authSuccess}</p>
                </div>
              </div>
            )}

            {authError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Notice</span>
                  <p className="leading-relaxed">{authError}</p>
                </div>
              </div>
            )}

            {/* Auth Mode Tabs (Login vs New Customer Account) */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('email');
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className={`flex-1 py-2 rounded-lg transition ${
                  authTab === 'email'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Authorized Email
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('code');
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className={`flex-1 py-2 rounded-lg transition ${
                  authTab === 'code'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Access Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthError('');
                  setAuthSuccess('');
                }}
                className={`flex-1 py-2 rounded-lg transition flex items-center justify-center gap-1 ${
                  authTab === 'register'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Create New Account</span>
              </button>
            </div>

            {/* Email Form */}
            {authTab === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Authorized Customer Email ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. supplychain@packwellflex.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the email registered with Progressive Enterprises.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Open My Customer Account</span>
                </button>
              </form>
            )}

            {/* Code Form */}
            {authTab === 'code' && (
              <form onSubmit={handleCodeLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Customer Tracking Access Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PW-FLEX-2026 or CUST-001"
                    value={loginCode}
                    onChange={(e) => setLoginCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Found on your material receipt acknowledgment or delivery challan.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Verify Code & Open Portal</span>
                </button>
              </form>
            )}

            {/* Create New Account Form */}
            {authTab === 'register' && (
              <form onSubmit={handleRegisterNewCustomer} className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
                  <span className="font-bold block text-emerald-900 mb-0.5">New Customer Self-Registration</span>
                  Register your company to send material inward, submit slitting specifications, and receive live progress tracking & digital challans.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Company / Firm Legal Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paramount Electricals & Stampings Pvt Ltd"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Contact Person <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Patil"
                      value={regContact}
                      onChange={(e) => setRegContact(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Authorized Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. purchase@paramount.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98220 12345"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                    />
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
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono uppercase text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Plant Delivery / Works Address
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Sector 10, PCMC Industrial Area, Pune 411019"
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Account & Start Inward</span>
                </button>
              </form>
            )}

            {/* Test Customer Logins Pre-registered in machine */}
            <div className="pt-4 border-t border-slate-100">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 block mb-2">
                Factory-Registered Customer Accounts (1-Click Test):
              </span>
              <div className="space-y-2">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      const emailToUse = c.authorizedEmails[0] || c.email;
                      loginCustomerByEmail(emailToUse);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-blue-700 truncate">
                          {c.companyName}
                        </span>
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-mono">
                          {c.id}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 block truncate">
                        {c.authorizedEmails[0] || c.email}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded-lg shrink-0 group-hover:bg-blue-600 group-hover:text-white transition">
                      Log In →
                    </span>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Customer Header & Registered Account Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-extrabold text-base sm:text-lg text-slate-900">
                  {currentCustomer.companyName}
                </h2>
                <span className="text-[11px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Customer Live Portal
                </span>
                {authenticatedEmail && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-800 font-mono px-2 py-0.5 rounded border border-emerald-200">
                    Logged in as {authenticatedEmail}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                GSTIN: {currentCustomer.gstNumber} • Access Code: {currentCustomer.accessCode}
              </p>
            </div>
          </div>

          {/* Quick Actions: Copy Tracking Link, Send Material, Sign Out */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopyTrackingLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition"
              title="Copy shareable customer tracking link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-blue-600" />}
              <span>{copiedLink ? 'Link Copied!' : 'Share Live Tracking Link'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenInwardModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send New Material</span>
            </button>

            <button
              type="button"
              onClick={logoutCustomer}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition"
              title="Sign out of customer portal"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Registered Address & Authorized Email Grant Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Registered Office & Consignee Delivery Works:
            </span>
            <p className="text-slate-700 leading-snug">
              <strong>Registered Office:</strong> {currentCustomer.registeredAddress}
            </p>
            <p className="text-slate-700 leading-snug mt-1">
              <strong>Delivery Plant:</strong> {currentCustomer.plantAddress || currentCustomer.registeredAddress}
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
              Authorized Team Email IDs with Portal Access ({currentCustomer.authorizedEmails?.length || 1}):
            </span>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {(currentCustomer.authorizedEmails || [currentCustomer.email]).map((em) => (
                <span
                  key={em}
                  className="bg-white border border-slate-300 text-slate-800 font-mono text-[11px] px-2 py-0.5 rounded flex items-center gap-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {em}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              All listed email IDs receive automated real-time dispatch alerts and challan PDFs.
            </p>
          </div>
        </div>
      </div>

      {/* Main Customer Order Explorer */}
      {customerJobs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <h3 className="font-bold text-slate-700 text-base">No Materials Currently at Factory</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            You currently have no active or completed slitting jobs with Progressive Enterprises.
          </p>
          <button
            onClick={onOpenInwardModal}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
          >
            Send Material for Slitting
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Material Batches Selector */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Your Orders & Batches ({customerJobs.length})
              </span>
              <span className="text-[11px] text-blue-600">Click to track</span>
            </div>

            <div className="space-y-2">
              {customerJobs.map((job) => {
                const isSelected = activeJob?.id === job.id;
                const isClosed = job.poStatus === 'permanently_closed';
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-300 shadow-sm ring-1 ring-blue-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {job.jobNo}
                          </span>
                          <span className="font-mono text-[11px] text-blue-700 font-bold">
                            PO #{job.customerPoNo}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 mt-1">{job.grade}</h4>
                      </div>
                      {isClosed ? (
                        <span className="text-[10px] bg-slate-900 text-white font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-red-400" /> Closed
                        </span>
                      ) : (
                        <StatusBadge status={job.status} size="sm" />
                      )}
                    </div>

                    <div className="text-xs text-slate-600 mt-2 flex justify-between">
                      <span>
                        {job.thickness}{job.thicknessUnit} × {job.incomingWidth}mm
                      </span>
                      <span className="font-bold text-slate-900">
                        {job.incomingWeight.toLocaleString()} kg
                      </span>
                    </div>

                    {/* Dispatched info */}
                    {(job.dispatchedWeightKg || 0) > 0 && (
                      <div className="text-[11px] text-emerald-800 font-medium mt-1">
                        Dispatched: {job.dispatchedWeightKg?.toLocaleString()} kg ({job.challans?.length || 1} Challan)
                      </div>
                    )}

                    {/* EDD indicator */}
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-blue-600" />
                        EDD: {job.estimatedDeliveryDate || 'Pending factory slot'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Tracking, Specifications, Dispatches */}
          {activeJob && (
            <div className="lg:col-span-8 space-y-5">
              
              {/* Live Tracking Header Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        Job #{activeJob.jobNo}
                      </span>
                      <span className="font-mono text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                        PO #{activeJob.customerPoNo}
                      </span>
                      {isPermanentlyClosed ? (
                        <span className="text-xs bg-slate-900 text-slate-100 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Lock className="w-3 h-3 text-red-400" /> Permanently Closed
                        </span>
                      ) : (
                        <StatusBadge status={activeJob.status} size="md" />
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      {activeJob.grade}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Inward Challan: {activeJob.inwardChallanNo} • Vehicle: {activeJob.vehicleNo} • Received on {activeJob.receivedDate}
                    </p>
                  </div>

                  {/* Actions & Requests */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                    {challansList.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenChallanModal(activeJob)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0"
                      >
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span>View Delivery Challan ({challansList.length})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Permanent PO Closure Banner if Closed */}
                {isPermanentlyClosed && (
                  <div className="bg-slate-900 text-white rounded-xl p-4 flex items-start gap-3 shadow-md">
                    <div className="p-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg shrink-0 mt-0.5">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">
                          Purchase Order Permanently Closed & Audited
                        </span>
                        <span className="text-[10px] bg-red-500/20 text-red-300 font-mono px-2 py-0.5 rounded border border-red-500/30">
                          {activeJob.poClosedDate}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {activeJob.poClosingNotes}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Authorized Factory Master Sign-off: <strong className="text-white">{activeJob.poClosedBy}</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Estimated Delivery Date Alert */}
                {!isPermanentlyClosed && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-blue-900 uppercase tracking-wider block">
                          Estimated Delivery Commitment
                        </span>
                        <div className="text-base sm:text-lg font-black text-blue-950">
                          {activeJob.estimatedDeliveryDate
                            ? new Date(activeJob.estimatedDeliveryDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Factory Planner scheduling machine blade setup'}
                        </div>
                        <p className="text-[11px] text-blue-700">
                          Assigned Line: {activeJob.assignedMachine}
                        </p>
                      </div>
                    </div>

                    {activeJob.eddHistory && activeJob.eddHistory.length > 0 && (
                      <div className="text-right sm:border-l sm:border-blue-200 sm:pl-4">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                          Factory Confirmation
                        </span>
                        <span className="text-xs font-bold text-slate-800 block">
                          {activeJob.eddHistory[activeJob.eddHistory.length - 1]?.changedBy}
                        </span>
                        <span className="text-[11px] text-slate-500 italic block">
                          &ldquo;{activeJob.eddHistory[activeJob.eddHistory.length - 1]?.note}&rdquo;
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Material Weight Reconciliation Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Inward Raw Material Sent:</span>
                    <span className="text-base font-black text-slate-900">{activeJob.incomingWeight.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Dispatched Finished Goods:</span>
                    <span className="text-base font-black text-emerald-800">{dispatchedWeight.toLocaleString()} kg</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 block">Remaining Material in Process:</span>
                    <span className="text-base font-black text-blue-900">{remainingWeight.toLocaleString()} kg</span>
                  </div>
                </div>

                {/* 4-Step Live Update */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Live Update</span>
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Step {currentStageIndex + 1} of 4: {stages[currentStageIndex]?.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {stages.map((stage, idx) => {
                      const isPast = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;

                      return (
                        <div
                          key={stage.id}
                          className={`p-3 rounded-xl border text-left transition ${
                            isCurrent
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                              : isPast
                              ? 'bg-emerald-50 text-emerald-950 border-emerald-300'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                isCurrent
                                  ? 'bg-white/20 text-white'
                                  : isPast
                                  ? 'bg-emerald-200/60 text-emerald-800'
                                  : 'bg-slate-200/60 text-slate-600'
                              }`}
                            >
                              Step {idx + 1}
                            </span>
                            {isPast ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : isCurrent ? (
                              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-300" />
                            )}
                          </div>
                          <div className={`text-xs font-extrabold leading-tight ${isCurrent ? 'text-white' : 'text-slate-800'}`}>
                            {stage.label}
                          </div>
                          <div
                            className={`text-[11px] mt-1 line-clamp-2 ${
                              isCurrent ? 'text-blue-100' : isPast ? 'text-emerald-700 font-medium' : 'text-slate-400'
                            }`}
                          >
                            {stage.sub}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Side-by-Side: Incoming Material Specs vs Slitting Output Specs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* INCOMING RAW MATERIAL CARD */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-blue-600" />
                      Incoming Material Received
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Challan #{activeJob.inwardChallanNo}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Material Grade:</span>
                      <span className="font-bold text-slate-900">{activeJob.grade}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Thickness:</span>
                      <span className="font-bold text-slate-900">
                        {activeJob.thickness} {activeJob.thicknessUnit}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Incoming Width:</span>
                      <span className="font-bold text-slate-900">{activeJob.incomingWidth} mm</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Length:</span>
                      <span className="font-bold text-slate-900">{activeJob.incomingLength} meters</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Gross Incoming Weight:</span>
                      <span className="font-black text-blue-900 text-sm">
                        {activeJob.incomingWeight.toLocaleString()} kg
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Parent Coils / Rolls:</span>
                      <span className="font-bold text-slate-900">{activeJob.coilsOrRollsCount} units</span>
                    </div>
                  </div>

                  {/* Customer Instructions & Packaging Parameters */}
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
                    <span className="font-bold text-amber-950 block mb-1">
                      Your Processing Instructions:
                    </span>
                    <p className="text-amber-900 leading-relaxed font-medium">
                      {activeJob.customerInstructions}
                    </p>
                    {activeJob.bundleSpecs && (
                      <div className="mt-2 pt-2 border-t border-amber-200 font-bold text-purple-900">
                        Bundle Specs: ~{activeJob.bundleSpecs.targetBundleWeightKg || '25-30'} kg max per bundle • {activeJob.bundleSpecs.unitsPerBundle} {activeJob.bundleSpecs.unitType} per bundle.
                      </div>
                    )}
                  </div>
                </div>

                {/* FINISHED SLITTING OUTPUT & BUNDLE SPECS */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-purple-600" />
                      Slitting Output & Packaging
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {activeJob.outputDetails ? 'Inspected & Passed' : 'In Progress'}
                    </span>
                  </div>

                  {activeJob.outputDetails ? (
                    <div className="space-y-2.5 text-xs">
                      {/* Slit Cut Sizes List */}
                      <div>
                        <span className="text-slate-500 text-[11px] block mb-1">
                          Finished Slit Cuts & Widths:
                        </span>
                        <div className="space-y-1">
                          {activeJob.outputDetails.slitCuts.map((cut, idx) => (
                            <div
                              key={idx}
                              className="bg-purple-50/70 border border-purple-200 p-1.5 rounded flex justify-between font-medium text-purple-950"
                            >
                              <span>
                                <strong>{cut.widthMm} mm</strong> ({cut.numberOfCuts} reels/strips)
                              </span>
                              <span className="text-[11px] text-purple-700">{cut.remarks || 'Slit size'}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Packaging specifications (Boxes, bundles, reels/reams per bundle) */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Total Bundles / Boxes:</span>
                          <span className="font-extrabold text-sm text-slate-900">
                            {activeJob.outputDetails.totalBundles} {activeJob.outputDetails.packagingType}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Reels per Bundle:</span>
                          <span className="font-extrabold text-sm text-slate-900">
                            {activeJob.outputDetails.reelsOrReamsPerBundle} reels / bundle
                          </span>
                        </div>
                      </div>

                      {/* Weights & Yield */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg">
                          <span className="text-[10px] text-emerald-800 block">Finished Net Weight:</span>
                          <span className="font-black text-emerald-950 text-sm">
                            {activeJob.outputDetails.totalFinishedWeightKg.toLocaleString()} kg
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg">
                          <span className="text-[10px] text-slate-500 block">Scrap / Trim Loss:</span>
                          <span className="font-bold text-slate-800 text-sm">
                            {activeJob.outputDetails.scrapWeightKg.toLocaleString()} kg
                          </span>
                        </div>
                      </div>

                      {activeJob.outputDetails.productionNotes && (
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 italic">
                          <strong>Factory Note:</strong> {activeJob.outputDetails.productionNotes}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-400 space-y-2">
                      <Scissors className="w-8 h-8 mx-auto opacity-30 text-purple-600" />
                      <p className="text-xs font-semibold text-slate-600">
                        {activeJob.status === 'in_production'
                          ? 'Material currently on the slitter line. Slit cuts and bundle counts being recorded live.'
                          : 'Material is in production queue. Slitting parameters will be displayed once slitting starts.'}
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* SPEC AMENDMENT & APPROVAL BACKTRACK SECTION */}
              {activeJob.specChangeRequests && activeJob.specChangeRequests.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-600" />
                      Spec Amendment & Backtrack Log ({activeJob.specChangeRequests.length})
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeJob.specChangeRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          req.status === 'pending'
                            ? 'bg-amber-50/70 border-amber-300'
                            : req.status === 'approved'
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-rose-50/70 border-rose-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                                req.status === 'pending'
                                  ? 'bg-amber-200 text-amber-900'
                                  : req.status === 'approved'
                                  ? 'bg-emerald-200 text-emerald-900'
                                  : 'bg-rose-200 text-rose-900'
                              }`}
                            >
                              {req.status === 'pending'
                                ? '⏳ Pending Factory Review'
                                : req.status === 'approved'
                                ? '✓ Approved & Master Specs Updated'
                                : '✕ Amendment Rejected'}
                            </span>
                            <span className="text-slate-500 font-mono text-[11px]">
                              Submitted: {new Date(req.requestedAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-slate-600 text-[11px]">
                            Requested by: <strong>{req.requestedBy}</strong> ({req.contactEmail})
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Requested Slit Widths & Cuts:
                            </span>
                            <div className="font-mono font-bold text-slate-900 mt-0.5">
                              {req.requestedSlitCuts.map((c) => `${c.widthMm}mm × ${c.numberOfCuts} reels`).join(' + ')}
                            </div>
                          </div>

                          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">
                              Customer Reason / Justification:
                            </span>
                            <p className="text-slate-800 italic mt-0.5">&ldquo;{req.reason}&rdquo;</p>
                          </div>
                        </div>

                        {/* Review Audit Backtrack */}
                        {req.reviewedBy && (
                          <div className="mt-2 pt-2 border-t border-slate-300/60 flex flex-wrap items-center justify-between text-[11px] text-slate-700 gap-1">
                            <div>
                              <strong>Factory Master Audit:</strong> Reviewed by {req.reviewedBy} on{' '}
                              {req.reviewedAt ? new Date(req.reviewedAt).toLocaleString() : ''}
                            </div>
                            {req.reviewNotes && (
                              <div className="italic text-slate-600">Note: &ldquo;{req.reviewNotes}&rdquo;</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LIVE BUNDLE WEIGHING SCALE LEDGER (Floor Updates) */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-blue-600" />
                    Live Floor Weighing Scale Ledger ({activeJob.bundles?.length || 0} Bundles Logged)
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Updated live as each bundle is weighed on the machine scale
                  </span>
                </div>

                {activeJob.bundles && activeJob.bundles.length > 0 ? (
                  <div className="space-y-3">
                    {/* Summary Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5">
                        <span className="text-[10px] text-blue-700 block uppercase font-mono">Total Bundles Weighed</span>
                        <span className="text-base font-black text-blue-950">
                          {activeJob.bundles.length} bundles
                        </span>
                      </div>
                      <div className="bg-amber-50/80 border border-amber-300 rounded-lg p-2.5">
                        <span className="text-[10px] text-amber-800 block uppercase font-mono">On Shop Floor (Ready)</span>
                        <span className="text-base font-black text-amber-950">
                          {activeJob.bundles.filter((b) => b.status === 'ready').length} bundles (
                          {activeJob.bundles
                            .filter((b) => b.status === 'ready')
                            .reduce((s, b) => s + b.netWeightKg, 0)
                            .toFixed(2)}{' '}
                          kg)
                        </span>
                      </div>
                      <div className="bg-blue-50/70 border border-blue-300 rounded-lg p-2.5">
                        <span className="text-[10px] text-blue-700 block uppercase font-mono">Dispatched Material</span>
                        <span className="text-base font-black text-blue-900">
                          {activeJob.bundles.filter((b) => b.status === 'dispatched').length} bundles (
                          {activeJob.bundles
                            .filter((b) => b.status === 'dispatched')
                            .reduce((s, b) => s + b.netWeightKg, 0)
                            .toFixed(2)}{' '}
                          kg)
                        </span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        <span className="text-[10px] text-slate-500 block uppercase font-mono">Floor Scale Resolution</span>
                        <span className="text-xs font-bold text-slate-800 block mt-0.5">
                          50g (0.05 kg) least count
                        </span>
                      </div>
                    </div>

                    {/* Filter Tabs for Bundles */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setBundleFilter('all')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                            bundleFilter === 'all'
                              ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All Bundles ({activeJob.bundles.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBundleFilter('ready')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            bundleFilter === 'ready'
                              ? 'bg-amber-500 text-white shadow-2xs font-extrabold'
                              : 'text-amber-800 hover:text-amber-950'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                          On Shop Floor ({activeJob.bundles.filter((b) => b.status === 'ready').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBundleFilter('dispatched')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                            bundleFilter === 'dispatched'
                              ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                              : 'text-blue-700 hover:text-blue-900'
                          }`}
                        >
                          <Truck className="w-3 h-3" />
                          Dispatched ({activeJob.bundles.filter((b) => b.status === 'dispatched').length})
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Showing {
                          activeJob.bundles.filter((b) =>
                            bundleFilter === 'all' ? true : bundleFilter === 'ready' ? b.status === 'ready' : b.status === 'dispatched'
                          ).length
                        } of {activeJob.bundles.length} bundles
                      </span>
                    </div>

                    {/* Granular Itemized Table */}
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="p-2 w-10 text-center">#</th>
                            <th className="p-2">Bundle Tag</th>
                            <th className="p-2">Slit Roll Specification</th>
                            <th className="p-2">Core type</th>
                            <th className="p-2 text-right font-mono">Scale Gross Wt</th>
                            <th className="p-2 text-right font-mono">Tare Deduction</th>
                            <th className="p-2 text-right font-mono font-black text-slate-900">Net Weight</th>
                            <th className="p-2 text-center">Location & Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {activeJob.bundles
                            .filter((b) =>
                              bundleFilter === 'all'
                                ? true
                                : bundleFilter === 'ready'
                                ? b.status === 'ready'
                                : b.status === 'dispatched'
                            )
                            .map((bundle, bIdx) => (
                            <tr key={bundle.id} className="hover:bg-slate-50/70">
                              <td className="p-2 text-center text-slate-400 font-normal">{bIdx + 1}</td>
                              <td className="p-2 font-bold text-blue-900 font-mono">{bundle.bundleTag}</td>
                              <td className="p-2 font-sans font-medium text-slate-800">{bundle.rollsSummary}</td>
                              <td className="p-2 font-sans font-medium text-slate-800">
                                {bundle.coreType === 'paper_core' ? 'Paper Tube' : 'Plastic Tube'}
                              </td>
                              <td className="p-2 text-right text-slate-600 font-mono">{bundle.grossWeightKg.toFixed(2)} kg</td>
                              <td className="p-2 text-right text-amber-700 font-mono">-{bundle.paperCoreTareWeightKg.toFixed(2)} kg</td>
                              <td className="p-2 text-right font-black text-slate-950 font-mono">{bundle.netWeightKg.toFixed(2)} kg</td>
                              <td className="p-2 text-center font-sans">
                                {bundle.status === 'dispatched' ? (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                                    <Truck className="w-3 h-3 text-blue-600" />
                                    <span>Dispatched {bundle.dispatchedInChallanNo || (bundle as any).dispatchedChallanNo ? `(${bundle.dispatchedInChallanNo || (bundle as any).dispatchedChallanNo})` : ''}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-300">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span>On Shop Floor (Ready)</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400">
                    <Scale className="w-7 h-7 mx-auto opacity-30 text-blue-600 mb-1" />
                    <p className="text-xs text-slate-600 font-medium">
                      Individual bundle floor weighing is in progress on the machine floor.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Each bundle weighed on the scale (approx 25-30 kg with net & gross readings) will appear here immediately.
                    </p>
                  </div>
                )}
              </div>

              {/* Delivery Challans History Section */}
              {challansList.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      Issued Delivery Challans ({challansList.length})
                    </span>
                    <span className="text-xs text-slate-500">
                      Total Dispatched: <strong>{dispatchedWeight.toLocaleString()} kg</strong>
                    </span>
                  </div>

                  <div className="space-y-2">
                    {challansList.map((ch, idx) => (
                      <div
                        key={ch.id}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900">{ch.challanNo}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              {ch.dispatchType === 'partial' ? '⚡ Partial Dispatch' : '📦 Final Dispatch'}
                            </span>
                            <span className="text-xs text-slate-500">Dated: {ch.challanDate}</span>
                          </div>
                          <p className="text-xs text-slate-700 mt-1">
                            Dispatched Weight: <strong>{ch.thisDispatchWeightKg.toLocaleString()} kg</strong> in{' '}
                            <strong>{ch.totalBundles} bundles</strong> via Vehicle <strong>{ch.vehicleNo}</strong> ({ch.transporterName})
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            Drive Archive: {ch.drivePath}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => downloadChallanAsHtml(ch, activeJob)}
                            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                            title="Download HTML challan file"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenChallanModal(activeJob)}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View / Print</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

    </div>
  );
};
