import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward, ProductionStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Scissors,
  PackageCheck,
  Truck,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Scale,
  Layers,
  ArrowRight,
  ExternalLink,
  Plus,
  Users,
  Lock,
  Unlock,
  Mail,
  Building2,
  Share2,
  Package,
  ShieldCheck,
  UserCheck,
  KeyRound,
  LogOut,
  Factory
} from 'lucide-react';

interface FactoryDashboardProps {
  onOpenInwardModal: () => void;
  onOpenEddModal: (job: MaterialInward) => void;
  onOpenOutputModal: (job: MaterialInward) => void;
  onOpenChallanModal: (job: MaterialInward) => void;
  onOpenBundleWeighingModal: (job: MaterialInward) => void;
  onOpenCustomerModal?: () => void;
  onOpenPoCloseModal?: (job: MaterialInward) => void;
}

export const FactoryDashboard: React.FC<FactoryDashboardProps> = ({
  onOpenInwardModal,
  onOpenEddModal,
  onOpenOutputModal,
  onOpenChallanModal,
  onOpenBundleWeighingModal,
  onOpenCustomerModal,
  onOpenPoCloseModal,
}) => {
  const {
    jobs,
    customers,
    updateJobStatus,
    factoryUsers,
    activeFactoryUser,
    loginFactoryUser,
    logoutFactoryUser,
    reopenCustomerPo,
  } = useProduction();

  const [staffPinInput, setStaffPinInput] = useState('');
  const [staffAuthError, setStaffAuthError] = useState('');

  const handlePinLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffAuthError('');
    if (!staffPinInput.trim()) return;

    const ok = loginFactoryUser(staffPinInput.trim());
    if (!ok) {
      setStaffAuthError(
        `Access Denied: PIN or Badge "${staffPinInput}" is not recognized. Please choose from the 4 authorized factory personnel below.`
      );
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Helper predicates for status categories
  const isJobClosed = (j: MaterialInward) =>
    j.poStatus === 'closed' ||
    j.status === 'po_closed';

  const isJobInQueue = (j: MaterialInward) =>
    (j.status === 'received' || j.status === 'pending_production') && !isJobClosed(j);

  const isJobUnderSlitting = (j: MaterialInward) =>
    (j.status === 'in_production' || (j.status === 'partially_dispatched' && (j.remainingWeightKg || 0) > 0)) && !isJobClosed(j);

  const isJobReadyDispatch = (j: MaterialInward) =>
    (j.status === 'slitting_completed' ||
     j.status === 'ready_for_dispatch' ||
     (j.bundles && j.bundles.some(b => b.status === 'ready')) ||
     (j.status === 'partially_dispatched' && (j.remainingWeightKg || 0) > 0)) && !isJobClosed(j);

  // Metrics calculation
  const totalInwardCount = jobs.length;
  const pendingEddCount = jobs.filter((j) => !j.estimatedDeliveryDate && !isJobClosed(j)).length;
  const notTakenCount = jobs.filter(isJobInQueue).length;
  const inProductionCount = jobs.filter(isJobUnderSlitting).length;
  const readyDispatchCount = jobs.filter(isJobReadyDispatch).length;
  const closedPoCount = jobs.filter(isJobClosed).length;

  const totalIncomingWeight = jobs.reduce((acc, j) => acc + j.incomingWeight, 0);

  // Filtered jobs list
  const filteredJobs = jobs.filter((job) => {
    const customer = customers.find((c) => c.id === job.customerId);
    const matchesSearch =
      job.jobNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.customerPoNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.inwardChallanNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer?.email || '').toLowerCase().includes(searchQuery.toLowerCase());

    const isClosed = isJobClosed(job);

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'IN_QUEUE'
        ? isJobInQueue(job)
        : statusFilter === 'UNDER_SLITTING'
        ? isJobUnderSlitting(job)
        : statusFilter === 'READY_DISPATCH'
        ? isJobReadyDispatch(job)
        : statusFilter === 'NEEDS_EDD'
        ? !job.estimatedDeliveryDate && !isClosed
        : statusFilter === 'PO_CLOSED'
        ? isClosed
        : job.status === statusFilter;

    const matchesCustomer =
      customerFilter === 'ALL' || job.customerId === customerFilter;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const getDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // If no factory user is logged in, show the 4-person Factory Terminal Gate
  if (!activeFactoryUser) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-4 animate-in fade-in duration-200">
        {/* Terminal Header */}
        <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Factory className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-white">
                  Factory Operations Terminal
                </h1>
                <p className="text-xs text-slate-400">
                  Progressive Enterprises • Precision Slitting & Works Management
                </p>
              </div>
            </div>
            <div className="inline-flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Restricted: 4 Authorized Factory Personnel</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
            Select your factory profile below or enter your 4-digit Factory PIN / Badge ID to enter and operate the plant dashboard.
          </div>
        </div>

        {/* Error Alert */}
        {staffAuthError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Access Denied</span>
              <p>{staffAuthError}</p>
            </div>
          </div>
        )}

        {/* PIN Entry Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <form onSubmit={handlePinLogin} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Enter 4-Digit PIN (e.g. 1001, 1002, 1003, 1004) or Badge ID"
                value={staffPinInput}
                onChange={(e) => setStaffPinInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              <span>Verify & Open Terminal</span>
            </button>
          </form>
        </div>

        {/* 4 Authorized Factory Staff Profiles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs uppercase font-bold tracking-wider text-slate-500">
              Authorized Factory Accounts ({factoryUsers.length} Floor Personnel):
            </h2>
            <span className="text-[11px] text-slate-400">Click any card for 1-click access</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {factoryUsers.map((user) => (
              <div
                key={user.id}
                className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-2xs hover:shadow-md transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-base text-slate-800 group-hover:bg-blue-50 group-hover:text-blue-700 group-hover:border-blue-200 transition">
                        {user.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700 transition">
                          {user.name}
                        </h3>
                        <p className="text-xs font-semibold text-blue-600">
                          {user.role}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      PIN: {user.pin}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-1 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Badge ID:</span>
                      <span className="font-mono font-bold text-slate-800">{user.badgeCode}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Department:</span>
                      <span className="font-medium text-slate-700">{user.department}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-mono text-[11px] text-slate-600">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-mono text-[11px] text-slate-600">{user.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => loginFactoryUser(user.id)}
                    className="w-full py-2.5 bg-slate-900 hover:bg-blue-600 group-hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Open Dashboard as {user.name}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Factory Operator Top Status Banner */}
      <div className="bg-slate-900 text-white border border-slate-800 rounded-xl p-3 sm:p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
            {activeFactoryUser.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm text-white">
                {activeFactoryUser.name}
              </span>
              <span className="text-[10px] uppercase font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                {activeFactoryUser.role}
              </span>
              <span className="font-mono text-[11px] text-slate-400">
                Badge: {activeFactoryUser.badgeCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Department: {activeFactoryUser.department} • {activeFactoryUser.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Customer Master / Register Customer Details & Email IDs */}
          {onOpenCustomerModal && (
            <button
              type="button"
              onClick={onOpenCustomerModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition"
              title="Register Customer Details & Authorized Email IDs into Machine"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Customer Master & Emails</span>
            </button>
          )}

          {/* New Material Inward */}
          <button
            type="button"
            onClick={onOpenInwardModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            title="Create Incoming Raw Material Inward"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Material Inward</span>
          </button>

          {/* Switch Factory Staff / Log Out */}
          <button
            type="button"
            onClick={logoutFactoryUser}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border border-slate-700 hover:border-red-700 rounded-lg text-xs font-bold transition"
            title="Switch staff member or sign out of factory terminal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Staff</span>
          </button>
        </div>
      </div>
      
      {/* Top Banner & KPI Stat Cards - Clickable Interactive Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Inward Button */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('ALL');
            setSearchQuery('');
            setCustomerFilter('ALL');
          }}
          className={`text-left rounded-xl p-3.5 shadow-2xs border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/70'
          }`}
          title="Click to view all inward orders and clear any active filters"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'ALL' ? 'text-blue-900' : 'text-slate-600'
            }`}>
              Total Inward
            </span>
            <span className={`p-1.5 rounded-lg ${
              statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'
            }`}>
              <Layers className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{totalInwardCount}</span>
            <span className="text-xs text-slate-500">{(totalIncomingWeight / 1000).toFixed(1)} MT</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-slate-400">All raw entries</p>
            {statusFilter === 'ALL' && (
              <span className="text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded">
                Active
              </span>
            )}
          </div>
        </button>

        {/* In Queue Button */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'IN_QUEUE' ? 'ALL' : 'IN_QUEUE')}
          className={`text-left rounded-xl p-3.5 shadow-2xs border transition-all cursor-pointer ${
            statusFilter === 'IN_QUEUE'
              ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-slate-50/70'
          }`}
          title="Click to filter orders in queue awaiting production"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'IN_QUEUE' ? 'text-amber-900' : 'text-slate-600'
            }`}>
              In Queue
            </span>
            <span className={`p-1.5 rounded-lg ${
              statusFilter === 'IN_QUEUE' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-800">{notTakenCount}</span>
            {pendingEddCount > 0 && (
              <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 py-0.2 rounded">
                {pendingEddCount} No EDD
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-slate-400">Awaiting blade slotting</p>
            {statusFilter === 'IN_QUEUE' && (
              <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
                Filtered
              </span>
            )}
          </div>
        </button>

        {/* Under Slitting (Live) Button */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'UNDER_SLITTING' ? 'ALL' : 'UNDER_SLITTING')}
          className={`text-left rounded-xl p-3.5 shadow-2xs border transition-all cursor-pointer ${
            statusFilter === 'UNDER_SLITTING'
              ? 'bg-blue-100/70 border-blue-400 ring-2 ring-blue-500 shadow-sm'
              : 'bg-white border-blue-200 hover:border-blue-400 bg-gradient-to-br from-white to-blue-50/40'
          }`}
          title="Click to filter orders currently under slitting"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'UNDER_SLITTING' ? 'text-blue-950' : 'text-blue-900'
            }`}>
              Under Slitting
            </span>
            <span className={`p-1.5 rounded-lg ${
              statusFilter === 'UNDER_SLITTING' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 animate-pulse'
            }`}>
              <Scissors className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-blue-700">{inProductionCount}</span>
            <span className="text-xs text-blue-600 font-medium">Active</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-blue-500">Live on machines</p>
            {statusFilter === 'UNDER_SLITTING' && (
              <span className="text-[9px] font-bold bg-blue-200 text-blue-900 px-1.5 py-0.2 rounded">
                Filtered
              </span>
            )}
          </div>
        </button>

        {/* Ready for Dispatch Button */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'READY_DISPATCH' ? 'ALL' : 'READY_DISPATCH')}
          className={`text-left rounded-xl p-3.5 shadow-2xs border transition-all cursor-pointer ${
            statusFilter === 'READY_DISPATCH'
              ? 'bg-emerald-100/70 border-emerald-400 ring-2 ring-emerald-500 shadow-sm'
              : 'bg-white border-emerald-200 hover:border-emerald-400 bg-gradient-to-br from-white to-emerald-50/40'
          }`}
          title="Click to filter orders slitted & ready for dispatch"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'READY_DISPATCH' ? 'text-emerald-950' : 'text-emerald-900'
            }`}>
              Ready Dispatch
            </span>
            <span className={`p-1.5 rounded-lg ${
              statusFilter === 'READY_DISPATCH' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>
              <PackageCheck className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-700">{readyDispatchCount}</span>
            <span className="text-xs text-emerald-600 font-medium">Packed</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-emerald-600">Bundled on scale</p>
            {statusFilter === 'READY_DISPATCH' && (
              <span className="text-[9px] font-bold bg-emerald-200 text-emerald-900 px-1.5 py-0.2 rounded">
                Filtered
              </span>
            )}
          </div>
        </button>

        {/* Permanently Closed POs Button */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'PO_CLOSED' ? 'ALL' : 'PO_CLOSED')}
          className={`text-left rounded-xl p-3.5 shadow-2xs border transition-all cursor-pointer ${
            statusFilter === 'PO_CLOSED'
              ? 'bg-red-50/90 border-red-400 ring-2 ring-red-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-red-300 hover:bg-red-50/30'
          }`}
          title="Click to filter permanently closed and audited purchase orders"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              statusFilter === 'PO_CLOSED' ? 'text-red-900' : 'text-slate-600'
            }`}>
              Closed POs
            </span>
            <span className={`p-1.5 rounded-lg ${
              statusFilter === 'PO_CLOSED' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'
            }`}>
              <Lock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{closedPoCount}</span>
            <span className="text-xs text-slate-500 font-medium">Audited</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-[10px] text-slate-400">Reconciled POs</p>
            {statusFilter === 'PO_CLOSED' && (
              <span className="text-[9px] font-bold bg-red-200 text-red-900 px-1.5 py-0.2 rounded">
                Filtered
              </span>
            )}
          </div>
        </button>

      </div>

      {/* Primary Actions & Customer Directory Access */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search PO #, Job, Customer, Grade, Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Stages ({jobs.length})</option>
              <option value="IN_QUEUE">⏳ In Queue / Pending ({notTakenCount})</option>
              <option value="UNDER_SLITTING">✂️ Under Slitting ({inProductionCount})</option>
              <option value="READY_DISPATCH">📦 Ready for Dispatch ({readyDispatchCount})</option>
              <option value="NEEDS_EDD">⚠️ Needs Delivery Date ({pendingEddCount})</option>
              <option value="received">Material Received</option>
              <option value="pending_production">Pending Production</option>
              <option value="in_production">In Production</option>
              <option value="slitting_completed">Slitting Completed</option>
              <option value="ready_for_dispatch">Ready for Dispatch</option>
              <option value="PO_CLOSED">🔒 Permanently Closed POs ({closedPoCount})</option>
            </select>

            {statusFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                title="Reset status filter to show all"
              >
                <span>Clear Filter</span>
                <span className="font-bold">✕</span>
              </button>
            )}

            {/* Customer Filter */}
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 max-w-[180px] truncate"
            >
              <option value="ALL">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName || c.name}
                </option>
              ))}
            </select>

            {/* Customer Master & Email Grants Modal Trigger */}
            <button
              type="button"
              onClick={onOpenCustomerModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition"
              title="Manage customer registered addresses and authorize multiple email IDs"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer Master & Emails</span>
              <span className="bg-blue-600 text-white text-[10px] font-mono px-1.5 py-0.2 rounded-full">
                {customers.length}
              </span>
            </button>

            {/* Inward Button */}
            <button
              type="button"
              onClick={onOpenInwardModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inward Entry</span>
            </button>

          </div>
        </div>

        {/* Quick Filter Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-slate-100">
          <span className="text-slate-400 font-medium">Quick Views:</span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All Jobs ({jobs.length})
          </button>
          <button
            onClick={() => setStatusFilter('IN_QUEUE')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
              statusFilter === 'IN_QUEUE'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800'
            }`}
          >
            ⏳ In Queue ({notTakenCount})
          </button>
          <button
            onClick={() => setStatusFilter('UNDER_SLITTING')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
              statusFilter === 'UNDER_SLITTING'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800'
            }`}
          >
            ✂️ Under Slitting ({inProductionCount})
          </button>
          <button
            onClick={() => setStatusFilter('READY_DISPATCH')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
              statusFilter === 'READY_DISPATCH'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
            }`}
          >
            📦 Ready for Dispatch ({readyDispatchCount})
          </button>
          <button
            onClick={() => setStatusFilter('PO_CLOSED')}
            className={`px-2 py-0.5 rounded-md text-xs font-medium transition ${
              statusFilter === 'PO_CLOSED'
                ? 'bg-red-700 text-white font-bold'
                : 'bg-red-50 hover:bg-red-100 text-red-800'
            }`}
          >
            🔒 Permanently Closed ({closedPoCount})
          </button>
        </div>
      </div>

      {/* Active Filter Notification Bar */}
      {statusFilter !== 'ALL' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
            <span className="text-xs font-bold text-blue-900">
              Active Dashboard Filter:
            </span>
            <span className="text-xs font-black uppercase tracking-wide bg-blue-200/80 text-blue-950 px-2 py-0.5 rounded">
              {statusFilter === 'IN_QUEUE'
                ? '⏳ In Queue (Awaiting Slitting)'
                : statusFilter === 'UNDER_SLITTING'
                ? '✂️ Under Slitting / Live on Floor'
                : statusFilter === 'READY_DISPATCH'
                ? '📦 Ready for Dispatch'
                : statusFilter === 'PO_CLOSED'
                ? '🔒 Closed & Reconciled POs'
                : statusFilter}
            </span>
            <span className="text-xs text-blue-700 font-medium">
              (Showing {filteredJobs.length} of {jobs.length} jobs)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setSearchQuery('');
              setCustomerFilter('ALL');
            }}
            className="text-xs font-bold text-blue-800 hover:text-blue-950 underline hover:no-underline flex items-center gap-1"
          >
            <span>Show All Inward Orders</span>
            <span>✕</span>
          </button>
        </div>
      )}

      {/* Jobs Master Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Job & PO #</th>
                <th className="py-3 px-4">Customer & Registered Info</th>
                <th className="py-3 px-4">Raw Material & Packaging Specs</th>
                <th className="py-3 px-4">Live Stage & Dispatches</th>
                <th className="py-3 px-4">Estimated Delivery (EDD)</th>
                <th className="py-3 px-4 text-right">Factory Operations</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold text-slate-600">No production entries match criteria</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting filters or search query.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const daysLeft = getDaysRemaining(job.estimatedDeliveryDate);
                  const isExpanded = expandedJobId === job.id;
                  const customer = customers.find((c) => c.id === job.customerId);
                  const isPermanentlyClosed =
                    job.poStatus === 'closed' ||
                    job.poStatus === 'permanently_closed' ||
                    job.status === 'po_closed';
                  const dispatchedWeight = job.dispatchedWeightKg || 0;
                  const remainingWeight = Math.max(0, job.incomingWeight - dispatchedWeight);
                  const challanCount = job.challans?.length || (job.challan ? 1 : 0);

                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition ${
                          isExpanded ? 'bg-blue-50/30' : ''
                        } ${isPermanentlyClosed ? 'bg-slate-50/40' : ''}`}
                      >
                        {/* Job & PO Reference */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                              className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
                              title="Toggle full customer, bundling, and challan details"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <span className="font-mono font-bold text-slate-900">{job.jobNo}</span>
                          </div>
                          
                          <div className="text-[11px] font-mono text-blue-700 font-bold mt-1">
                            PO #{job.customerPoNo}
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Inward: {job.inwardChallanNo}
                          </div>

                          {isPermanentlyClosed ? (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-slate-900 text-slate-100 font-bold px-1.5 py-0.2 rounded mt-1">
                              <Lock className="w-2.5 h-2.5 text-red-400" /> PO Closed
                            </span>
                          ) : dispatchedWeight > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded mt-1">
                              ⚡ Partial Dispatched
                            </span>
                          ) : null}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 align-top max-w-[220px]">
                          <div className="font-bold text-slate-900 line-clamp-1">{job.customerName}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            GST: {job.customerGst}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={customer?.registeredAddress}>
                            {customer?.registeredAddress || job.customerAddress}
                          </div>
                          <div className="text-[10px] text-blue-600 font-medium flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3 text-blue-500 shrink-0" />
                            <span className="truncate">{customer?.authorizedEmails?.length || 1} Email IDs Granted</span>
                          </div>
                        </td>

                        {/* Incoming Material & Packaging Specs */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-slate-900">{job.grade}</div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {job.thickness} {job.thicknessUnit} × {job.incomingWidth} mm
                          </div>
                          <div className="text-xs font-bold text-blue-900 mt-0.5">
                            {job.incomingWeight.toLocaleString()} kg{' '}
                            <span className="font-normal text-slate-400 text-[10px]">
                              ({job.coilsOrRollsCount} coil{job.coilsOrRollsCount > 1 ? 's' : ''})
                            </span>
                          </div>

                          {/* Bundle specs */}
                          {job.bundleSpecs && (
                            <div className="text-[10px] text-purple-900 font-medium bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 mt-1 inline-block">
                              ~{job.bundleSpecs.targetBundleWeightKg || 28}kg/bundle • {job.bundleSpecs.unitsPerBundle} {job.bundleSpecs.unitType}
                            </div>
                          )}
                        </td>

                        {/* Production Status & Dispatches */}
                        <td className="py-3.5 px-4 align-top">
                          <StatusBadge status={job.status} />

                          {/* Dispatched Weight vs Balance */}
                          {dispatchedWeight > 0 && (
                            <div className="mt-1.5 space-y-0.5 text-[11px]">
                              <div className="text-emerald-800 font-bold">
                                Dispatched: {dispatchedWeight.toLocaleString()} kg
                              </div>
                              <div className="text-slate-500 font-medium">
                                Balance: <strong className="text-slate-800">{remainingWeight.toLocaleString()} kg</strong>
                              </div>
                            </div>
                          )}

                          {/* Quick stage toggle buttons */}
                          {!isPermanentlyClosed && (
                            <div className="mt-2 flex items-center gap-1">
                              {job.status === 'received' && (
                                <button
                                  onClick={() => updateJobStatus(job.id, 'pending_production', 'Moved to production queue')}
                                  className="text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300"
                                >
                                  Queue
                                </button>
                              )}

                              {(job.status === 'received' || job.status === 'pending_production') && (
                                <button
                                  onClick={() => updateJobStatus(job.id, 'in_production', 'Mounted on slitter machine')}
                                  className="text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200"
                                >
                                  Start Slit
                                </button>
                              )}

                              {job.status === 'in_production' && (
                                <button
                                  onClick={() => onOpenOutputModal(job)}
                                  className="text-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded border border-purple-200 flex items-center gap-1"
                                >
                                  <Scissors className="w-2.5 h-2.5" />
                                  Record Output
                                </button>
                              )}

                              {job.status === 'slitting_completed' && (
                                <button
                                  onClick={() => updateJobStatus(job.id, 'ready_for_dispatch', 'Packing completed')}
                                  className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                                >
                                  Mark Ready
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Estimated Delivery Date (EDD) */}
                        <td className="py-3.5 px-4 align-top">
                          {job.estimatedDeliveryDate ? (
                            <div>
                              <div className="flex items-center gap-1 font-bold text-slate-800">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                <span>{job.estimatedDeliveryDate}</span>
                              </div>

                              {daysLeft !== null && (
                                <div className="mt-1">
                                  {daysLeft < 0 ? (
                                    <span className="text-[10px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                                      Overdue by {Math.abs(daysLeft)} days
                                    </span>
                                  ) : daysLeft === 0 ? (
                                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                                      Due Today!
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-blue-50 text-blue-700 font-medium px-1.5 py-0.5 rounded border border-blue-200">
                                      In {daysLeft} day{daysLeft > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              )}

                              {!isPermanentlyClosed && (
                                <button
                                  onClick={() => onOpenEddModal(job)}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline mt-1 block"
                                >
                                  Change Date
                                </button>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Date Not Set
                              </span>
                              {!isPermanentlyClosed && (
                                <button
                                  onClick={() => onOpenEddModal(job)}
                                  className="mt-1.5 block text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-md transition"
                                >
                                  Set Date
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Factory Operations: Output, Challan, Partial Dispatch & PO Close */}
                        <td className="py-3.5 px-4 align-top text-right space-y-1.5">
                          
                          {/* Output Slitting Entry (Only shown when not yet recorded; Edit Slit Output removed per user request) */}
                          {!isPermanentlyClosed && (
                            <div className="flex flex-col gap-1 items-end">
                              {!job.outputDetails && (
                                <button
                                  onClick={() => onOpenOutputModal(job)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition"
                                  title="Record slitting cut widths, bundle packaging, and scrap"
                                >
                                  <Scissors className="w-3 h-3" />
                                  <span>Slit & Pack</span>
                                </button>
                              )}

                              {/* Floor Bundle Weighing Scale Dialog */}
                              <button
                                onClick={() => onOpenBundleWeighingModal(job)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition"
                                title="Floor Weighing Scale dialog: record bundles, auto tare deduction"
                              >
                                <Scale className="w-3 h-3 text-blue-600" />
                                <span>Weigh Scale ({job.bundles?.length || 0})</span>
                              </button>
                            </div>
                          )}

                          {/* Delivery Challan / Partial Dispatch Button - Always Operable */}
                          <div>
                            {challanCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => onOpenChallanModal(job)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg transition shadow-xs cursor-pointer"
                                title="View official printable delivery challan(s) or generate new partial challan"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{challanCount} Challan{challanCount > 1 ? 's' : ''} (View / +New)</span>
                              </button>
                            ) : (
                              /* Allow generating challan for any inward order */
                              <button
                                type="button"
                                onClick={() => onOpenChallanModal(job)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer ${
                                  job.status === 'in_production'
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : job.status === 'ready_for_dispatch' || job.status === 'slitting_completed'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                                title={
                                  job.status === 'in_production'
                                    ? 'Issue Urgent Partial Delivery Challan with Bundle Selection'
                                    : 'Generate official delivery challan with 50g least count and bundle checklist'
                                }
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>{job.status === 'in_production' ? '⚡ Urgent Partial' : 'Make Challan'}</span>
                              </button>
                            )}
                          </div>

                          {/* Close PO / Reopen PO Button - Fixed and always accessible */}
                          <div>
                            {isPermanentlyClosed ? (
                              <div className="inline-flex items-center gap-1">
                                <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                  <Lock className="w-2.5 h-2.5 text-red-500" />
                                  Closed
                                </span>
                                <button
                                  type="button"
                                  onClick={() => reopenCustomerPo(job.id)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition"
                                  title="Reopen PO for production or billing adjustments"
                                >
                                  <Unlock className="w-2.5 h-2.5 text-amber-600" />
                                  <span>Reopen</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onOpenPoCloseModal) {
                                    onOpenPoCloseModal(job);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition"
                                title="Close customer PO and finalize order"
                              >
                                <Lock className="w-3 h-3 text-red-600" />
                                <span>Close PO</span>
                              </button>
                            )}
                          </div>

                        </td>
                      </tr>

                      {/* Expandable Technical Detail Row */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-slate-200">
                          <td colSpan={6} className="p-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-4">
                              
                              {/* Customer Registered Details & Multiple Authorized Email IDs */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                                <div>
                                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1">
                                    Customer Registered Address & Consignee Works:
                                  </span>
                                  <p className="text-slate-700 leading-snug">
                                    <strong>Registered Office:</strong> {customer?.registeredAddress || job.customerAddress}
                                  </p>
                                  <p className="text-slate-700 leading-snug mt-1">
                                    <strong>Plant Unloading:</strong> {customer?.plantAddress || job.customerAddress}
                                  </p>
                                </div>

                                <div>
                                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1">
                                    Authorized Login & Live Tracking Email IDs:
                                  </span>
                                  <div className="space-y-1">
                                    {(customer?.authorizedEmails || [job.customerEmail]).map((em) => (
                                      <div key={em} className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        <span>{em}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-2 text-[10px] text-blue-700 font-mono">
                                    Customer Access Code: <strong>{customer?.accessCode}</strong>
                                  </div>
                                </div>
                              </div>

                              {/* Customer Instructions & Bundle Specifications */}
                              <div>
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                                  Customer Instructions & Packaging Specifications
                                </h4>
                                <div className="text-xs text-slate-700 bg-amber-50/70 border border-amber-200 p-2.5 rounded-lg leading-relaxed font-medium">
                                  {job.customerInstructions}
                                  {job.bundleSpecs && (
                                    <div className="mt-2 pt-2 border-t border-amber-200/80 font-bold text-purple-950">
                                      Packaging Requirement: Each bundle approx {job.bundleSpecs.targetBundleWeightKg || '25-30'} kg max • {job.bundleSpecs.unitsPerBundle} {job.bundleSpecs.unitType} per bundle.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Output Slitting Breakdown if recorded */}
                              {job.outputDetails ? (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                      <Scissors className="w-3.5 h-3.5 text-purple-600" />
                                      Executed Slitting & Bundling Details
                                    </h4>
                                    <span className="text-xs font-bold text-emerald-700">
                                      Yield: {job.outputDetails.yieldPercentage}% • Output Wt: {job.outputDetails.totalFinishedWeightKg.toLocaleString()} kg
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs bg-purple-50/40 border border-purple-200 p-3 rounded-lg mb-2">
                                    <div>
                                      <span className="text-slate-500 block">Slit Widths:</span>
                                      <span className="font-bold text-slate-800">
                                        {job.outputDetails.slitCuts.map((c) => `${c.widthMm}mm (${c.numberOfCuts} cuts)`).join(', ')}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Total Bundles:</span>
                                      <span className="font-bold text-slate-800">
                                        {job.outputDetails.totalBundles} {job.outputDetails.packagingType}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Units per Bundle:</span>
                                      <span className="font-bold text-slate-800">
                                        {job.outputDetails.reelsOrReamsPerBundle} reels / reams per bundle
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-500 block">Scrap / Trim Loss:</span>
                                      <span className="font-bold text-slate-800">
                                        {job.outputDetails.scrapWeightKg.toLocaleString()} kg
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Floor Weighing Scale Ledger */}
                              <div className="border-t border-slate-200 pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                    <Scale className="w-3.5 h-3.5 text-blue-600" />
                                    Floor Scale Bundle Ledger ({job.bundles?.length || 0} Bundles Logged)
                                  </h4>
                                  {!isPermanentlyClosed && (
                                    <button
                                      type="button"
                                      onClick={() => onOpenBundleWeighingModal(job)}
                                      className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded transition flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      Open Weighing Dialog
                                    </button>
                                  )}
                                </div>

                                {job.bundles && job.bundles.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {job.bundles.slice(0, 6).map((b) => (
                                      <div
                                        key={b.id}
                                        className="p-2 bg-slate-50 border border-slate-200 rounded text-xs flex justify-between items-center"
                                      >
                                        <div>
                                          <span className="font-mono font-bold text-blue-900">{b.bundleTag}</span>
                                          <span className="text-[10px] text-slate-500 block">{b.rollsSummary}</span>
                                          <span className="text-[9px] text-slate-400">
                                            {b.coreType === 'paper_core' ? 'Paper (Tare -' + b.paperCoreTareWeightKg.toFixed(2) + 'kg)' : 'PVC Core'}
                                          </span>
                                        </div>
                                        <div className="text-right font-mono">
                                          <span className="font-black text-slate-900">{b.netWeightKg.toFixed(2)} kg</span>
                                          <span className="text-[9px] text-slate-400 block">Gross: {b.grossWeightKg.toFixed(2)}kg</span>
                                          <span
                                            className={`text-[9px] font-semibold px-1 py-0.2 rounded inline-block mt-0.5 ${
                                              b.status === 'dispatched'
                                                ? 'bg-slate-200 text-slate-700'
                                                : 'bg-emerald-100 text-emerald-800'
                                            }`}
                                          >
                                            {b.status === 'dispatched' ? 'Dispatched' : 'Ready'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                    {job.bundles.length > 6 && (
                                      <div
                                        onClick={() => onOpenBundleWeighingModal(job)}
                                        className="p-2 bg-blue-50/50 hover:bg-blue-100 border border-blue-200 rounded text-xs flex items-center justify-center font-bold text-blue-700 cursor-pointer transition"
                                      >
                                        +{job.bundles.length - 6} more bundles in ledger →
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500 italic bg-slate-50 p-2.5 rounded border border-slate-200">
                                    No individual bundles weighed on floor scale yet. Click &quot;Open Weighing Dialog&quot; to log 50-60 bundle entries with tare rules.
                                  </p>
                                )}
                              </div>

                              {/* Dispatched Delivery Challans History */}
                              {challanCount > 0 && (
                                <div className="border-t border-slate-200 pt-3 space-y-2">
                                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
                                    Issued Delivery Challans ({challanCount}):
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(job.challans || [job.challan!]).map((ch, idx) => (
                                      <div
                                        key={ch.id}
                                        onClick={() => onOpenChallanModal(job)}
                                        className="bg-slate-50 border border-slate-200 hover:border-blue-400 p-2.5 rounded-lg flex items-center justify-between cursor-pointer transition text-xs"
                                      >
                                        <div>
                                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                            <span>{ch.challanNo}</span>
                                            <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-1.5 py-0.2 rounded">
                                              {ch.dispatchType === 'partial' ? '⚡ Partial' : '📦 Final'}
                                            </span>
                                          </div>
                                          <div className="text-[11px] text-slate-500 mt-0.5">
                                            {ch.thisDispatchWeightKg} kg in {ch.totalBundles} bundles ({ch.vehicleNo})
                                          </div>
                                        </div>
                                        <button
                                          type="button"
                                          className="text-blue-600 font-bold hover:underline text-[11px]"
                                        >
                                          View / Print →
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
