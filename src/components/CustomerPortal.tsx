import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward, ProductionStatus, DeliveryChallan } from '../types';
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
import { downloadChallanPdf } from '../utils/challanExport';
import { describeSlitSizes } from '../utils/weight';
import { buildTimeline, nextStep, formatEventTime } from '../utils/timeline';
import { SpecChangeRequestModal } from './SpecChangeRequestModal';

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
  } = useProduction();

  const [copiedLink, setCopiedLink] = useState(false);

  // Find customer matching the authenticated email or selected customer ID
  const matchedCustomer =
    (authenticatedEmail &&
      customers.find((c) =>
        c.authorizedEmails.some(
          (ae) => ae.toLowerCase() === authenticatedEmail.trim().toLowerCase()
        ) || c.email.trim().toLowerCase() === authenticatedEmail.trim().toLowerCase()
      )) ||
    (selectedCustomerId && customers.find((c) => c.id === selectedCustomerId)) ||
    null;

  const isAuthenticated = !!matchedCustomer;
  const currentCustomer = matchedCustomer;

  const [bundleFilter, setBundleFilter] = useState<'all' | 'ready' | 'dispatched'>('all');

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
    // Colleagues sign in with their own authorized email to see live tracking.
    navigator.clipboard.writeText(window.location.origin);
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
      case 'partially_dispatched':
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
    activeJob?.status === 'po_closed';
  const hasPendingSpecRequest = (activeJob?.specChangeRequests || []).some((r) => r.status === 'pending_approval');
  const [specRequestJob, setSpecRequestJob] = useState<MaterialInward | null>(null);
  const dispatchedWeight = activeJob?.dispatchedWeightKg || 0;
  const remainingWeight = activeJob ? Math.max(0, activeJob.incomingWeight - dispatchedWeight) : 0;
  const challansList = activeJob?.challans && activeJob.challans.length > 0
    ? activeJob.challans
    : activeJob?.challan
    ? [activeJob.challan]
    : [];

  if (!isAuthenticated) {
    // Signed in, but the company record has not loaded (or access was removed).
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-center space-y-3">
          <ShieldCheck className="w-8 h-8 text-blue-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Loading your company account...</h2>
          <p className="text-xs text-slate-600">
            If this does not finish, your email may no longer be authorized. Please contact Progressive Enterprises.
          </p>
          <button
            type="button"
            onClick={logoutCustomer}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
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
                {currentCustomer.gstNumber ? `GSTIN: ${currentCustomer.gstNumber}` : ''}
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
              Each of these email IDs can sign in and track your orders.
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
              <span className="text-[11px] text-blue-600">
                <span className="lg:hidden">Swipe and tap to track</span>
                <span className="hidden lg:inline">Click to track</span>
              </span>
            </div>

            {/* Phones: one swipeable row. Desktop: a vertical list beside the details. */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 snap-x lg:block lg:space-y-2 lg:overflow-visible lg:mx-0 lg:px-0">
              {customerJobs.map((job) => {
                const isSelected = activeJob?.id === job.id;
                const isClosed = job.poStatus === 'closed' || job.status === 'po_closed';
                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJobId(job.id)}
                    className={`shrink-0 w-[78%] sm:w-[48%] lg:w-auto snap-start p-3.5 rounded-xl border transition cursor-pointer text-left ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-300 shadow-sm ring-1 ring-blue-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-xs text-blue-800 block">
                          PO {job.customerPoNo}
                        </span>
                        <span className="font-mono text-[10px] text-slate-500">{job.jobNo}</span>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-black text-blue-800">
                        PO {activeJob.customerPoNo}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {activeJob.jobNo}
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
                    {!isPermanentlyClosed && activeJob.status !== 'dispatched' && (
                      hasPendingSpecRequest ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold">
                          <Clock className="w-4 h-4 text-amber-600" /> Change request pending
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSpecRequestJob(activeJob)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                        >
                          <Sliders className="w-4 h-4" />
                          <span>Request Change</span>
                        </button>
                      )
                    )}
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
                          {activeJob.poClosedAt ? new Date(activeJob.poClosedAt).toLocaleDateString('en-IN') : ''}
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
                            ? new Date(activeJob.estimatedDeliveryDate).toLocaleDateString('en-IN', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'To be confirmed by the factory'}
                        </div>
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

                {/* Progress strip */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Status
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Step {currentStageIndex + 1} of {stages.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {stages.map((stage, idx) => (
                      <div key={stage.id} className="min-w-0">
                        <div
                          className={`h-1.5 rounded-full ${
                            idx < currentStageIndex || isPermanentlyClosed
                              ? 'bg-emerald-500'
                              : idx === currentStageIndex
                              ? 'bg-blue-600 animate-pulse'
                              : 'bg-slate-200'
                          }`}
                        />
                        <p
                          className={`mt-1 text-[10px] sm:text-[11px] leading-tight ${
                            idx === currentStageIndex ? 'font-bold text-blue-900' : 'text-slate-500'
                          }`}
                        >
                          {stage.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Dated timeline of everything that happened to this order */}
                <div className="border-t border-slate-200 pt-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-2">
                    Timeline
                  </span>
                  <ol className="relative border-l-2 border-slate-200 ml-1.5 space-y-3">
                    {buildTimeline(activeJob).map((ev, idx) => (
                      <li key={idx} className="pl-4 relative">
                        <span
                          className={`absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white ${
                            ev.tone === 'done'
                              ? 'bg-emerald-500'
                              : ev.tone === 'progress'
                              ? 'bg-blue-600'
                              : ev.tone === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5">
                          <span className="text-xs font-bold text-slate-900">{ev.title}</span>
                          <span className="text-[11px] text-slate-500 font-mono shrink-0">{formatEventTime(ev.at)}</span>
                        </div>
                        {ev.detail && <p className="text-[11px] text-slate-600 leading-snug">{ev.detail}</p>}
                      </li>
                    ))}
                    {nextStep(activeJob) && (
                      <li className="pl-4 relative">
                        <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-blue-600 bg-white" />
                        <span className="text-xs font-bold text-blue-800">Next: {nextStep(activeJob)}</span>
                      </li>
                    )}
                  </ol>
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

              {/* CHANGE REQUESTS: what the customer asked for and the factory's decision */}
              {activeJob.specChangeRequests && activeJob.specChangeRequests.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                      <History className="w-4 h-4 text-amber-600" />
                      Change Requests ({activeJob.specChangeRequests.length})
                    </span>
                  </div>

                  <div className="space-y-3">
                    {activeJob.specChangeRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          req.status === 'pending_approval'
                            ? 'bg-amber-50/70 border-amber-300'
                            : req.status === 'approved'
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-rose-50/70 border-rose-300'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                              req.status === 'pending_approval'
                                ? 'bg-amber-200 text-amber-900'
                                : req.status === 'approved'
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-rose-200 text-rose-900'
                            }`}
                          >
                            {req.status === 'pending_approval'
                              ? 'Waiting for factory'
                              : req.status === 'approved'
                              ? 'Approved'
                              : 'Declined'}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {new Date(req.requestedAt).toLocaleString('en-IN')} • {req.requestedByEmail}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested sizes</span>
                            <div className="font-mono font-bold text-slate-900 mt-0.5">
                              {describeSlitSizes(req.requestedSpecs.slitSizes) ||
                                (req.requestedSpecs.slitWidthMm ? `${req.requestedSpecs.slitWidthMm} mm` : '—')}
                            </div>
                          </div>
                          <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Reason</span>
                            <p className="text-slate-800 italic mt-0.5">&ldquo;{req.reason}&rdquo;</p>
                          </div>
                        </div>

                        {req.status !== 'pending_approval' && (
                          <div className="pt-2 border-t border-slate-300/60 text-[11px] text-slate-700">
                            <strong>Factory reply</strong>
                            {req.reviewedAt ? ` (${new Date(req.reviewedAt).toLocaleString('en-IN')})` : ''}
                            {req.reviewNote ? <>: &ldquo;{req.reviewNote}&rdquo;</> : ''}
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
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => downloadChallanPdf(ch, activeJob)}
                            className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1"
                            title="Download the challan as a PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-blue-600" />
                            <span>Download PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenChallanModal(activeJob)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-2xs flex items-center gap-1"
                            title="Open full Delivery Challan preview, print, WhatsApp, and Email dispatch"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            <span>View / Print Challan</span>
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

      {specRequestJob && (
        <SpecChangeRequestModal job={specRequestJob} onClose={() => setSpecRequestJob(null)} />
      )}
    </div>
  );
};
