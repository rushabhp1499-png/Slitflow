import React, { useState } from 'react';
import { ProductionProvider, useProduction } from './context/ProductionContext';
import { isSupabaseConfigured } from './lib/supabase';
import { AlertCircle, CheckCircle2, Database, KeyRound, Loader2, X } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { FactoryDashboard } from './components/FactoryDashboard';
import { CustomerPortal } from './components/CustomerPortal';
import { InwardEntryModal } from './components/InwardEntryModal';
import { EddModal } from './components/EddModal';
import { SlittingOutputModal } from './components/SlittingOutputModal';
import { DeliveryChallanModal } from './components/DeliveryChallanModal';
import { BundleWeighingModal } from './components/BundleWeighingModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { CustomerManagementModal } from './components/CustomerManagementModal';
import { PoCloseModal } from './components/PoCloseModal';
import { SpecChangeApprovalModal } from './components/SpecChangeApprovalModal';
import { FloorSetupModal } from './components/FloorSetupModal';
import { AssignJobModal } from './components/AssignJobModal';
import { LiveFloor } from './components/LiveFloor';
import { MaterialInward } from './types';
import { COMPANY_INFO } from './data/mockData';

// Shows a message instead of a blank page if a screen crashes.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3 text-center">
          <AlertCircle className="w-7 h-7 text-red-600 mx-auto" />
          <h2 className="font-bold text-slate-900">Something went wrong on this screen</h2>
          <p className="text-xs text-slate-600 font-mono break-words">{this.state.error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

// Shown when the .env file with the Supabase settings is missing.
function SetupRequired() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-3">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <Database className="w-5 h-5 text-blue-600" />
          <span>Database not connected</span>
        </div>
        <p className="text-sm text-slate-600">
          Add <code className="font-mono text-xs bg-slate-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
          <code className="font-mono text-xs bg-slate-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to the{' '}
          <code className="font-mono text-xs bg-slate-100 px-1 rounded">.env</code> file, then rebuild the site. See
          SUPABASE_SETUP.md for the steps.
        </p>
      </div>
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-slate-600">
      <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// Shown after the user clicks the link in a password reset email.
function PasswordResetScreen() {
  const { completePasswordReset } = useProduction();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const res = await completePasswordReset(password);
    setBusy(false);
    if (!res.success) setError(res.message);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <KeyRound className="w-5 h-5 text-blue-600" />
          <span>Choose a new password</span>
        </div>
        {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}
        <input
          type="password"
          required
          minLength={6}
          placeholder="New password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
        />
        <input
          type="password"
          required
          placeholder="Type it again"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold"
        >
          {busy ? 'Saving...' : 'Save new password'}
        </button>
      </form>
    </div>
  );
}

// Offers a one-time copy of orders that the old version saved only in this browser.
function LocalImportBanner() {
  const { localImport, importLocalBrowserData, dismissLocalImport } = useProduction();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (result) {
    return (
      <div className={`no-print mb-4 rounded-xl border p-3.5 text-xs flex items-start gap-2.5 ${result.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-red-50 border-red-200 text-red-900'}`}>
        {result.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
        <span className="flex-1">{result.message}</span>
        <button type="button" onClick={() => setResult(null)} title="Dismiss"><X className="w-4 h-4" /></button>
      </div>
    );
  }
  if (!localImport) return null;

  return (
    <div className="no-print mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center gap-3">
      <Database className="w-5 h-5 text-blue-700 shrink-0" />
      <div className="flex-1">
        <span className="font-bold block">Old records found in this browser</span>
        This browser still has {localImport.jobs} order(s) and {localImport.customers} customer(s) saved by the old
        version of the site (sample records are skipped). Import them into the database so everyone can see them?
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const res = await importLocalBrowserData();
            setBusy(false);
            setResult({ ok: res.success, message: res.message });
          }}
          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
        >
          {busy ? 'Importing...' : 'Import'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={dismissLocalImport}
          className="px-3 py-2 bg-white border border-blue-200 text-blue-800 rounded-lg font-bold"
        >
          Don't import
        </button>
      </div>
    </div>
  );
}

// Database errors (save conflicts, lost connection) shown at the bottom of the screen.
function SyncErrorToast() {
  const { syncError, clearSyncError, isFactoryAuthenticated, authenticatedEmail } = useProduction();
  // The login page shows its own copy of the message.
  if (!syncError || !(isFactoryAuthenticated || authenticatedEmail)) return null;
  return (
    <div className="no-print fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-xl bg-red-600 text-white rounded-xl shadow-lg p-3.5 text-xs flex items-start gap-2.5">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <span className="flex-1">{syncError}</span>
      <button type="button" onClick={clearSyncError} title="Dismiss"><X className="w-4 h-4" /></button>
    </div>
  );
}

function MainAppContent() {
  const {
    activeRole,
    isFactoryAuthenticated,
    authenticatedEmail,
    currentCustomer,
    selectedCustomerId,
    authLoading,
    dataLoading,
    passwordRecovery,
  } = useProduction();

  // Modals state
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [selectedJobForEdd, setSelectedJobForEdd] = useState<MaterialInward | null>(null);
  const [selectedJobForOutput, setSelectedJobForOutput] = useState<MaterialInward | null>(null);
  const [selectedJobForChallan, setSelectedJobForChallan] = useState<MaterialInward | null>(null);
  const [selectedJobForBundleWeighing, setSelectedJobForBundleWeighing] = useState<MaterialInward | null>(null);
  const [selectedJobForPoClose, setSelectedJobForPoClose] = useState<MaterialInward | null>(null);
  const [selectedJobForSpecApproval, setSelectedJobForSpecApproval] = useState<MaterialInward | null>(null);
  const [isFloorSetupOpen, setIsFloorSetupOpen] = useState(false);
  const [selectedJobForAssign, setSelectedJobForAssign] = useState<MaterialInward | null>(null);

  const handleOpenChallan = (job: MaterialInward) => {
    setSelectedJobForChallan(job);
  };

  // Determine if user is logged in
  const isLoggedIn = isFactoryAuthenticated || !!authenticatedEmail;

  if (passwordRecovery) return <PasswordResetScreen />;
  if (authLoading) return <LoadingScreen label="Signing you in..." />;

  // 1st Page: If not logged in, display the dedicated Login Page
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
        <main className="flex-1 flex flex-col justify-center items-center">
          <LoginPage />
        </main>
        <footer className="no-print bg-white border-t border-slate-200 text-slate-500 py-4 text-xs text-center px-4">
          {COMPANY_INFO.name} • Industrial Precision Slitting Facility • Shed no. H-11/5,6, Shree Arihant Compound, Kalher, Bhiwandi, Maharashtra - 421302
        </footer>
      </div>
    );
  }

  // Big-screen factory display at /floor (factory logins only).
  if (isFactoryAuthenticated && window.location.pathname.startsWith('/floor')) {
    return dataLoading ? <LoadingScreen label="Loading the floor..." /> : <LiveFloor />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenNotifDrawer={() => setIsNotifDrawerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isFactoryAuthenticated && <LocalImportBanner />}
        {dataLoading ? (
          <div className="py-24 flex flex-col items-center gap-3 text-slate-600">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <p className="text-sm">Loading latest orders...</p>
          </div>
        ) : activeRole === 'factory' && isFactoryAuthenticated ? (
          <FactoryDashboard
            onOpenInwardModal={() => setIsInwardModalOpen(true)}
            onOpenEddModal={(job) => setSelectedJobForEdd(job)}
            onOpenOutputModal={(job) => setSelectedJobForOutput(job)}
            onOpenChallanModal={handleOpenChallan}
            onOpenBundleWeighingModal={(job) => setSelectedJobForBundleWeighing(job)}
            onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
            onOpenPoCloseModal={(job) => setSelectedJobForPoClose(job)}
            onOpenSpecApprovalModal={(job) => setSelectedJobForSpecApproval(job)}
            onOpenFloorSetup={() => setIsFloorSetupOpen(true)}
            onOpenAssignModal={(job) => setSelectedJobForAssign(job)}
          />
        ) : (
          <CustomerPortal
            onOpenInwardModal={() => setIsInwardModalOpen(true)}
            onOpenChallanModal={handleOpenChallan}
          />
        )}
      </main>

      {/* Modals & Drawers */}
      {isInwardModalOpen && (
        <InwardEntryModal
          onClose={() => setIsInwardModalOpen(false)}
          isCustomerPortal={activeRole === 'customer'}
          preselectedCustomerId={activeRole === 'customer' ? (currentCustomer?.id || selectedCustomerId) : undefined}
        />
      )}

      {isCustomerModalOpen && (
        <CustomerManagementModal onClose={() => setIsCustomerModalOpen(false)} />
      )}

      {selectedJobForPoClose && (
        <PoCloseModal
          job={selectedJobForPoClose}
          onClose={() => setSelectedJobForPoClose(null)}
        />
      )}

      {isFloorSetupOpen && <FloorSetupModal onClose={() => setIsFloorSetupOpen(false)} />}

      {selectedJobForAssign && (
        <AssignJobModal
          job={selectedJobForAssign}
          onClose={() => setSelectedJobForAssign(null)}
          onOpenFloorSetup={() => setIsFloorSetupOpen(true)}
        />
      )}

      {selectedJobForSpecApproval && (
        <SpecChangeApprovalModal
          job={selectedJobForSpecApproval}
          onClose={() => setSelectedJobForSpecApproval(null)}
        />
      )}

      {selectedJobForEdd && (
        <EddModal
          job={selectedJobForEdd}
          onClose={() => setSelectedJobForEdd(null)}
        />
      )}

      {selectedJobForOutput && (
        <SlittingOutputModal
          job={selectedJobForOutput}
          onClose={() => setSelectedJobForOutput(null)}
        />
      )}

      {selectedJobForChallan && (
        <DeliveryChallanModal
          job={selectedJobForChallan}
          onClose={() => setSelectedJobForChallan(null)}
        />
      )}

      {selectedJobForBundleWeighing && (
        <BundleWeighingModal
          job={selectedJobForBundleWeighing}
          onClose={() => setSelectedJobForBundleWeighing(null)}
        />
      )}

      {isNotifDrawerOpen && (
        <NotificationsDrawer
          onClose={() => setIsNotifDrawerOpen(false)}
          onSelectJob={(job) => {
            setIsNotifDrawerOpen(false);
            setSelectedJobForEdd(job);
          }}
        />
      )}

      {/* Application Footer (Hidden during printing) */}
      <footer className="no-print bg-slate-900 border-t border-slate-800 text-slate-400 py-6 text-xs mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
              className="font-normal text-slate-200"
            >
              {COMPANY_INFO.name}
            </span>
            <span>•</span>
            <span>{COMPANY_INFO.tagline}</span>
          </div>
          <div className="text-slate-400 text-center sm:text-right">
            Plant: {COMPANY_INFO.address}
            {COMPANY_INFO.phone ? ` • Support: ${COMPANY_INFO.phone}` : ''}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupRequired />;
  return (
    <ProductionProvider>
      <ErrorBoundary>
        <MainAppContent />
      </ErrorBoundary>
      <SyncErrorToast />
    </ProductionProvider>
  );
}
