import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { Customer } from '../types';
import {
  Users,
  Building2,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Copy,
  Check,
  Share2,
  X,
  ExternalLink,
  ShieldCheck,
  Send,
  Save,
  Phone,
  FileText
} from 'lucide-react';

interface CustomerManagementModalProps {
  onClose: () => void;
}

export const CustomerManagementModal: React.FC<CustomerManagementModalProps> = ({ onClose }) => {
  const {
    customers,
    updateCustomer,
    addCustomer,
    addAuthorizedEmail,
    removeAuthorizedEmail,
    jobs,
  } = useProduction();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers[0]?.id || ''
  );
  const [newEmailInput, setNewEmailInput] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Customer Form State
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    companyName: '',
    email: '',
    authorizedEmails: [] as string[],
    phone: '',
    gstNumber: '',
    panNumber: '',
    registeredAddress: '',
    plantAddress: '',
    city: '',
    state: 'Maharashtra',
    stateCode: '27',
  });

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) || customers[0];

  // Editable customer state
  const [editForm, setEditForm] = useState<Customer>(selectedCustomer);

  // When selected customer changes, sync editForm
  React.useEffect(() => {
    if (selectedCustomer) {
      setEditForm(selectedCustomer);
    }
  }, [selectedCustomerId, selectedCustomer]);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    updateCustomer(editForm.id, {
      name: editForm.name,
      companyName: editForm.companyName,
      email: editForm.email,
      phone: editForm.phone,
      gstNumber: editForm.gstNumber,
      panNumber: editForm.panNumber,
      registeredAddress: editForm.registeredAddress,
      plantAddress: editForm.plantAddress,
      city: editForm.city,
      state: editForm.state,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmailInput.trim() || !newEmailInput.includes('@')) return;
    addAuthorizedEmail(selectedCustomer.id, newEmailInput.trim());
    setNewEmailInput('');
  };

  const handleCopyTrackingLink = () => {
    const origin = window.location.origin;
    const trackingUrl = `${origin}?track=${selectedCustomer.accessCode || selectedCustomer.id}`;
    navigator.clipboard.writeText(trackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerData.companyName || !newCustomerData.email) return;

    const created = addCustomer({
      ...newCustomerData,
      name: newCustomerData.name || newCustomerData.companyName.split(' ')[0],
      authorizedEmails: [newCustomerData.email],
    });

    setIsAddingCustomer(false);
    setSelectedCustomerId(created.id);
  };

  const customerJobsCount = jobs.filter((j) => j.customerId === selectedCustomer?.id).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  Customer Master Directory & Portal Access Control
                </h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded border border-blue-400/30">
                  Multiple Email ID Grants
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage registered legal addresses, plant locations, and authorize multiple email IDs for live production tracking.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[560px]">
          
          {/* Left Column: Customer Selector Sidebar */}
          <div className="md:col-span-4 bg-slate-50 border-r border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered Clients ({customers.length})
              </span>
              <button
                type="button"
                onClick={() => setIsAddingCustomer(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </button>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {customers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id && !isAddingCustomer;
                const emailCount = c.authorizedEmails?.length || 1;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomerId(c.id);
                      setIsAddingCustomer(false);
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 shadow-xs ring-1 ring-blue-500/20'
                        : 'bg-white hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{c.id}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded-full">
                        {emailCount} email{emailCount > 1 ? 's' : ''}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-1 line-clamp-1">{c.companyName}</h4>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{c.city}, {c.state}</p>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      GST: {c.gstNumber}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Customer Details & Multi-Email Access */}
          <div className="md:col-span-8 p-6 overflow-y-auto max-h-[640px]">
            {isAddingCustomer ? (
              /* Add New Customer Form */
              <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h4 className="font-extrabold text-sm text-slate-900">Register New Customer Enterprise</h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomer(false)}
                    className="text-xs text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Foil Industries Pvt. Ltd."
                      value={newCustomerData.companyName}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, companyName: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Primary Email ID *</label>
                    <input
                      type="email"
                      required
                      placeholder="purchase@apexfoil.com"
                      value={newCustomerData.email}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="27AABCA1234F1Z5"
                      value={newCustomerData.gstNumber}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, gstNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone *</label>
                    <input
                      type="text"
                      placeholder="+91 98200 12345"
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City / State</label>
                    <input
                      type="text"
                      placeholder="Mumbai / Maharashtra"
                      value={newCustomerData.city}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, city: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Registered Legal Office Address *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Full registered address as per GST registration certificate"
                    value={newCustomerData.registeredAddress}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, registeredAddress: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Plant / Delivery Works Address</label>
                  <textarea
                    rows={2}
                    placeholder="Consignee unloading plant address for delivery challans"
                    value={newCustomerData.plantAddress}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, plantAddress: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomer(false)}
                    className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs"
                  >
                    Save & Create Customer
                  </button>
                </div>
              </form>
            ) : selectedCustomer ? (
              /* View & Edit Customer Details */
              <div className="space-y-6">
                
                {/* Top Quick Actions Bar */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/40 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700">
                      Customer Unique Access Code: {selectedCustomer.accessCode}
                    </span>
                    <h4 className="font-extrabold text-sm text-slate-900 mt-0.5">
                      Shareable Live Production Tracking Link
                    </h4>
                    <p className="text-xs text-slate-500">
                      Send this link to any authorized customer representative to track all their POs live.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyTrackingLink}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Tracking Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Multiple Authorized Email IDs Card (High Priority User Request) */}
                <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-blue-600" />
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                          Authorized Email IDs Granted Login & Tracking Access
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Any user logging in with any of these email IDs will be granted full access to this customer&apos;s production orders and challans.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                      {selectedCustomer.authorizedEmails?.length || 1} Email(s)
                    </span>
                  </div>

                  {/* List of Authorized Emails */}
                  <div className="space-y-2">
                    {selectedCustomer.authorizedEmails?.map((em) => (
                      <div
                        key={em}
                        className="flex items-center justify-between bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="font-mono text-slate-800 font-medium">{em}</span>
                          {em === selectedCustomer.email && (
                            <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded">
                              Primary Account
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded">
                            Granted Access
                          </span>
                          {selectedCustomer.authorizedEmails.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAuthorizedEmail(selectedCustomer.id, em)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Revoke access for this email ID"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Email Form */}
                  <form onSubmit={handleAddEmail} className="flex gap-2 pt-2">
                    <input
                      type="email"
                      placeholder="Add another authorized email (e.g. accounts@client.com)..."
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition shrink-0"
                    >
                      + Grant Email Access
                    </button>
                  </form>
                </div>

                {/* Edit Registered Details Form */}
                <form onSubmit={handleSaveCustomer} className="space-y-4 border border-slate-200 rounded-xl p-4 bg-white shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-700" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                        Customer Legal & Plant Registered Details
                      </h4>
                    </div>
                    {saveSuccess && (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-pulse">
                        <Check className="w-3.5 h-3.5" /> Details Saved!
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Company Registered Name</label>
                      <input
                        type="text"
                        value={editForm.companyName}
                        onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">GSTIN Number</label>
                      <input
                        type="text"
                        value={editForm.gstNumber}
                        onChange={(e) => setEditForm({ ...editForm, gstNumber: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={editForm.panNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-1.5 text-xs font-mono uppercase border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">City & State</label>
                      <input
                        type="text"
                        value={`${editForm.city}, ${editForm.state}`}
                        onChange={(e) => {
                          const parts = e.target.value.split(',');
                          setEditForm({
                            ...editForm,
                            city: parts[0]?.trim() || editForm.city,
                            state: parts[1]?.trim() || editForm.state,
                          });
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Registered Legal Office Address (for GST & Records)</label>
                    <textarea
                      rows={2}
                      value={editForm.registeredAddress}
                      onChange={(e) => setEditForm({ ...editForm, registeredAddress: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Plant / Delivery Consignee Address (Where Slitted Material Is Shipped)</label>
                    <textarea
                      rows={2}
                      value={editForm.plantAddress}
                      onChange={(e) => setEditForm({ ...editForm, plantAddress: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Customer Details</span>
                    </button>
                  </div>
                </form>

              </div>
            ) : null}
          </div>

        </div>

      </div>
    </div>
  );
};
