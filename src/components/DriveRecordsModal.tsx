import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward, DeliveryChallan } from '../types';
import { COMPANY_INFO } from '../data/mockData';
import { downloadChallanAsHtml } from '../utils/challanExport';
import {
  FolderArchive,
  Search,
  FileText,
  Printer,
  Mail,
  ExternalLink,
  X,
  HardDrive,
  Calendar,
  CheckCircle2,
  Filter,
  Download,
  Link2,
  Check,
  Truck
} from 'lucide-react';

interface DriveRecordsModalProps {
  onClose: () => void;
  onOpenChallan: (job: MaterialInward) => void;
}

export const DriveRecordsModal: React.FC<DriveRecordsModalProps> = ({
  onClose,
  onOpenChallan,
}) => {
  const { jobs, driveWebLink, setDriveWebLink } = useProduction();
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [showDriveUrlEditor, setShowDriveUrlEditor] = useState(false);
  const [customDriveUrl, setCustomDriveUrl] = useState(driveWebLink);
  const [copiedPath, setCopiedPath] = useState(false);

  // Flatten all challans across all jobs
  const allChallanEntries: { challan: DeliveryChallan; job: MaterialInward }[] = [];
  jobs.forEach((job) => {
    const list =
      job.challans && job.challans.length > 0
        ? job.challans
        : job.challan
        ? [job.challan]
        : [];
    list.forEach((ch) => {
      allChallanEntries.push({ challan: ch, job });
    });
  });

  const filteredEntries = allChallanEntries.filter(({ challan, job }) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      challan.challanNo.toLowerCase().includes(q) ||
      (job.customerPoNo || '').toLowerCase().includes(q) ||
      job.customerName.toLowerCase().includes(q) ||
      job.grade.toLowerCase().includes(q) ||
      challan.vehicleNo.toLowerCase().includes(q) ||
      (challan.transporterName || '').toLowerCase().includes(q);

    const matchesCustomer =
      customerFilter === 'ALL' || job.customerId === customerFilter;

    return matchesSearch && matchesCustomer;
  });

  const uniqueCustomers = Array.from(
    new Set(allChallanEntries.map((e) => e.job.customerId))
  ).map((cid) => {
    const entry = allChallanEntries.find((e) => e.job.customerId === cid);
    return { id: cid, name: entry?.job.customerName || cid };
  });

  const totalDispatchedKg = allChallanEntries.reduce(
    (acc, e) => acc + (e.challan.thisDispatchWeightKg || e.challan.totalNetWeightKg || 0),
    0
  );

  const handleOpenGoogleDrive = () => {
    window.open(driveWebLink, '_blank', 'noopener,noreferrer');
  };

  const handleSaveDriveUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customDriveUrl.trim()) {
      setDriveWebLink(customDriveUrl.trim());
    }
    setShowDriveUrlEditor(false);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(COMPANY_INFO.driveStorageFolder);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/30 border border-emerald-400/30 rounded-xl text-emerald-300">
              <FolderArchive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">Google Drive Records & Challan Archive</h3>
              <p className="text-xs text-slate-300 flex items-center gap-1.5 font-mono mt-0.5">
                <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                {COMPANY_INFO.driveStorageFolder}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenGoogleDrive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
              title="Open Google Drive folder in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Google Drive</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drive URL bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span className="font-bold">Active Drive Folder URL:</span>
            <code className="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono text-[11px] text-blue-900 select-all max-w-sm truncate">
              {driveWebLink}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDriveUrlEditor(!showDriveUrlEditor)}
              className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
            >
              <Link2 className="w-3 h-3" /> Change Link
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleCopyPath}
              className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              {copiedPath ? <span className="text-emerald-700 font-bold">Copied!</span> : 'Copy Path'}
            </button>
          </div>
        </div>

        {/* Edit Drive URL popover */}
        {showDriveUrlEditor && (
          <form
            onSubmit={handleSaveDriveUrl}
            className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex flex-wrap items-center gap-3 text-xs"
          >
            <span className="font-bold text-amber-900">Custom Google Drive URL:</span>
            <input
              type="url"
              required
              value={customDriveUrl}
              onChange={(e) => setCustomDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="flex-1 min-w-[240px] px-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-xs"
            >
              Save Link
            </button>
            <button
              type="button"
              onClick={() => setShowDriveUrlEditor(false)}
              className="px-2 py-1 text-slate-600 text-xs"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Stats Strip */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div>
            <span className="text-slate-500 block">Total Generated Challans</span>
            <span className="font-black text-slate-900 text-sm">{allChallanEntries.length} documents</span>
          </div>
          <div>
            <span className="text-slate-500 block">Total Material Dispatched</span>
            <span className="font-black text-blue-700 text-sm">{totalDispatchedKg.toLocaleString()} kg</span>
          </div>
          <div>
            <span className="text-slate-500 block">Drive Cloud Backup</span>
            <span className="font-bold text-emerald-700 flex items-center gap-1 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> 100% Backed Up
            </span>
          </div>
          <div>
            <span className="text-slate-500 block">Compliance Standard</span>
            <span className="font-semibold text-slate-700 text-xs">Rule 55, CGST 2017</span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-3 items-center justify-between bg-white shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search Challan #, PO #, Customer, Grade, Vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Customers ({allChallanEntries.length})</option>
              {uniqueCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Challans List */}
        <div className="overflow-y-auto p-4 flex-1 space-y-3 bg-slate-50/50">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FolderArchive className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-slate-600">No matching archived challans found</p>
              <p className="text-xs text-slate-400 mt-1">
                Challans will appear here as soon as they are generated for any job or customer PO.
              </p>
            </div>
          ) : (
            filteredEntries.map(({ challan, job }) => {
              const weight = challan.thisDispatchWeightKg || challan.totalNetWeightKg || 0;
              return (
                <div
                  key={challan.id}
                  className="bg-white hover:bg-slate-50/80 border border-slate-200 rounded-xl p-4 transition shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {challan.challanNo}
                        </span>
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                          {challan.dispatchType === 'partial' ? `Partial ${challan.dispatchSequenceNumber || 1}` : 'Final Lot'}
                        </span>
                        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Backed Up
                        </span>
                      </div>

                      <div className="font-bold text-xs text-slate-800 mt-1">
                        {challan.customerName} • <span className="font-mono text-blue-800">PO: {job.customerPoNo}</span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>
                          <strong>Grade:</strong> {job.grade} ({job.thickness}{job.thicknessUnit})
                        </span>
                        <span>
                          <strong>Net Wt:</strong> {weight.toLocaleString()} kg
                        </span>
                        <span>
                          <strong>Bundles:</strong> {challan.totalBundles}
                        </span>
                        <span>
                          <strong>Vehicle:</strong> {challan.vehicleNo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => downloadChallanAsHtml(challan, job)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                      title="Download HTML challan file"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenChallan(job);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>View & Edit</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>All challans stored permanently with full audit history & tax compliance</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            Close Archive
          </button>
        </div>

      </div>
    </div>
  );
};
