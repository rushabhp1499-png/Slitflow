import React from 'react';
import { useProduction } from '../context/ProductionContext';
import { COMPANY_INFO } from '../data/mockData';
import {
  Factory,
  Users,
  PackagePlus,
  FolderArchive,
  Bell,
  RotateCcw,
  Sparkles,
  Layers,
  KeyRound,
  LogOut
} from 'lucide-react';

interface NavbarProps {
  onOpenInwardModal: () => void;
  onOpenDriveModal: () => void;
  onOpenNotifDrawer: () => void;
  onOpenCustomerAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenInwardModal,
  onOpenDriveModal,
  onOpenNotifDrawer,
  onOpenCustomerAuthModal,
}) => {
  const {
    activeRole,
    setActiveRole,
    notifications,
    resetToSampleData,
    jobs,
    authenticatedEmail,
    logoutCustomer,
    customers,
    selectedCustomerId,
  } = useProduction();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId);
  
  // Count total challans across all jobs
  const challansCount = jobs.reduce((acc, j) => {
    return acc + (j.challans ? j.challans.length : j.challan ? 1 : 0);
  }, 0);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-20 sm:w-24 bg-white rounded-xl p-1.5 flex items-center justify-center shadow-xs border border-slate-700/80 shrink-0">
              <img
                src="/pe-logo.svg"
                alt="Progressive Enterprises Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
                  className="font-normal text-lg sm:text-xl tracking-normal text-white select-none"
                >
                  Progressive Enterprises
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-medium tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                  Precision Slitting Works
                </span>
              </div>
              <p
                style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}
                className="text-[11px] text-slate-400 font-normal hidden md:block"
              >
                Industrial Slitting, Packaging & Customer Live Delivery Tracker
              </p>
            </div>
          </div>

          {/* Portal Switcher (Factory vs Customer) */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveRole('factory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeRole === 'factory'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Factory Dashboard</span>
              <span className="sm:hidden">Factory</span>
            </button>
            <button
              onClick={() => setActiveRole('customer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeRole === 'customer'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Customer Portal</span>
              <span className="sm:hidden">Customer</span>
            </button>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2">

            {/* Customer Login / Auth badge */}
            {activeRole === 'customer' && (
              authenticatedEmail ? (
                <div className="hidden lg:flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="font-mono text-[11px] text-slate-200 truncate max-w-[140px]">
                    {authenticatedEmail}
                  </span>
                  <button
                    onClick={logoutCustomer}
                    className="text-slate-400 hover:text-red-400 p-0.5 ml-1"
                    title="Sign out of customer session"
                  >
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenCustomerAuthModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
                  title="Customer Login with Email / Code"
                >
                  <KeyRound className="w-3.5 h-3.5 text-blue-400" />
                  <span className="hidden sm:inline">Customer Login</span>
                </button>
              )
            )}

            {/* New Material Inward */}
            <button
              onClick={onOpenInwardModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
              title="Add incoming raw material"
            >
              <PackagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">+ Material Inward</span>
            </button>

            {/* Drive Records Archive */}
            <button
              onClick={onOpenDriveModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
              title="Google Drive delivery challan archives"
            >
              <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Drive Records</span>
              <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono text-[10px]">
                {challansCount}
              </span>
            </button>

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifDrawer}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              title="View production & inward notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {/* Reset / Sample Data */}
            <button
              onClick={() => {
                if (window.confirm('Reset factory orders and records to initial sample data?')) {
                  resetToSampleData();
                }
              }}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition hidden lg:block"
              title="Reset to fresh demo jobs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
