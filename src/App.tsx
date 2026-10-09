import React, { useState, useEffect } from 'react';
import { ProductionProvider, useProduction } from './context/ProductionContext';
import { Navbar } from './components/Navbar';
import { FactoryDashboard } from './components/FactoryDashboard';
import { CustomerPortal } from './components/CustomerPortal';
import { InwardEntryModal } from './components/InwardEntryModal';
import { EddModal } from './components/EddModal';
import { SlittingOutputModal } from './components/SlittingOutputModal';
import { DeliveryChallanModal } from './components/DeliveryChallanModal';
import { BundleWeighingModal } from './components/BundleWeighingModal';
import { DriveRecordsModal } from './components/DriveRecordsModal';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerManagementModal } from './components/CustomerManagementModal';
import { PoCloseModal } from './components/PoCloseModal';
import { MaterialInward } from './types';
import { COMPANY_INFO } from './data/mockData';

function MainAppContent() {
  const {
    activeRole,
    setActiveRole,
    loginCustomerByEmail,
    loginCustomerByAccessCode,
  } = useProduction();

  // Modals state
  const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

  const [selectedJobForEdd, setSelectedJobForEdd] = useState<MaterialInward | null>(null);
  const [selectedJobForOutput, setSelectedJobForOutput] = useState<MaterialInward | null>(null);
  const [selectedJobForChallan, setSelectedJobForChallan] = useState<MaterialInward | null>(null);
  const [selectedJobForBundleWeighing, setSelectedJobForBundleWeighing] = useState<MaterialInward | null>(null);
  const [selectedJobForPoClose, setSelectedJobForPoClose] = useState<MaterialInward | null>(null);

  // Auto-login if URL has ?track=CODE or ?email=...
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const trackCode = params.get('track');
      const emailParam = params.get('email');

      if (trackCode) {
        const found = loginCustomerByAccessCode(trackCode);
        if (found) {
          setActiveRole('customer');
        }
      } else if (emailParam) {
        const found = loginCustomerByEmail(emailParam);
        if (found) {
          setActiveRole('customer');
        }
      }
    } catch (e) {
      // Ignored in non-browser context
    }
  }, [loginCustomerByAccessCode, loginCustomerByEmail, setActiveRole]);

  const handleOpenChallan = (job: MaterialInward) => {
    setSelectedJobForChallan(job);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onOpenInwardModal={() => setIsInwardModalOpen(true)}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        onOpenNotifDrawer={() => setIsNotifDrawerOpen(true)}
        onOpenCustomerAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeRole === 'factory' ? (
          <FactoryDashboard
            onOpenInwardModal={() => setIsInwardModalOpen(true)}
            onOpenEddModal={(job) => setSelectedJobForEdd(job)}
            onOpenOutputModal={(job) => setSelectedJobForOutput(job)}
            onOpenChallanModal={handleOpenChallan}
            onOpenBundleWeighingModal={(job) => setSelectedJobForBundleWeighing(job)}
            onOpenCustomerModal={() => setIsCustomerModalOpen(true)}
            onOpenPoCloseModal={(job) => setSelectedJobForPoClose(job)}
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
        />
      )}

      {isAuthModalOpen && (
        <CustomerAuthModal onClose={() => setIsAuthModalOpen(false)} />
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

      {isDriveModalOpen && (
        <DriveRecordsModal
          onClose={() => setIsDriveModalOpen(false)}
          onOpenChallan={(job) => {
            setIsDriveModalOpen(false);
            setSelectedJobForChallan(job);
          }}
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
            <span className="font-bold text-slate-200">{COMPANY_INFO.name}</span>
            <span>•</span>
            <span>{COMPANY_INFO.isoCert}</span>
          </div>
          <div className="text-slate-400 text-center sm:text-right">
            Plant: Plot 42-45, Phase II, Sector 58, Pimpri MIDC, Pune • Support: {COMPANY_INFO.phone.split('/')[0]}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ProductionProvider>
      <MainAppContent />
    </ProductionProvider>
  );
}
