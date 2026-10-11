import React from 'react';
import { useProduction } from '../context/ProductionContext';
import {
  Bell,
  LogOut,
  Building2,
  ShieldCheck,
  Factory
} from 'lucide-react';

interface NavbarProps {
  onOpenNotifDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNotifDrawer,
}) => {
  const {
    activeRole,
    notifications,
    authenticatedEmail,
    isFactoryAuthenticated,
    logoutCustomer,
    logoutFactory,
    customers,
    selectedCustomerId,
    currentCustomer: contextCustomer,
  } = useProduction();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const currentCustomer =
    contextCustomer ||
    (authenticatedEmail &&
      customers.find(
        (c) =>
          c.authorizedEmails.some(
            (ae) => ae.toLowerCase() === authenticatedEmail.trim().toLowerCase()
          ) || c.email.trim().toLowerCase() === authenticatedEmail.trim().toLowerCase()
      )) ||
    (selectedCustomerId && customers.find((c) => c.id === selectedCustomerId)) ||
    null;

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand Logo & Name (Helvetica, font-normal) */}
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

          {/* Right Action Tools: Role-Specific Authentication & Sign Out */}
          <div className="flex items-center gap-2.5">

            {/* Factory Mode: Authorized Management Badge & Sign Out */}
            {activeRole === 'factory' && isFactoryAuthenticated && (
              <>
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200 flex items-center gap-1 text-[11px]">
                      <Factory className="w-3 h-3 text-amber-400" />
                      <span>Factory Admin</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      progressive.ent8@gmail.com
                    </span>
                  </div>
                </div>

                {/* Notifications Bell */}
                <button
                  type="button"
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

                {/* Factory Sign Out */}
                <button
                  type="button"
                  onClick={logoutFactory}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/80 rounded-xl text-xs font-semibold transition"
                  title="Lock Factory Dashboard & Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            )}

            {/* Customer Mode: Isolated Company Badge & Sign Out (No Factory Access) */}
            {activeRole === 'customer' && authenticatedEmail && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <div className="flex flex-col min-w-0 max-w-[180px] sm:max-w-[260px]">
                    <span className="font-bold text-slate-100 truncate text-[11px] flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-blue-400 shrink-0" />
                      <span className="truncate">{currentCustomer?.companyName || currentCustomer?.name || 'Customer Account'}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400 truncate">
                      {authenticatedEmail}
                    </span>
                  </div>
                </div>

                {/* Customer Sign Out */}
                <button
                  type="button"
                  onClick={logoutCustomer}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-800/80 rounded-xl text-xs font-semibold transition"
                  title="Sign out of customer portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};
