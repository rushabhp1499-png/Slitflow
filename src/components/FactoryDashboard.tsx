import React, { useEffect, useRef, useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward, ProductionStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { SIZE_MASTER_URL, sizeMasterLink } from '../utils/sizeMaster';
import { exportJobsToExcel } from '../utils/excelExport';
import { hasMaterialLeft, isMachineLocked, machineQueue, orderTargetKg, packedKg, tracksWeight } from '../utils/floorPlan';
import { formatKg } from '../utils/weight';
import { AnimatedNumber } from './AnimatedNumber';
import {
  FileSpreadsheet,
  Gauge,
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
  Factory,
  Pencil,
  KeyRound
} from 'lucide-react';
import { EditOrderModal } from './EditOrderModal';
import { sizeText } from '../utils/material';
import { UsersModal } from './UsersModal';

interface FactoryDashboardProps {
  onOpenInwardModal: () => void;
  onOpenEddModal: (job: MaterialInward) => void;
  onOpenOutputModal?: (job: MaterialInward) => void;
  onOpenChallanModal: (job: MaterialInward) => void;
  onOpenBundleWeighingModal: (job: MaterialInward) => void;
  onOpenCustomerModal?: () => void;
  onOpenPoCloseModal?: (job: MaterialInward) => void;
  onOpenSpecApprovalModal?: (job: MaterialInward) => void;
  onOpenFloorSetup?: () => void;
  onOpenAssignModal?: (job: MaterialInward) => void;
  onOpenActivityLog?: () => void;
  onOpenEfficiency?: () => void;
}

export const FactoryDashboard: React.FC<FactoryDashboardProps> = ({
  onOpenInwardModal,
  onOpenEddModal,
  onOpenOutputModal,
  onOpenChallanModal,
  onOpenBundleWeighingModal,
  onOpenCustomerModal,
  onOpenPoCloseModal,
  onOpenSpecApprovalModal,
  onOpenFloorSetup,
  onOpenAssignModal,
  onOpenActivityLog,
  onOpenEfficiency,
}) => {
  const {
    jobs,
    customers,
    machines,
    floorStaff,
    isAdmin,
    updateJobStatus,
    reopenCustomerPo,
  } = useProduction();

  // Owner / developer windows. The order is looked up live so the window follows saved changes.
  const [editJobId, setEditJobId] = useState<string | null>(null);
  const editJob = editJobId ? jobs.find((j) => j.id === editJobId) || null : null;
  const [usersOpen, setUsersOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [machineFilter, setMachineFilter] = useState<string>('ALL');
  const [toast, setToast] = useState('');
  const [flashIds, setFlashIds] = useState<string[]>([]);

  // Briefly highlight an order when its stage changes, here or on another screen.
  const lastStatus = useRef(new Map<string, ProductionStatus>());
  useEffect(() => {
    const changed = jobs.filter((j) => {
      const before = lastStatus.current.get(j.id);
      return before !== undefined && before !== j.status;
    });
    lastStatus.current = new Map(jobs.map((j) => [j.id, j.status]));
    if (changed.length === 0) return;
    setFlashIds(changed.map((j) => j.id));
    const timer = setTimeout(() => setFlashIds([]), 950);
    return () => clearTimeout(timer);
  }, [jobs]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2800);
    return () => clearTimeout(timer);
  }, [toast]);

  const moveStage = (job: MaterialInward, status: ProductionStatus, note: string, message: string) => {
    updateJobStatus(job.id, status, note);
    setToast(`${job.customerPoNo} ${message}`);
  };

  // Helper predicates for status categories
  const isJobClosed = (j: MaterialInward) =>
    j.poStatus === 'closed' ||
    j.status === 'po_closed';

  const isJobInQueue = (j: MaterialInward) =>
    (j.status === 'received' || j.status === 'pending_production') && !isJobClosed(j);

  const isJobUnderSlitting = (j: MaterialInward) =>
    (j.status === 'in_production' || (j.status === 'partially_dispatched' && hasMaterialLeft(j))) && !isJobClosed(j);

  const isJobReadyDispatch = (j: MaterialInward) =>
    (j.status === 'slitting_completed' ||
     j.status === 'ready_for_dispatch' ||
     (j.bundles && j.bundles.some(b => b.status === 'ready')) ||
     (j.status === 'partially_dispatched' && hasMaterialLeft(j))) && !isJobClosed(j);

  // "Today" view: what needs attention now. Dates compared in local time.
  const localDay = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = localDay(new Date());
  const tomorrow = localDay(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const hasBalance = (j: MaterialInward) =>
    !isJobClosed(j) && j.status !== 'dispatched' && hasMaterialLeft(j);
  const todayChecks: Record<string, (j: MaterialInward) => boolean> = {
    TODAY_IN: (j) => !!j.createdAt && localDay(new Date(j.createdAt)) === today,
    OVERDUE: (j) => hasBalance(j) && !!j.estimatedDeliveryDate && j.estimatedDeliveryDate < today,
    DUE_SOON: (j) =>
      hasBalance(j) && !!j.estimatedDeliveryDate && j.estimatedDeliveryDate >= today && j.estimatedDeliveryDate <= tomorrow,
    READY_BUNDLES: (j) => !isJobClosed(j) && (j.bundles || []).some((b) => b.status === 'ready' && !b.isVoided),
    NEEDS_EDD: (j) => !j.estimatedDeliveryDate && !isJobClosed(j),
    CHANGE_REQ: (j) => (j.specChangeRequests || []).some((r) => r.status === 'pending_approval'),
  };
  const todayCards: Array<{ key: string; label: string; tone: string }> = [
    { key: 'OVERDUE', label: 'Overdue', tone: 'red' },
    { key: 'DUE_SOON', label: 'Due today / tomorrow', tone: 'amber' },
    { key: 'READY_BUNDLES', label: 'Packed, ready to dispatch', tone: 'emerald' },
    { key: 'CHANGE_REQ', label: 'Change requests', tone: 'purple' },
    { key: 'NEEDS_EDD', label: 'Need a delivery date', tone: 'blue' },
    { key: 'TODAY_IN', label: 'Came in today', tone: 'slate' },
  ];
  const toneClasses: Record<string, string> = {
    red: 'border-red-200 bg-red-50 text-red-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    purple: 'border-purple-200 bg-purple-50 text-purple-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
    slate: 'border-slate-200 bg-white text-slate-900',
  };

  // Metrics calculation
  const totalInwardCount = jobs.length;
  const pendingEddCount = jobs.filter((j) => !j.estimatedDeliveryDate && !isJobClosed(j)).length;
  const notTakenCount = jobs.filter(isJobInQueue).length;
  const inProductionCount = jobs.filter(isJobUnderSlitting).length;
  const readyDispatchCount = jobs.filter(isJobReadyDispatch).length;
  const closedPoCount = jobs.filter(isJobClosed).length;

  const totalIncomingWeight = jobs.reduce((acc, j) => acc + j.incomingWeight, 0);

  // Filtered jobs list. The PO is the main reference, so PO matches are listed first.
  const query = searchQuery.trim().toLowerCase();
  const poMatchRank = (job: MaterialInward) => {
    const po = (job.customerPoNo || '').toLowerCase();
    if (!query) return 0;
    if (po === query) return 0;
    if (po.startsWith(query)) return 1;
    if (po.includes(query)) return 2;
    return 3;
  };
  const filteredJobs = jobs.filter((job) => {
    const customer = customers.find((c) => c.id === job.customerId);
    const fields = [
      job.customerPoNo,
      job.jobNo,
      job.customerName,
      job.grade,
      job.inwardChallanNo,
      job.vehicleNo,
      customer?.email,
      ...(job.challans || []).map((c) => c.challanNo),
    ];
    const matchesSearch = !query || fields.some((f) => (f || '').toLowerCase().includes(query));

    const isClosed = isJobClosed(job);

    // Closed POs live only under the Closed POs card (or when searched for by number).
    const matchesStatus =
      statusFilter === 'ALL'
        ? !isClosed || !!query
        : todayChecks[statusFilter]
        ? todayChecks[statusFilter](job)
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

    const matchesMachine = machineFilter === 'ALL' || job.assignment?.machineId === machineFilter;

    return matchesSearch && matchesStatus && matchesCustomer && matchesMachine;
  }).sort((a, b) => poMatchRank(a) - poMatchRank(b));

  const activeMachines = machines
    .filter((m) => m.active)
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
  // New list = rows replay their entrance; typing in search or live updates don't.
  const listKey = `${statusFilter}|${customerFilter}|${machineFilter}`;

  // Excel: everything (closed POs too) unless a search or filter is narrowing the list
  const isListNarrowed = !!query || statusFilter !== 'ALL' || customerFilter !== 'ALL' || machineFilter !== 'ALL';
  const handleExport = async () => {
    setExporting(true);
    try {
      await exportJobsToExcel(isListNarrowed ? filteredJobs : jobs, machines, floorStaff);
    } catch (err) {
      console.error(err);
      alert('Could not create the Excel file. Please try again.');
    } finally {
      setExporting(false);
    }
  };

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

  return (
    <div className="space-y-6 dash-motion">

      {/* Factory Operator Top Status Banner */}
      <div className="dash-drop bg-slate-900 text-white border border-slate-800 rounded-xl p-3 sm:p-4 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Factory className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm sm:text-base text-white">
                Factory Dashboard
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Progressive Enterprises Global • Materials. Converted for Purpose.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Customer Master / Register Customer Details & Email IDs */}
          {onOpenCustomerModal && (
            <button
              type="button"
              onClick={onOpenCustomerModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              title="Register Customer Details & Authorized Email IDs into Machine"
            >
              <Building2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Customer Master & Emails</span>
            </button>
          )}

          {/* Who changed what: top management and developer only */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setUsersOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-xs font-bold transition"
              title="Factory and customer logins: add, set passwords, remove"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Users & Logins</span>
            </button>
          )}

          {onOpenActivityLog && isAdmin && (
            <button
              type="button"
              onClick={onOpenActivityLog}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition"
              title="Every change, who made it and when"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity Log</span>
            </button>
          )}

          {onOpenEfficiency && (
            <button
              type="button"
              onClick={onOpenEfficiency}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition"
              title="How well each machine was used: utilisation, kg per hour, idle time"
            >
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Efficiency</span>
            </button>
          )}

          {/* Big-screen floor display, opened in its own tab for the TV */}
          <a
            href="/floor"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition"
            title="Open the Live Floor screen for the factory TV"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
            <span>Live Floor</span>
          </a>

          {onOpenFloorSetup && (
            <button
              type="button"
              onClick={onOpenFloorSetup}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition"
              title="Machines and staff"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Floor Setup</span>
            </button>
          )}

          {/* SlitSmart Size Master, empty, for planning cuts before an order is entered */}
          <a
            href={SIZE_MASTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
            title="Open SlitSmart Size Master in a new tab to plan blade setup and cutting options"
          >
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            <span>Size Master</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* New Material Inward */}
          <button
            type="button"
            onClick={onOpenInwardModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            title="Create Incoming Raw Material Inward"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Material Inward</span>
          </button>
        </div>
      </div>
      
      {/* Today: what needs attention now. Click a card to list those orders. */}
      <div>
        <div className="flex items-center justify-between mb-2 px-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Today • {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
          </span>
          {(statusFilter !== 'ALL' || machineFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('ALL');
                setMachineFilter('ALL');
              }}
              className="text-xs font-bold text-blue-700"
            >
              Show all orders
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
          {todayCards.map((card, cardIndex) => {
            const matching = jobs.filter(todayChecks[card.key]);
            const active = statusFilter === card.key;
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => {
                  setStatusFilter(active ? 'ALL' : card.key);
                  document.getElementById('orders-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                style={{ animationDelay: `${0.05 + cardIndex * 0.05}s` }}
                className={`dash-rise dash-lift text-left rounded-xl border p-3 ${toneClasses[card.tone]} ${
                  active ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <AnimatedNumber value={matching.length} className={`block text-2xl font-black leading-none ${matching.length === 0 ? 'opacity-60' : ''}`} />
                <div className="text-[11px] font-bold mt-1">{card.label}</div>
                {matching.length > 0 && (
                  <div className="text-[10px] font-mono mt-1 truncate opacity-80">
                    {matching.slice(0, 3).map((j) => j.customerPoNo).join(', ')}
                    {matching.length > 3 ? ` +${matching.length - 3}` : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
      {/* Where open orders are: the bar shifts as orders move along */}
      {notTakenCount + inProductionCount + readyDispatchCount > 0 && (
        <div className="dash-rise flex gap-1 h-2.5" style={{ animationDelay: '0.3s' }} aria-hidden="true">
          <div className="dash-seg bg-amber-500 rounded-full min-w-0" style={{ flexGrow: notTakenCount, flexBasis: 0 }} title={`In queue: ${notTakenCount}`} />
          <div className="dash-seg bg-blue-600 rounded-full min-w-0" style={{ flexGrow: inProductionCount, flexBasis: 0 }} title={`Under slitting: ${inProductionCount}`} />
          <div className="dash-seg bg-emerald-600 rounded-full min-w-0" style={{ flexGrow: readyDispatchCount, flexBasis: 0 }} title={`Ready to dispatch: ${readyDispatchCount}`} />
        </div>
      )}

      {/* Top Banner & KPI Stat Cards - Clickable Interactive Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">

        {/* Total Inward Button */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('ALL');
            setMachineFilter('ALL');
            setSearchQuery('');
            setCustomerFilter('ALL');
          }}
          style={{ animationDelay: '0.32s' }}
          className={`dash-rise dash-lift text-left rounded-xl p-3.5 shadow-2xs border cursor-pointer ${
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
            <AnimatedNumber value={totalInwardCount} className="text-xl font-black text-slate-900" />
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
          style={{ animationDelay: '0.37s' }}
          className={`dash-rise dash-lift text-left rounded-xl p-3.5 shadow-2xs border cursor-pointer ${
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
            <AnimatedNumber value={notTakenCount} className="text-xl font-black text-slate-800" />
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
          style={{ animationDelay: '0.42s' }}
          className={`dash-rise dash-lift text-left rounded-xl p-3.5 shadow-2xs border cursor-pointer ${
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
            <AnimatedNumber value={inProductionCount} className="text-xl font-black text-blue-700" />
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
          style={{ animationDelay: '0.47s' }}
          className={`dash-rise dash-lift text-left rounded-xl p-3.5 shadow-2xs border cursor-pointer ${
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
            <AnimatedNumber value={readyDispatchCount} className="text-xl font-black text-emerald-700" />
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
          style={{ animationDelay: '0.52s' }}
          className={`dash-rise dash-lift text-left rounded-xl p-3.5 shadow-2xs border cursor-pointer ${
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
            <AnimatedNumber value={closedPoCount} className="text-xl font-black text-slate-900" />
            <span className="text-xs text-slate-500 font-medium">Closed</span>
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
      </div>

      {/* On the machines: click one to list its orders */}
      {activeMachines.length > 0 && (
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 px-0.5">On the machines</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {activeMachines.map((m, i) => {
              const [current, ...next] = machineQueue(jobs, m.id);
              const running = current?.status === 'in_production';
              const active = machineFilter === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMachineFilter(active ? 'ALL' : m.id);
                    setStatusFilter('ALL');
                  }}
                  aria-pressed={active}
                  style={{ animationDelay: `${0.5 + Math.min(i, 11) * 0.03}s` }}
                  className={`dash-rise dash-lift text-left rounded-xl border p-2.5 ${
                    running ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200'
                  } ${active ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <span className="flex items-center justify-between gap-1">
                    <span className="font-mono text-xs font-black text-slate-900 truncate">{m.number}</span>
                    <span
                      className={`shrink-0 w-2 h-2 rounded-full ${
                        running ? 'bg-emerald-500 dash-running-dot' : current ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                      title={running ? 'Running' : current ? 'Set up' : 'Idle'}
                    />
                  </span>
                  <span className="block mt-1 text-[11px] font-mono font-semibold text-slate-700 truncate">
                    {current ? current.customerPoNo : <span className="font-sans font-normal text-slate-500">Idle</span>}
                  </span>
                  {next.length > 0 && <span className="block text-[10px] text-slate-500">+{next.length} lined up</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Primary Actions & Customer Directory Access */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by PO number (or job, customer, challan, vehicle)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto justify-end">

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || jobs.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold border border-emerald-300 transition disabled:opacity-50"
              title={
                isListNarrowed
                  ? `Download the ${filteredJobs.length} orders shown, with their challans and bundles, as an Excel file`
                  : 'Download every order (closed POs too), with challans and bundles, as an Excel file'
              }
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>{exporting ? 'Preparing…' : isListNarrowed ? `Export ${filteredJobs.length} to Excel` : 'Export to Excel'}</span>
            </button>

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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Inward Entry</span>
            </button>

          </div>
        </div>
      </div>

      {/* Jobs Master Table */}
      <div id="orders-table" className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden scroll-mt-20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">PO # & Job</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Raw Material</th>
                <th className="py-3 px-4">Live Stage & Dispatches</th>
                <th className="py-3 px-4">Estimated Delivery (EDD)</th>
                <th className="py-3 px-4 text-right">Factory Operations</th>
              </tr>
            </thead>

            <tbody key={listKey} className="divide-y divide-slate-200">
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
                filteredJobs.map((job, rowIndex) => {
                  const targetKg = orderTargetKg(job);
                  const doneKg = packedKg(job);
                  const donePct = targetKg > 0 ? Math.min(100, Math.round((doneKg / targetKg) * 100)) : 0;
                  const stageStep =
                    job.status === 'received' || job.status === 'pending_production'
                      ? 0
                      : job.status === 'in_production'
                      ? 1
                      : job.status === 'slitting_completed' || job.status === 'ready_for_dispatch'
                      ? 2
                      : 3;
                  const daysLeft = getDaysRemaining(job.estimatedDeliveryDate);
                  const isExpanded = expandedJobId === job.id;
                  const customer = customers.find((c) => c.id === job.customerId);
                  const isPermanentlyClosed =
                    job.poStatus === 'closed' ||
                    job.status === 'po_closed';
                  const dispatchedWeight = job.dispatchedWeightKg || 0;
                  const remainingWeight = Math.max(0, job.incomingWeight - dispatchedWeight);
                  const challanCount = job.challans?.length || (job.challan ? 1 : 0);

                  return (
                    <React.Fragment key={job.id}>
                      <tr
                        style={{ animationDelay: `${Math.min(rowIndex, 8) * 0.05}s` }}
                        className={`dash-rise ${flashIds.includes(job.id) ? 'dash-flash' : ''} hover:bg-slate-50/80 transition ${
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
                              <ChevronDown className={`dash-chevron w-3.5 h-3.5 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                            {/* The customer PO is the main reference for every order */}
                            <span className="font-mono font-bold text-blue-800 text-[13px]">
                              {job.customerPoNo || 'Assigning…'}
                            </span>
                          </div>

                          <div className="text-[10px] font-mono text-slate-500 mt-1 pl-5">
                            {job.jobNo === 'PENDING' ? 'Job no. assigning…' : job.jobNo}
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

                          {(job.specChangeRequests || []).length > 0 && onOpenSpecApprovalModal && (
                            (job.specChangeRequests || []).some((r) => r.status === 'pending_approval') ? (
                              <button
                                type="button"
                                onClick={() => onOpenSpecApprovalModal(job)}
                                className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded animate-pulse"
                                title="The customer asked to change this order. Review it."
                              >
                                <AlertCircle className="w-3 h-3 text-amber-700" />
                                Change request
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenSpecApprovalModal(job)}
                                className="mt-1.5 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded"
                                title="Every change the customer asked for on this PO, before and after, and the decision"
                              >
                                Amendments ({(job.specChangeRequests || []).length})
                              </button>
                            )
                          )}
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 align-top max-w-[220px]">
                          <div className="font-bold text-slate-900 line-clamp-2">{job.customerName}</div>
                        </td>

                        {/* Incoming Material & Packaging Specs */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-semibold text-slate-900">{job.grade}</div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {sizeText(job)}
                          </div>
                          <div className="text-xs font-bold text-blue-900 mt-0.5">
                            {tracksWeight(job) ? `${job.incomingWeight.toLocaleString()} kg` : 'Weight not given'}{' '}
                            <span className="font-normal text-slate-400 text-[10px]">
                              ({job.coilsOrRollsCount} coil{job.coilsOrRollsCount > 1 ? 's' : ''})
                            </span>
                          </div>
                        </td>

                        {/* Production Status & Dispatches */}
                        <td className="py-3.5 px-4 align-top">
                          <StatusBadge status={job.status} />

                          {/* Packed so far against what the order needs */}
                          {!isPermanentlyClosed && (
                            <div
                              className="mt-1.5 w-44 max-w-full"
                              role="img"
                              aria-label={`${formatKg(doneKg)} of ${formatKg(targetKg)} kg packed`}
                              title={`${formatKg(doneKg)} of ${formatKg(targetKg)} kg packed`}
                            >
                              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`dash-bar h-full rounded-full ${
                                    job.status === 'in_production' ? 'dash-running-bar bg-blue-600' : stageStep >= 2 ? 'bg-emerald-600' : 'bg-slate-500'
                                  }`}
                                  style={{ width: `${donePct}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                {donePct}% packed
                              </div>
                            </div>
                          )}

                          {/* Machine and team (optional) */}
                          {onOpenAssignModal && !isPermanentlyClosed && (
                            <button
                              type="button"
                              onClick={() => onOpenAssignModal(job)}
                              className="mt-1.5 flex items-center gap-1 text-[11px] text-left hover:underline"
                              title={isMachineLocked(job) ? 'Production has started: the machine is fixed. Click to change the operator.' : 'Assign machine and operator'}
                            >
                              {job.assignment?.machineId ? (
                                <span className="font-semibold text-slate-800 inline-flex items-center gap-1">
                                  {isMachineLocked(job) && (
                                    <Lock className="w-3 h-3 text-slate-500" aria-label="Production started: machine fixed" />
                                  )}
                                  {machines.find((m) => m.id === job.assignment?.machineId)?.number || 'Machine'}
                                  {job.assignment.operatorId
                                    ? ` • ${floorStaff.find((s) => s.id === job.assignment?.operatorId)?.name || ''}`
                                    : ''}
                                </span>
                              ) : (
                                <span className="font-bold text-blue-700">+ Assign machine</span>
                              )}
                            </button>
                          )}

                          {/* Dispatched Weight vs Balance */}
                          {dispatchedWeight > 0 && (
                            <div className="mt-1.5 space-y-0.5 text-[11px]">
                              <div className="text-emerald-800 font-bold">
                                {customer?.keepsStock ? 'Billed' : 'Dispatched'}: {dispatchedWeight.toLocaleString()} kg
                              </div>
                              {tracksWeight(job) && !customer?.keepsStock && (
                                <div className="text-slate-500 font-medium">
                                  Balance: <strong className="text-slate-800">{remainingWeight.toLocaleString()} kg</strong>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Quick stage toggle buttons */}
                          {!isPermanentlyClosed && (
                            <div className="mt-2 flex items-center gap-1">
                              {job.status === 'received' && (
                                <button
                                  onClick={() => moveStage(job, 'pending_production', 'Moved to production queue', 'moved to the production queue.')}
                                  className="text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded border border-slate-300"
                                >
                                  Queue
                                </button>
                              )}

                              {(job.status === 'received' || job.status === 'pending_production') && (
                                <button
                                  onClick={() => moveStage(job, 'in_production', 'Mounted on slitter machine', 'is now under slitting.')}
                                  className="text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200"
                                >
                                  Start Slit
                                </button>
                              )}

                              {job.status === 'in_production' && (
                                <button
                                  onClick={() => moveStage(job, 'ready_for_dispatch', 'Slitting & bundling completed', 'is ready to dispatch.')}
                                  className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                                >
                                  Mark Ready
                                </button>
                              )}

                              {job.status === 'slitting_completed' && (
                                <button
                                  onClick={() => moveStage(job, 'ready_for_dispatch', 'Packing completed', 'is ready to dispatch.')}
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

                        {/* Factory Operations: Bundle Details, Challan & PO Close */}
                        <td className="py-3.5 px-4 align-top text-right space-y-1.5">

                          {/* Owner / developer: correct or delete the order */}
                          {isAdmin && (
                            <div>
                              <button
                                type="button"
                                onClick={() => setEditJobId(job.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
                                title="Change any detail of this order, or delete it"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-600" />
                                <span>Edit / Delete</span>
                              </button>
                            </div>
                          )}

                          {/* Add Bundle Details Dialog */}
                          {!isPermanentlyClosed && (
                            <div className="flex flex-col gap-1 items-end">
                              <button
                                type="button"
                                onClick={() => onOpenBundleWeighingModal(job)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition shadow-2xs cursor-pointer"
                                title="Add bundle weights, core tube tare deduction, and roll size specifications"
                              >
                                <Package className="w-3.5 h-3.5 text-blue-600" />
                                <span>Add Bundle Details ({job.bundles?.length || 0})</span>
                              </button>
                              <a
                                href={sizeMasterLink(job, machines, floorStaff)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition shadow-2xs"
                                title="Open Size Master in a new tab with this order's roll and slit sizes filled in"
                              >
                                <Scissors className="w-3.5 h-3.5 text-amber-600" />
                                <span>Plan Cuts</span>
                              </a>
                            </div>
                          )}

                          {/* Delivery Challan / Dispatch Button */}
                          <div>
                            {isPermanentlyClosed ? (
                              challanCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenChallanModal(job)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition shadow-2xs cursor-pointer"
                                  title="View generated challans (PO Closed - View Only)"
                                >
                                  <FileText className="w-3.5 h-3.5 text-slate-600" />
                                  <span>View Challan{challanCount > 1 ? 's' : ''} ({challanCount})</span>
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium italic px-2.5 py-1 bg-slate-100 rounded border border-slate-200 inline-flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  PO Closed
                                </span>
                              )
                            ) : challanCount > 0 ? (
                              <button
                                type="button"
                                onClick={() => onOpenChallanModal(job)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-black rounded-lg transition shadow-xs cursor-pointer"
                                title="View official printable delivery challan(s) or generate new challan"
                              >
                                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{challanCount} Challan{challanCount > 1 ? 's' : ''}</span>
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
                                title="Generate official delivery challan with 50g least count and bundle checklist"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Make Challan</span>
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
                            <div className="dash-reveal bg-white rounded-lg border border-slate-200 p-4 space-y-4">

                              {/* Where this order has reached */}
                              <ol className="flex max-w-xl">
                                {['Received', 'Slitting', 'Packed', 'Dispatched'].map((label, step) => (
                                  <li key={label} className="flex-1 min-w-0">
                                    <div className="flex items-center">
                                      <span
                                        className={`shrink-0 rounded-full w-3 h-3 ${step <= stageStep ? 'bg-blue-600' : 'bg-slate-300'} ${
                                          step === stageStep ? 'scale-125' : ''
                                        }`}
                                      />
                                      {step < 3 && <span className={`flex-1 h-0.5 ${step < stageStep ? 'bg-blue-600' : 'bg-slate-300'}`} />}
                                    </div>
                                    <div className={`mt-1 text-[11px] ${step === stageStep ? 'font-bold text-slate-900' : 'text-slate-500'}`}>{label}</div>
                                  </li>
                                ))}
                              </ol>

                              {/* Customer Registered Details & Multiple Authorized Email IDs */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                                <div>
                                  <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px] block mb-1">
                                    Customer Registered Address & Consignee Works:
                                  </span>
                                  <p className="text-slate-700 leading-snug">
                                    <strong>Registered Office:</strong> {customer?.registeredAddress || job.customerRegisteredAddress || '—'}
                                  </p>
                                  <p className="text-slate-700 leading-snug mt-1">
                                    <strong>Plant Unloading:</strong> {customer?.plantAddress || customer?.registeredAddress || '—'}
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
                                          <span className="text-[10px] text-slate-500 block font-medium">
                                            Core type: {b.coreType === 'paper_core' ? 'Paper Tube' : 'Plastic Tube'}
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
                                            {b.status !== 'dispatched'
                                              ? 'Ready'
                                              : !customer?.keepsStock
                                              ? 'Dispatched'
                                              : b.liftedAt
                                              ? 'Billed • Lifted'
                                              : 'Billed'}
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

      {toast && (
        <div
          role="status"
          className="dash-toast no-print fixed right-4 bottom-4 z-40 max-w-sm px-4 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold shadow-xl"
        >
          {toast}
        </div>
      )}

      {editJob && <EditOrderModal job={editJob} onClose={() => setEditJobId(null)} />}
      {usersOpen && <UsersModal onClose={() => setUsersOpen(false)} />}
    </div>
  );
};
