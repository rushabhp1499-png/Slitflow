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
    signedInEmail,
    staffRole,
    staffName,
  } = useProduction();
  const roleLabel =
    staffRole === 'owner' ? 'Top Management' : staffRole === 'developer' ? 'Developer' : 'Production Manager';

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
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b-2 border-blue-600 shadow-md no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* Brand lockup: strips mark straight on charcoal, "Progressive" bold + "Enterprises Global" regular */}
          <div className="flex items-center gap-3 min-w-0">
            <img src="/pe-logo.svg" alt="Progressive Enterprises Global" className="h-8 sm:h-9 w-auto shrink-0" />
            <div className="min-w-0 leading-tight select-none">
              <div className="text-base sm:text-lg text-white truncate">
                <span className="font-bold">Progressive</span> <span className="font-normal">Enterprises Global</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Materials. Converted for Purpose.
                <span className="text-blue-400"> • {activeRole === 'customer' ? 'Customer Portal' : 'Factory Portal'}</span>
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
                      <Factory className="w-3 h-3 text-blue-400" />
                      <span>{staffName && staffName !== signedInEmail ? staffName : roleLabel}</span>
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {staffName && staffName !== signedInEmail ? roleLabel : signedInEmail}
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
