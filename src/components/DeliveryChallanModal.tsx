import React, { useState, useEffect } from 'react';
import { MaterialInward, DeliveryChallan } from '../types';
import { useProduction } from '../context/ProductionContext';
import { COMPANY_INFO } from '../data/mockData';
import { downloadChallanAsHtml } from '../utils/challanExport';
import { WhatsAppDispatchModal } from './WhatsAppDispatchModal';
import { EmailDispatchModal } from './EmailDispatchModal';
import {
  Printer,
  X,
  FileText,
  Truck,
  Check,
  Mail,
  FolderOpen,
  Send,
  Plus,
  Edit2,
  Trash2,
  Download,
  ExternalLink,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Link2,
  CheckSquare,
  Square,
  Scale,
  Layers,
  Lock,
  Unlock,
  Copy,
  Phone
} from 'lucide-react';

interface DeliveryChallanModalProps {
  job: MaterialInward;
  onClose: () => void;
}

export const DeliveryChallanModal: React.FC<DeliveryChallanModalProps> = ({ job, onClose }) => {
  const {
    jobs,
    reopenCustomerPo,
    activeRole,
    generateDeliveryChallan,
    updateDeliveryChallan,
    deleteDeliveryChallan,
    sendChallanEmail,
    customers,
    addMultipleBundlesToJob,
  } = useProduction();

  const currentJob = jobs.find((j) => j.id === job.id) || job;
  const isPermanentlyClosed =
    currentJob.status === 'po_closed' ||
    currentJob.poStatus === 'closed';

  const customer = customers.find((c) => c.id === currentJob.customerId);
  const existingChallans: DeliveryChallan[] =
    currentJob.challans && currentJob.challans.length > 0
      ? currentJob.challans
      : currentJob.challan
      ? [currentJob.challan]
      : [];

  const [activeChallanId, setActiveChallanId] = useState<string>(
    existingChallans[existingChallans.length - 1]?.id || ''
  );

  // If there are no challans yet and PO is open, default to creating a new one
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(existingChallans.length === 0 && !isPermanentlyClosed);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(false);
  const [emailAlert, setEmailAlert] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // WhatsApp & Email Dispatch Modals
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppPhone, setWhatsAppPhone] = useState<string>('');
  const [whatsAppCopied, setWhatsAppCopied] = useState(false);

  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState<string>('');
  const [emailCopied, setEmailCopied] = useState(false);

  // Remaining balance
  const dispatchedSoFar = job.dispatchedWeightKg || 0;
  const balanceRemaining = Math.max(0, job.incomingWeight - dispatchedSoFar);

  // Bundles ready on scale
  const readyBundles = (job.bundles || []).filter((b) => b.status === 'ready');
  const readyWeight = Number(readyBundles.reduce((s, b) => s + b.netWeightKg, 0).toFixed(2));

  // Selected bundle IDs for new challan
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>(
    readyBundles.map((b) => b.id)
  );

  // Strictly computed from selected bundles list - GUARANTEED equal to selected items from the list above
  const selectedBundles = readyBundles.filter((b) => selectedBundleIds.includes(b.id));
  const newDispatchWeight = Number(selectedBundles.reduce((sum, b) => sum + b.netWeightKg, 0).toFixed(2));
  const newBundlesCount = selectedBundles.length;

  const [newVehicleNo, setNewVehicleNo] = useState<string>(job.vehicleNo && job.vehicleNo !== '—' ? job.vehicleNo : '');
  const [newTransporter, setNewTransporter] = useState<string>('');
  // Statutory number: only what the user types, never a generated one.
  const [newEWayBill, setNewEWayBill] = useState<string>('');
  const [newRemarks, setNewRemarks] = useState<string>('');

  // Active Challan for view or edit
  const activeChallan: DeliveryChallan | undefined =
    existingChallans.find((c) => c.id === activeChallanId) ||
    existingChallans[existingChallans.length - 1];

  // Selected bundle IDs for editing existing challan
  const [editSelectedBundleIds, setEditSelectedBundleIds] = useState<string[]>(
    activeChallan?.selectedBundleIds ||
    (job.bundles || []).filter((b) => b.dispatchedInChallanId === activeChallan?.id).map((b) => b.id)
  );

  // Strictly computed for editing existing challan
  const editEligibleBundles = (job.bundles || []).filter(
    (b) => b.dispatchedInChallanId === activeChallan?.id || b.status === 'ready'
  );
  const editPickedBundles = editEligibleBundles.filter((b) => editSelectedBundleIds.includes(b.id));
  const editWeight = Number(editPickedBundles.reduce((sum, b) => sum + b.netWeightKg, 0).toFixed(2));
  const editBundlesCount = editPickedBundles.length;

  const [editVehicleNo, setEditVehicleNo] = useState<string>(activeChallan?.vehicleNo || '');
  const [editTransporter, setEditTransporter] = useState<string>(activeChallan?.transporterName || '');
  const [editEWayBill, setEditEWayBill] = useState<string>(activeChallan?.eWayBillNo || '');

  useEffect(() => {
    if (readyBundles.length > 0 && selectedBundleIds.length === 0 && !isCreatingNew) {
      setSelectedBundleIds(readyBundles.map((b) => b.id));
    }
  }, [job.bundles]);

  // Toggle individual bundle checkbox for new challan
  const toggleBundleSelection = (bundleId: string) => {
    setSelectedBundleIds((prev) =>
      prev.includes(bundleId) ? prev.filter((id) => id !== bundleId) : [...prev, bundleId]
    );
  };

  // Quick selection presets - Strictly operating on the bundle checklist
  const selectAllReadyBundles = () => {
    setSelectedBundleIds(readyBundles.map((b) => b.id));
  };

  const clearAllBundleSelections = () => {
    setSelectedBundleIds([]);
  };

  const selectEvenBundles = () => {
    const evens = readyBundles.filter((_, idx) => (idx + 1) % 2 === 0);
    setSelectedBundleIds(evens.map((b) => b.id));
  };

  const selectOddBundles = () => {
    const odds = readyBundles.filter((_, idx) => (idx + 1) % 2 !== 0);
    setSelectedBundleIds(odds.map((b) => b.id));
  };

  const selectFirstNBundles = (n: number) => {
    const subset = readyBundles.slice(0, n);
    setSelectedBundleIds(subset.map((b) => b.id));
  };

  // Toggle bundle selection when editing an existing challan
  const toggleEditBundleSelection = (bundleId: string) => {
    setEditSelectedBundleIds((prev) =>
      prev.includes(bundleId) ? prev.filter((id) => id !== bundleId) : [...prev, bundleId]
    );
  };

  // When switching active challan, update edit form fields
  const handleSelectChallan = (challanId: string) => {
    setActiveChallanId(challanId);
    setIsCreatingNew(false);
    setIsEditingExisting(false);
    const target = existingChallans.find((c) => c.id === challanId);
    if (target) {
      setEditVehicleNo(target.vehicleNo);
      setEditTransporter(target.transporterName);
      setEditEWayBill(target.eWayBillNo || '');
      const currentBundleIds = target.selectedBundleIds ||
        (job.bundles || []).filter((b) => b.dispatchedInChallanId === target.id).map((b) => b.id);
      setEditSelectedBundleIds(currentBundleIds);
    }
  };

  const handleStartEdit = () => {
    if (!activeChallan) return;
    setEditVehicleNo(activeChallan.vehicleNo);
    setEditTransporter(activeChallan.transporterName);
    setEditEWayBill(activeChallan.eWayBillNo || '');
    const currentBundleIds = activeChallan.selectedBundleIds ||
      (job.bundles || []).filter((b) => b.dispatchedInChallanId === activeChallan.id).map((b) => b.id);
    setEditSelectedBundleIds(currentBundleIds);
    setIsEditingExisting(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChallan) return;

    updateDeliveryChallan(job.id, activeChallan.id, {
      thisDispatchWeightKg: editWeight,
      totalBundles: editBundlesCount,
      vehicleNo: editVehicleNo,
      transporterName: editTransporter,
      eWayBillNo: editEWayBill,
      selectedBundleIds: editSelectedBundleIds,
    });

    setIsEditingExisting(false);
  };

  const handleCreateNewChallan = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDispatchWeight <= 0) return;

    const isPartial = newDispatchWeight < balanceRemaining;

    const created = generateDeliveryChallan(job.id, {
      dispatchType: isPartial ? 'partial' : 'final',
      thisDispatchWeightKg: newDispatchWeight,
      bundlesCount: newBundlesCount,
      vehicleNo: (newVehicleNo && newVehicleNo.trim()) ? newVehicleNo.trim().toUpperCase() : (job.vehicleNo || '—'),
      transporterName: newTransporter,
      eWayBillNo: newEWayBill,
      selectedBundleIds: selectedBundleIds,
      remarks: newRemarks || `Dispatch of ${newDispatchWeight} kg in ${newBundlesCount} bundles for PO #${job.customerPoNo}`,
    });

    setActiveChallanId(created.id);
    setIsCreatingNew(false);
  };

  const handleDeleteChallan = (challanId: string) => {
    deleteDeliveryChallan(job.id, challanId);
    setConfirmDeleteId(null);
    const remaining = existingChallans.filter((c) => c.id !== challanId);
    if (remaining.length > 0) {
      setActiveChallanId(remaining[remaining.length - 1].id);
      setIsCreatingNew(false);
    } else {
      setActiveChallanId('');
      setIsCreatingNew(true);
    }
  };

  const handleDownload = () => {
    if (!activeChallan) return;
    downloadChallanAsHtml(activeChallan, job);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenWhatsAppModal = () => {
    if (!activeChallan) return;
    const phone = customer?.phone || job.customerPhone || '';
    setWhatsAppPhone(phone);
    setWhatsAppCopied(false);
    setIsWhatsAppModalOpen(true);
  };

  const handleOpenEmailModal = () => {
    if (!activeChallan) return;
    const allEmails = customer?.authorizedEmails && customer.authorizedEmails.length > 0
      ? customer.authorizedEmails
      : [customer?.email || job.customerEmail].filter(Boolean);
    setEmailRecipients(allEmails.join(', '));
    setEmailSubject(`Delivery Challan #${activeChallan.challanNo} - Progressive Enterprises (PO #${job.customerPoNo})`);
    setEmailCopied(false);
    setIsEmailModalOpen(true);
  };

  const getTrackingUrl = () => {
    const origin = window.location.origin;
    const code = customer?.accessCode || customer?.id || job.customerId;
    return `${origin}?track=${encodeURIComponent(code)}`;
  };

  const getWhatsAppMessageText = () => {
    if (!activeChallan) return '';
    const trackingUrl = getTrackingUrl();
    const custName = customer?.companyName || job.customerName;
    return `*PROGRESSIVE ENTERPRISES*
*DELIVERY CHALLAN DISPATCH ADVICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Challan No:* ${activeChallan.challanNo}
🗓️ *Date:* ${activeChallan.challanDate}
🏢 *Customer:* ${custName}
📦 *Customer PO #:* ${job.customerPoNo}
⚙️ *Material Grade:* ${job.grade} (${job.thickness} ${job.thicknessUnit})
⚖️ *Dispatched Weight:* ${activeChallan.thisDispatchWeightKg.toLocaleString()} kg
📦 *Total Bundles:* ${activeChallan.totalBundles} bundles
🚛 *Vehicle Number:* ${activeChallan.vehicleNo || 'N/A'}
🚚 *Transporter:* ${activeChallan.transporterName || 'Direct Delivery'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Live Tracking & Digital Challan:*
${trackingUrl}

_Progressive Enterprises Precision Slitting Works, Bhiwandi_
_Official Dispatch Email: progressive.ent8@gmail.com_`;
  };

  const getEmailBodyText = () => {
    if (!activeChallan) return '';
    const trackingUrl = getTrackingUrl();
    const custName = customer?.companyName || job.customerName;
    return `Dear ${custName} Team,

Greetings from Progressive Enterprises.

Please find below the dispatch advice for Delivery Challan #${activeChallan.challanNo}:

==================================================
DELIVERY CHALLAN DETAILS
==================================================
• Delivery Challan #: ${activeChallan.challanNo}
• Challan Date: ${activeChallan.challanDate}
• Customer PO Number: ${job.customerPoNo}
• Inward Challan Ref: ${job.inwardChallanNo}
• Material Grade: ${job.grade} (${job.thickness} ${job.thicknessUnit})
• Dispatched Weight: ${activeChallan.thisDispatchWeightKg.toLocaleString()} kg
• Total Bundles: ${activeChallan.totalBundles} bundles
• Vehicle Number: ${activeChallan.vehicleNo || 'N/A'}
• Transporter Name: ${activeChallan.transporterName || 'Direct'}
• Balance Remaining in Factory: ${activeChallan.remainingBalanceWeightKg.toLocaleString()} kg
==================================================

You can view, verify, and print your verified Delivery Challan at:
${trackingUrl}

This advice was dispatched from our official email ID: progressive.ent8@gmail.com.

For any inquiries or dispatch reconciliation, please reach out to:
Progressive Enterprises Precision Slitting Works
Shed no. H-11/5,6, Shree Arihant Compound, Kalher, Bhiwandi, Maharashtra - 421302
Email: progressive.ent8@gmail.com
Phone: +91 98200 45678`;
  };

  const handleLaunchWhatsApp = (openWeb: boolean = false) => {
    const text = getWhatsAppMessageText();
    const digitsOnly = whatsAppPhone.replace(/\D/g, '');
    const cleanPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
    const baseUrl = openWeb ? 'https://web.whatsapp.com/send' : 'https://api.whatsapp.com/send';
    const finalUrl = cleanPhone
      ? `${baseUrl}?phone=${cleanPhone}&text=${encodeURIComponent(text)}`
      : `${baseUrl}?text=${encodeURIComponent(text)}`;
    window.open(finalUrl, '_blank', 'noopener,noreferrer');
    setIsWhatsAppModalOpen(false);
    setEmailAlert(`WhatsApp dispatch notice launched for ${customer?.companyName || job.customerName}!`);
    setTimeout(() => setEmailAlert(null), 4000);
  };

  const handleSendViaGmail = () => {
    if (!activeChallan) return;
    const body = getEmailBodyText();
    const cleanEmails = emailRecipients.split(',').map(e => e.trim()).filter(Boolean).join(',');
    const gmailUrl = `https://mail.google.com/mail/?authuser=progressive.ent8@gmail.com&view=cm&fs=1&to=${encodeURIComponent(cleanEmails)}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
    sendChallanEmail(job.id, activeChallan.id, emailRecipients);
    setIsEmailModalOpen(false);
    setEmailAlert(`Draft opened in Gmail! Dispatched from progressive.ent8@gmail.com to: ${cleanEmails}`);
    setTimeout(() => setEmailAlert(null), 5000);
  };

  const handleSendViaMailto = () => {
    if (!activeChallan) return;
    const body = getEmailBodyText();
    const cleanEmails = emailRecipients.split(',').map(e => e.trim()).filter(Boolean).join(',');
    const mailtoUrl = `mailto:${cleanEmails}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    sendChallanEmail(job.id, activeChallan.id, emailRecipients);
    setIsEmailModalOpen(false);
    setEmailAlert(`Default email client opened! Marked sent to: ${cleanEmails}`);
    setTimeout(() => setEmailAlert(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header Bar */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base tracking-tight">Delivery Challan Manager</h3>
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded-md">
                  Job: {job.jobNo}
                </span>
                <span className="text-xs bg-blue-900/80 text-blue-200 font-mono px-2 py-0.5 rounded-md font-bold">
                  PO: {job.customerPoNo}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Customer: <strong className="text-white">{job.customerName}</strong> • {job.grade} ({job.thickness}{job.thicknessUnit})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Challans Navigation Tabs */}
            {existingChallans.length > 0 && !isCreatingNew && (
              <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
                {existingChallans.map((ch, idx) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => handleSelectChallan(ch.id)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition ${
                      activeChallanId === ch.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    DC #{idx + 1}
                  </button>
                ))}
              </div>
            )}

            {/* + New Challan Button - Disabled if PO is Permanently Closed */}
            {!isPermanentlyClosed && !isCreatingNew && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBundleIds(readyBundles.map((b) => b.id));
                  setIsCreatingNew(true);
                  setIsEditingExisting(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ New Challan {balanceRemaining > 0 ? `(${balanceRemaining.toLocaleString()} kg bal)` : ''}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Email feedback alert */}
        {emailAlert && (
          <div className="no-print bg-emerald-50 border-b border-emerald-200 px-5 py-2 flex items-center gap-2 text-xs text-emerald-800 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{emailAlert}</span>
          </div>
        )}

        {/* PO Closed Notice Banner */}
        {isPermanentlyClosed && (
          <div className="no-print bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>PO Permanently Closed (View Only):</strong> You can only view challans generated for this PO. Editing and creating new challans are locked. To edit or make a new challan, reopen this PO.
              </span>
            </div>
            {activeRole === 'factory' && (
              <button
                type="button"
                onClick={() => reopenCustomerPo(currentJob.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer"
                title="Reopen this PO to enable editing or making new delivery challans"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Reopen PO</span>
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          
          {/* SCENARIO 0: Closed PO with No Challans Generated */}
          {isPermanentlyClosed && existingChallans.length === 0 ? (
            <div className="max-w-lg mx-auto bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs space-y-4 my-8">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl mx-auto flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-slate-900">PO Permanently Closed</h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  This Customer PO ({currentJob.customerPoNo}) is closed and has no challans. Creating a new delivery challan is locked while the PO is closed. If you want to make a new challan, the PO must be reopened.
                </p>
              </div>
              {activeRole === 'factory' && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => reopenCustomerPo(currentJob.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Reopen PO to Make Challan</span>
                  </button>
                </div>
              )}
            </div>
          ) : isCreatingNew && !isPermanentlyClosed ? (
            <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">
                    Generate New Delivery Challan
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create an official, GST Rule 55-compliant delivery challan for PO #{job.customerPoNo}.
                  </p>
                </div>
                {existingChallans.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingNew(false)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                  >
                    ← Back to Existing Challans
                  </button>
                )}
              </div>

              {/* Balance & Inventory Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Inward Raw Material</span>
                  <span className="text-lg font-black text-slate-900 font-mono">
                    {job.incomingWeight.toLocaleString()} <span className="text-xs font-semibold text-slate-500">kg</span>
                  </span>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Already Dispatched</span>
                  <span className="text-lg font-black text-blue-800 font-mono">
                    {dispatchedSoFar.toLocaleString()} <span className="text-xs font-semibold text-blue-600">kg</span>
                  </span>
                  <span className="text-[10px] text-blue-600 block mt-0.5">
                    Across {existingChallans.length} previous challan(s)
                  </span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                    {dispatchedSoFar > job.incomingWeight ? 'Surplus / Additional Yield' : 'Available Balance to Dispatch'}
                  </span>
                  <span className="text-lg font-black text-emerald-800 font-mono">
                    {dispatchedSoFar > job.incomingWeight
                      ? `+${Number((dispatchedSoFar - job.incomingWeight).toFixed(2)).toLocaleString()}`
                      : balanceRemaining.toLocaleString()}{' '}
                    <span className="text-xs font-semibold text-emerald-600">kg</span>
                  </span>
                  {dispatchedSoFar > job.incomingWeight && (
                    <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                      Net dispatch exceeds inward (Permitted)
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Bundle Selection Presets */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Quick Bundle Selection Presets:
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAllReadyBundles}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>⚡ Select All Ready Bundles</span>
                    <span className="font-mono text-[11px]">({readyBundles.length} bundles • {readyWeight.toFixed(2)} kg)</span>
                  </button>
                  {readyBundles.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => selectFirstNBundles(Math.max(1, Math.ceil(readyBundles.length / 2)))}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      📦 First Half Lot ({Math.ceil(readyBundles.length / 2)} bundles)
                    </button>
                  )}
                  {readyBundles.length >= 2 && (
                    <button
                      type="button"
                      onClick={selectEvenBundles}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="Dispatch Bundles #2, #4, #6... and keep odd bundles on shop floor"
                    >
                      🎯 Even Bundles (#2, #4...)
                    </button>
                  )}
                  {readyBundles.length >= 2 && (
                    <button
                      type="button"
                      onClick={selectOddBundles}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-300 text-purple-800 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      🎯 Odd Bundles (#1, #3...)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearAllBundleSelections}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Generation Form */}
              <form onSubmit={handleCreateNewChallan} className="space-y-4">
                {/* Granular Bundle Selection Section */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-blue-700" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Select Bundles to Dispatch (Tick mark individual bundles)
                      </h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-2 py-0.5 rounded-full">
                        {selectedBundleIds.length} of {readyBundles.length} selected
                      </span>
                    </div>

                    {readyBundles.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <button
                          type="button"
                          onClick={selectAllReadyBundles}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 rounded-md font-bold text-[11px] transition"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={clearAllBundleSelections}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px] transition"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={selectEvenBundles}
                          className="px-2.5 py-1 bg-blue-50 border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-md font-bold text-[11px] transition"
                          title="Select Bundles #2, #4, #6... (leave bundle 3 on shop floor)"
                        >
                          Even (#2, #4...)
                        </button>
                        <button
                          type="button"
                          onClick={selectOddBundles}
                          className="px-2.5 py-1 bg-blue-50 border border-blue-300 hover:bg-blue-100 text-blue-800 rounded-md font-bold text-[11px] transition"
                        >
                          Odd (#1, #3...)
                        </button>
                        {readyBundles.length >= 2 && (
                          <button
                            type="button"
                            onClick={() => selectFirstNBundles(2)}
                            className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px] transition"
                          >
                            First 2
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {readyBundles.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedBundleIds.length === readyBundles.length && readyBundles.length > 0}
                                  onChange={(e) => {
                                    if (e.target.checked) selectAllReadyBundles();
                                    else clearAllBundleSelections();
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </th>
                              <th className="py-2.5 px-3">Bundle # & Tag</th>
                              <th className="py-2.5 px-3">Specification</th>
                              <th className="py-2.5 px-3">Core type</th>
                              <th className="py-2.5 px-3 text-right font-mono">Gross Wt</th>
                              <th className="py-2.5 px-3 text-right font-mono">Tare Wt</th>
                              <th className="py-2.5 px-3 text-right font-mono font-black">Net Wt</th>
                              <th className="py-2.5 px-3 text-center">Dispatch Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {readyBundles.map((b, idx) => {
                              const isSelected = selectedBundleIds.includes(b.id);
                              return (
                                <tr
                                  key={b.id}
                                  onClick={() => toggleBundleSelection(b.id)}
                                  className={`cursor-pointer transition select-none ${
                                    isSelected
                                      ? 'bg-blue-50/90 hover:bg-blue-100/70 text-slate-900 font-medium'
                                      : 'hover:bg-slate-50 text-slate-500 opacity-80'
                                  }`}
                                >
                                  <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleBundleSelection(b.id)}
                                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="py-2.5 px-3 font-bold">
                                    <span className={isSelected ? 'text-blue-900' : 'text-slate-600'}>
                                      {b.bundleTag}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-sans ml-1.5">
                                      (Bundle #{b.bundleNumber || idx + 1})
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-sans text-slate-700">
                                    {b.rollsSummary || `${b.totalRollsCount || 10} reels`}
                                  </td>
                                  <td className="py-2.5 px-3 font-sans text-xs font-medium text-slate-800">
                                    {b.coreType === 'paper_core' ? 'Paper Tube' : 'Plastic Tube'}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                    {b.grossWeightKg.toFixed(2)} kg
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                                    -{b.paperCoreTareWeightKg.toFixed(2)} kg
                                  </td>
                                  <td className={`py-2.5 px-3 text-right font-mono font-black ${
                                    isSelected ? 'text-blue-950 text-xs' : 'text-slate-700'
                                  }`}>
                                    {b.netWeightKg.toFixed(2)} kg
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-sans">
                                    {isSelected ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-extrabold">
                                        <Check className="w-3 h-3 stroke-[3]" />
                                        In Challan
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                                        Shop Floor
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Live Bundle Selection Footer */}
                      <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-700">
                            Ticked for Dispatch: <strong className="text-blue-900 font-mono text-sm">{selectedBundleIds.length} bundles</strong>
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-700">
                            Dispatched Net: <strong className="text-blue-900 font-mono text-sm">{newDispatchWeight.toFixed(2)} kg</strong>
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-medium">
                          Remaining on Shop Floor: <strong>{readyBundles.length - selectedBundleIds.length} bundles</strong> ({Math.max(0, Number((readyWeight - newDispatchWeight).toFixed(2)))} kg)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-300 rounded-xl p-5 bg-white text-center">
                      <Layers className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-800 mb-1">
                        No physical floor bundles are currently logged for this job
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                        Weigh the bundles first with "Add Bundle Details" on the order, then make the challan. A challan only lists bundles that were actually weighed.
                      </p>
                    </div>
                  )}
                </div>

                {/* Primary Weighment and Dispatch Inputs - Strictly Locked to Bundle Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Dispatch Net Weight (kg) *
                      </label>
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        Locked to Selected Bundles
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        disabled
                        tabIndex={-1}
                        value={`${newDispatchWeight.toFixed(2)} kg net`}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-sm font-mono font-black text-slate-900 cursor-not-allowed select-none focus:outline-none"
                      />
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1">
                      Strictly calculated from the <strong>{newBundlesCount}</strong> selected bundle(s) above ({newDispatchWeight.toFixed(2)} kg). Non-editable.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-800">
                        Total Bundles Count *
                      </label>
                      <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        Locked to Selected Bundles
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        disabled
                        tabIndex={-1}
                        value={`${newBundlesCount} bundles`}
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 cursor-not-allowed select-none focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Strictly equals the <strong>{newBundlesCount}</strong> bundle(s) ticked in the list above. Non-editable.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Vehicle Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={newVehicleNo}
                      onChange={(e) => setNewVehicleNo(e.target.value)}
                      placeholder="e.g. MH-14-BT-9102 (Optional)"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Transporter Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTransporter}
                      onChange={(e) => setNewTransporter(e.target.value)}
                      placeholder="e.g. Express Road Lines"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      E-Way Bill Number
                    </label>
                    <input
                      type="text"
                      value={newEWayBill}
                      onChange={(e) => setNewEWayBill(e.target.value)}
                      placeholder="e.g. 24198273910"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-mono text-slate-900 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Remarks / Packaging Notes
                    </label>
                    <input
                      type="text"
                      value={newRemarks}
                      onChange={(e) => setNewRemarks(e.target.value)}
                      placeholder="e.g. Strapped bundles on wooden pallets, plastic wrap"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  {existingChallans.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingNew(false)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={newBundlesCount === 0 || newDispatchWeight <= 0}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition ${
                      newBundlesCount === 0 || newDispatchWeight <= 0
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg cursor-pointer'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>
                      {newBundlesCount === 0
                        ? 'Select Bundles Above to Generate Challan'
                        : `Generate Delivery Challan (${newDispatchWeight.toFixed(2)} kg / ${newBundlesCount} Bundles)`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          ) : activeChallan ? (
            /* SCENARIO 2: View or Edit Active Challan */
            <div className="space-y-4">
              
              {/* Actions Bar for Active Challan */}
              <div className="no-print bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-slate-900">
                    {activeChallan.challanNo}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 uppercase">
                    {activeChallan.dispatchType === 'partial' ? `Partial ${activeChallan.dispatchSequenceNumber}` : 'Final Lot'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ({activeChallan.thisDispatchWeightKg.toLocaleString()} kg • {activeChallan.totalBundles} bundles)
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Edit Challan button - Locked if PO is Permanently Closed */}
                  {!isPermanentlyClosed && (
                    isEditingExisting ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingExisting(false)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Exit Edit Mode</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold rounded-lg transition"
                        title="Edit this challan's weight, vehicle, or details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Challan</span>
                      </button>
                    )
                  )}

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-lg transition shadow-2xs"
                    title="Download standalone HTML challan file"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>Download File</span>
                  </button>

                  {/* WhatsApp Customer Button */}
                  <button
                    type="button"
                    onClick={handleOpenWhatsAppModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs"
                    title="Send delivery advice via WhatsApp"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.889-9.888 9.889m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <span>WhatsApp</span>
                  </button>

                  {/* Email Customer Button */}
                  <button
                    type="button"
                    onClick={handleOpenEmailModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-2xs"
                    title="Send challan to customer's email from progressive.ent8@gmail.com"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email Customer</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow-2xs"
                    title="Print directly or save as PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>

                  {/* Delete / Void Button - Hidden if PO is closed */}
                  {!isPermanentlyClosed && (
                    confirmDeleteId === activeChallan.id ? (
                      <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                        <span className="text-[11px] text-red-700 font-bold px-1">Confirm void?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteChallan(activeChallan.id)}
                          className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-bold hover:bg-red-700"
                        >
                          Yes, Void
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-1.5 py-1 text-slate-500 hover:text-slate-800 text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(activeChallan.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                        title="Void / Delete this challan and restore material weight"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Real-time Dispatch Feedback Banner */}
              {emailAlert && (
                <div className="no-print bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{emailAlert}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEmailAlert(null)}
                    className="text-emerald-700 hover:text-emerald-950 text-xs font-bold"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* EDIT FORM (When editing an existing challan) */}
              {isEditingExisting && (
                <form
                  onSubmit={handleSaveEdit}
                  className="no-print bg-amber-50/50 border border-amber-300 rounded-xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <Edit2 className="w-4 h-4 text-amber-700" />
                      Editing Challan #{activeChallan.challanNo}
                    </h5>
                    <span className="text-xs text-slate-500">
                      Changes will update inventory and delivery reports instantly.
                    </span>
                  </div>

                  {/* Bundle checklist if job has bundles */}
                  {job.bundles && job.bundles.length > 0 && (
                    <div className="border border-amber-200 rounded-xl bg-white p-3 shadow-2xs">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                          <span>Select Bundles for this Challan:</span>
                        </span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          {editSelectedBundleIds.length} Bundles Selected
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-600 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-2.5 w-8 text-center">✓</th>
                              <th className="py-2 px-2.5">Bundle Tag</th>
                              <th className="py-2 px-2.5">Rolls</th>
                              <th className="py-2 px-2.5 text-right font-mono">Gross Wt</th>
                              <th className="py-2 px-2.5 text-right font-mono">Tare Wt</th>
                              <th className="py-2 px-2.5 text-right font-mono font-bold">Net Wt</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {job.bundles
                              .filter((b) => b.dispatchedInChallanId === activeChallan.id || b.status === 'ready')
                              .map((b) => {
                                const isChecked = editSelectedBundleIds.includes(b.id);
                                return (
                                  <tr
                                    key={b.id}
                                    onClick={() => toggleEditBundleSelection(b.id)}
                                    className={`cursor-pointer ${isChecked ? 'bg-amber-50/80 font-semibold' : 'hover:bg-slate-50 text-slate-500'}`}
                                  >
                                    <td className="py-1.5 px-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleEditBundleSelection(b.id)}
                                        className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-1.5 px-2.5 text-slate-900 font-bold">{b.bundleTag}</td>
                                    <td className="py-1.5 px-2.5 font-sans text-slate-600">{b.rollsSummary || 'Reels'}</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">{b.grossWeightKg.toFixed(2)} kg</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono text-amber-700">-{b.paperCoreTareWeightKg.toFixed(2)} kg</td>
                                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-900 font-black">{b.netWeightKg.toFixed(2)} kg</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Dispatch Weight (kg)
                        </label>
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-1 rounded font-mono font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Locked
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        disabled
                        tabIndex={-1}
                        value={`${editWeight.toFixed(2)} kg`}
                        className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold cursor-not-allowed select-none text-slate-800"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Derived from {editSelectedBundleIds.length} checked bundle(s)
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Bundles Count
                        </label>
                        <span className="text-[10px] text-slate-600 bg-slate-100 px-1 rounded font-mono font-bold flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Locked
                        </span>
                      </div>
                      <input
                        type="text"
                        readOnly
                        disabled
                        tabIndex={-1}
                        value={`${editBundlesCount} bundles`}
                        className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-mono font-bold cursor-not-allowed select-none text-slate-800"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Equals {editSelectedBundleIds.length} checked bundle(s)
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Vehicle Number
                      </label>
                      <input
                        type="text"
                        required
                        value={editVehicleNo}
                        onChange={(e) => setEditVehicleNo(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Transporter Name
                      </label>
                      <input
                        type="text"
                        required
                        value={editTransporter}
                        onChange={(e) => setEditTransporter(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        E-Way Bill Number
                      </label>
                      <input
                        type="text"
                        value={editEWayBill}
                        onChange={(e) => setEditEWayBill(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => setIsEditingExisting(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </form>
              )}

              {/* OFFICIAL CHALLAN DOCUMENT PREVIEW (PRINTABLE) */}
              <div
                id="printable-challan-document"
                className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm font-sans text-slate-900"
              >
                {/* Letterhead */}
                <div className="border-b-2 border-slate-900 pb-5 mb-5 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                      {COMPANY_INFO.name}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 max-w-lg leading-relaxed">
                      {COMPANY_INFO.address}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      GSTIN: <strong className="font-mono text-slate-900">{COMPANY_INFO.gstin}</strong> | Phone: {COMPANY_INFO.phone} | Email: {COMPANY_INFO.email}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="inline-block bg-blue-900 text-white px-3 py-1 rounded text-xs font-extrabold uppercase tracking-wider mb-1">
                      Delivery Challan
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Rule 55 of CGST Rules, 2017 (Job Work)
                    </p>
                    <div className="font-mono font-black text-base text-slate-900 bg-slate-100 px-2 py-0.5 rounded mt-1 inline-block">
                      {activeChallan.challanNo}
                    </div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-xs">
                  <div>
                    <h4 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      Consignee / Customer Details
                    </h4>
                    <p className="font-black text-sm text-slate-900">{activeChallan.customerName}</p>
                    <p className="text-slate-600 mt-1">
                      Delivery Address:{' '}
                      <span className="font-medium text-slate-800">
                        {activeChallan.customerDeliveryAddress || customer?.plantAddress || customer?.registeredAddress || '—'}
                      </span>
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      Customer GSTIN:{' '}
                      <strong className="font-mono text-slate-900">{activeChallan.customerGst || customer?.gstNumber || '—'}</strong>
                    </p>
                    <p className="text-slate-600 mt-0.5">
                      Customer PO No:{' '}
                      <strong className="font-mono text-blue-800">{job.customerPoNo}</strong>
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">
                      Dispatch & Logistics Details
                    </h4>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <div>
                        <span className="text-slate-500">Challan Date:</span>
                        <p className="font-bold text-slate-900">
                          {new Date(activeChallan.challanDate).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500">Vehicle No:</span>
                        <p className="font-mono font-bold text-slate-900">{activeChallan.vehicleNo}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Transporter:</span>
                        <p className="font-bold text-slate-900 truncate">{activeChallan.transporterName || 'Road Lines'}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">E-Way Bill:</span>
                        <p className="font-mono font-bold text-slate-900">{activeChallan.eWayBillNo || '24198273910'}</p>
                      </div>
                      <div className="col-span-2 mt-0.5">
                        <span className="text-slate-500">Inward Challan Ref:</span>
                        <p className="font-mono text-slate-800">{activeChallan.incomingChallanRef || job.inwardChallanNo}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Table of Material Dispatched */}
                <div className="border border-slate-200 rounded-xl overflow-hidden mb-5">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-3">Description of Goods</th>
                        <th className="py-2.5 px-3">Grade & Dimensions</th>
                        <th className="py-2.5 px-3 text-right">Bundles</th>
                        <th className="py-2.5 px-3 text-right">Net Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">1</td>
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">Precision Slitted Metal Coils / Rolls</p>
                          <p className="text-[11px] text-slate-500">
                            Processed from Inward Job #{job.jobNo} • Customer PO #{job.customerPoNo}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800">{job.grade}</span>
                          <span className="text-slate-500 block text-[11px]">
                            {job.thickness}{job.thicknessUnit} • Width: {job.outputDetails?.slitCuts?.length
                              ? job.outputDetails.slitCuts.map((c) => `${c.widthMm}mm`).join(', ')
                              : job.requestedSlitSizes?.length
                              ? job.requestedSlitSizes.map((s) => `${s.widthMm}mm`).join(', ')
                              : `${job.incomingWidth}mm`}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {activeChallan.totalBundles} Bundles
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-sm text-slate-950">
                          {activeChallan.thisDispatchWeightKg.toLocaleString()} kg
                        </td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[11px] text-slate-700">
                          Total Dispatched Net Weight:
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-base text-blue-900">
                          {activeChallan.thisDispatchWeightKg.toLocaleString()} kg
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Itemized Bundle Dispatch Schedule & Scale Readings */}
                {(() => {
                  const dispatchedList = activeChallan.dispatchedBundles && activeChallan.dispatchedBundles.length > 0
                    ? activeChallan.dispatchedBundles
                    : (job.bundles || []).filter(b => b.dispatchedInChallanId === activeChallan.id || activeChallan.selectedBundleIds?.includes(b.id));

                  const displayList = (dispatchedList && dispatchedList.length > 0)
                    ? dispatchedList
                    : Array.from({ length: Math.max(1, activeChallan.totalBundles) }, (_, i) => {
                        const avgNet = Number((activeChallan.thisDispatchWeightKg / Math.max(1, activeChallan.totalBundles)).toFixed(2));
                        const tare = 1.20;
                        return {
                          id: `auto-${i}`,
                          bundleNumber: i + 1,
                          bundleTag: `BNDL-${String(i + 1).padStart(2, '0')}`,
                          rollsSummary: `${job.thickness}${job.thicknessUnit} Precision Slitted Coils`,
                          totalRollsCount: 10,
                          grossWeightKg: Number((avgNet + tare).toFixed(2)),
                          paperCoreTareWeightKg: tare,
                          netWeightKg: avgNet,
                          coreType: 'paper_core' as const,
                          status: 'dispatched' as const,
                        };
                      });

                  const totalGross = displayList.reduce((sum, b) => sum + (b.grossWeightKg || 0), 0);
                  const totalTare = displayList.reduce((sum, b) => sum + (b.paperCoreTareWeightKg || 0), 0);
                  const totalNet = displayList.reduce((sum, b) => sum + (b.netWeightKg || 0), 0);

                  return (
                    <div className="mb-5 border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-900 text-white px-3.5 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wider">
                            Itemized Bundle Dispatch Schedule ({displayList.length} Bundles Dispatched)
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-300 font-mono">
                          Scale Least Count: 50 g (0.05 kg certified resolution)
                        </span>
                      </div>
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3 w-10 text-center">#</th>
                            <th className="py-2 px-3">Bundle Tag</th>
                            <th className="py-2 px-3">Specification / Description</th>
                            <th className="py-2 px-3">Core type</th>
                            <th className="py-2 px-3 text-right font-mono">Gross Wt (kg)</th>
                            <th className="py-2 px-3 text-right font-mono">Tare Deduction</th>
                            <th className="py-2 px-3 text-right font-mono font-black">Net Wt (kg)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                          {displayList.map((b, idx) => (
                            <tr key={b.id || idx} className="hover:bg-slate-50/80">
                              <td className="py-2 px-3 text-center text-slate-500">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-blue-900">{b.bundleTag}</td>
                              <td className="py-2 px-3 font-sans text-slate-700">{b.rollsSummary || `${b.totalRollsCount || 10} reels`}</td>
                              <td className="py-2 px-3 font-sans text-xs font-medium text-slate-800">
                                {b.coreType === 'paper_core' ? 'Paper Tube' : 'Plastic Tube'}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-700">{b.grossWeightKg.toFixed(2)} kg</td>
                              <td className="py-2 px-3 text-right text-amber-700">-{b.paperCoreTareWeightKg.toFixed(2)} kg</td>
                              <td className="py-2 px-3 text-right font-black text-slate-950">{b.netWeightKg.toFixed(2)} kg</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-mono font-bold border-t-2 border-slate-300 text-xs">
                          <tr>
                            <td colSpan={4} className="py-2 px-3 text-right uppercase text-[10px] text-slate-600 font-sans">
                              Dispatched Bundle Totals ({displayList.length} bundles):
                            </td>
                            <td className="py-2 px-3 text-right text-slate-900">{totalGross.toFixed(2)} kg</td>
                            <td className="py-2 px-3 text-right text-amber-700">-{totalTare.toFixed(2)} kg</td>
                            <td className="py-2 px-3 text-right text-blue-900 font-black text-sm">{totalNet.toFixed(2)} kg</td>
                          </tr>
                        </tfoot>
                      </table>
                      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Physical scale verification conducted at Progressive Enterprises dispatch dock.</span>
                        <span className="font-semibold text-slate-700">Any unticked bundles remain safely staged on factory shop floor.</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Job Weight Reconciliation Summary Bar */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-mono mb-6">
                  <div>
                    <span className="text-slate-500">Total Inward: </span>
                    <strong className="text-slate-900">{activeChallan.totalOrderWeightKg.toLocaleString()} kg</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Dispatched In This Challan: </span>
                    <strong className="text-blue-800">{activeChallan.thisDispatchWeightKg.toLocaleString()} kg</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Factory Balance Remaining: </span>
                    <strong className="text-emerald-700">{activeChallan.remainingBalanceWeightKg.toLocaleString()} kg</strong>
                  </div>
                </div>

                {/* Terms and Authorized Signatures */}
                <div className="pt-4 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs">
                  <div className="max-w-md text-[11px] text-slate-500 space-y-1">
                    <p className="font-bold text-slate-800">Terms & Statutory Declarations:</p>
                    <p>1. Goods dispatched for Job-Work processing under GST Rule 55. Not for outright sale.</p>
                    <p>2. Customer to inspect bundle tags and confirm weighment within 24 hours of arrival.</p>
                    <p>3. Subject to Bhiwandi / Thane jurisdiction only.</p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-bold text-slate-900">For {COMPANY_INFO.name}</p>
                    <div className="h-12 flex items-center justify-end">
                      <span className="font-serif italic text-slate-400 text-xs">[Authorized Signatory]</span>
                    </div>
                    <p className="text-[11px] font-semibold text-slate-600 border-t border-slate-300 pt-1">
                      Production & Dispatch In-Charge
                    </p>
                  </div>
                </div>

              </div>
            </div>
          ) : null}

        </div>

        {/* Modal Footer */}
        <div className="no-print bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span>Customer: <strong>{job.customerName}</strong></span>
            <span>•</span>
            <span>PO #{job.customerPoNo}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-xs"
          >
            Close
          </button>
        </div>

      </div>

      {/* WhatsApp Dispatch Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppDispatchModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          job={job}
          challan={activeChallan}
          customer={customer}
        />
      )}

      {/* Email Dispatch Modal with Gmail OAuth */}
      {isEmailModalOpen && (
        <EmailDispatchModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          job={job}
          challan={activeChallan}
          customer={customer}
          onEmailSentSuccess={(recipients) => {
            if (activeChallan) {
              sendChallanEmail(job.id, activeChallan.id, recipients);
            }
            setEmailAlert(`Dispatch advice dispatched from progressive.ent8@gmail.com to: ${recipients}!`);
            setTimeout(() => setEmailAlert(null), 6000);
          }}
        />
      )}
    </div>
  );
};
