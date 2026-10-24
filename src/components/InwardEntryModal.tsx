import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward } from '../types';
import { toScaleKg, formatKg, describeSlitSizes } from '../utils/weight';
import { SlitSizesEditor, SlitRow, newSlitRow, sizesFromRows, totalKg } from './SlitSizesEditor';
import {
  PackagePlus,
  X,
  Building2,
  Layers,
  Scissors,
  AlertCircle,
  PackageCheck,
  Lock
} from 'lucide-react';

interface InwardEntryModalProps {
  onClose: () => void;
  preselectedCustomerId?: string;
  isCustomerPortal?: boolean;
}

export const InwardEntryModal: React.FC<InwardEntryModalProps> = ({
  onClose,
  preselectedCustomerId,
  isCustomerPortal = false,
}) => {
  const {
    customers,
    jobs,
    addInwardMaterial,
    authenticatedEmail,
    selectedCustomerId,
    currentCustomer,
  } = useProduction();

  // Robustly identify the customer who is logged in
  const loggedInCustomer =
    (preselectedCustomerId && customers.find((c) => c.id === preselectedCustomerId)) ||
    (authenticatedEmail &&
      customers.find(
        (c) =>
          c.authorizedEmails.some(
            (ae) => ae.toLowerCase() === authenticatedEmail.toLowerCase()
          ) || c.email.toLowerCase() === authenticatedEmail.toLowerCase()
      )) ||
    currentCustomer ||
    (selectedCustomerId && customers.find((c) => c.id === selectedCustomerId)) ||
    null;

  const initialCustomerId =
    (isCustomerPortal && loggedInCustomer?.id) ||
    preselectedCustomerId ||
    loggedInCustomer?.id ||
    customers[0]?.id ||
    '';

  const [customerId, setCustomerId] = useState<string>(initialCustomerId);

  // If customer is in customer portal, guarantee customer is strictly locked to loggedInCustomer
  const effectiveCustomer =
    (isCustomerPortal && loggedInCustomer)
      ? loggedInCustomer
      : (customers.find((c) => c.id === customerId) || loggedInCustomer || customers[0]);

  const effectiveCustomerId = effectiveCustomer?.id || initialCustomerId;

  // Left blank, the database assigns the next number in the PE-PO series.
  const [customerPoNo, setCustomerPoNo] = useState<string>('');
  const [inwardChallanNo, setInwardChallanNo] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const receivedDate = new Date().toISOString().split('T')[0];

  const [grade, setGrade] = useState<string>('');
  const [thickness, setThickness] = useState<string>('');
  const [thicknessUnit, setThicknessUnit] = useState<MaterialInward['thicknessUnit']>('microns');
  const [incomingWidth, setIncomingWidth] = useState<string>('');
  const [incomingLength, setIncomingLength] = useState<string>('');
  const [incomingWeight, setIncomingWeight] = useState<string>('');
  const [coilsOrRollsCount, setCoilsOrRollsCount] = useState<string>('1');

  // Slitting sizes requested by the customer
  const [slitRows, setSlitRows] = useState<SlitRow[]>([newSlitRow()]);
  const [extraInstructions, setExtraInstructions] = useState<string>('');

  // Packaging & Bundle Specs
  const [targetBundleWeightKg, setTargetBundleWeightKg] = useState<string>('28');
  const [unitsPerBundle, setUnitsPerBundle] = useState<string>('10');
  const [unitType, setUnitType] = useState<'reels' | 'reams'>('reels');
  const [bundleMaxNotes, setBundleMaxNotes] = useState<string>('');

  const [formError, setFormError] = useState<string>('');

  const validSizes = sizesFromRows(slitRows);
  const widthNum = Number(incomingWidth) || 0;
  const weightNum = toScaleKg(Number(incomingWeight) || 0);
  const totalSlitKg = totalKg(validSizes);
  const balanceKg = toScaleKg(weightNum - totalSlitKg);
  const slitSummary = describeSlitSizes(validSizes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!effectiveCustomer) {
      setFormError('Add the customer first (Manage Customers), then record the inward material.');
      return;
    }

    const po = customerPoNo.trim();
    if (po) {
      const alreadyUsed = jobs.some(
        (j) =>
          j.customerId === effectiveCustomerId &&
          (j.customerPoNo || '').trim().toLowerCase() === po.toLowerCase()
      );
      if (alreadyUsed) {
        setFormError(`PO number "${po}" has already been used for this customer. Please enter a different PO number, or leave it blank to get the next one automatically.`);
        return;
      }
    }

    if (validSizes.length === 0) {
      setFormError('Add at least one slitting size (width in mm and quantity in kg).');
      return;
    }
    if (weightNum > 0 && totalSlitKg > weightNum) {
      setFormError(`The slitting quantities add up to ${formatKg(totalSlitKg)} kg, which is more than the incoming weight of ${formatKg(weightNum)} kg.`);
      return;
    }

    const instructions = [
      `Slit sizes: ${slitSummary}.`,
      balanceKg > 0 ? `Balance ${formatKg(balanceKg)} kg not assigned to a size.` : '',
      extraInstructions.trim(),
    ]
      .filter(Boolean)
      .join(' ');

    const created = addInwardMaterial({
      customerId: effectiveCustomerId,
      customerPoNo: po,
      inwardChallanNo: inwardChallanNo.trim(),
      vehicleNo: vehicleNo.trim().toUpperCase() || '—',
      receivedDate,
      materialType: 'Other',
      grade: grade.trim(),
      thickness: Number(thickness),
      thicknessUnit,
      incomingWidth: widthNum,
      incomingLength: Number(incomingLength) || 0,
      incomingWeight: weightNum,
      coilsOrRollsCount: Number(coilsOrRollsCount) || 1,
      requestedSlitSizes: validSizes,
      customerInstructions: instructions,
      bundleSpecs: {
        targetBundleWeightKg: toScaleKg(Number(targetBundleWeightKg)) || 28,
        unitsPerBundle: Number(unitsPerBundle) || 10,
        unitType,
        packagingStyle: bundleMaxNotes.trim(),
      },
    });

    if (created) onClose();
  };

  const inputClass =
    'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">New Material Inward Entry</h3>
              <p className="text-xs text-slate-300">
                Log incoming raw material sent by customer for slitting service
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">

          {/* Section 1: Customer & Inward Transport Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              1. Customer, PO & Delivery Gate Info
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer {isCustomerPortal ? <span className="text-blue-600 font-bold">(Locked)</span> : <span className="text-red-500">*</span>}
                </label>
                {isCustomerPortal ? (
                  <div className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 flex items-center justify-between" title="Locked to your authenticated company account">
                    <span className="truncate">{effectiveCustomer?.companyName || effectiveCustomer?.name || 'Your Company Account'}</span>
                    <Lock className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />
                  </div>
                ) : (
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer PO # <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={customerPoNo}
                  onChange={(e) => setCustomerPoNo(e.target.value)}
                  placeholder="Your PO number"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900 focus:bg-white"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  No PO? Leave blank and the next PE-PO number is assigned automatically.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inward Challan # <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={inwardChallanNo}
                  onChange={(e) => setInwardChallanNo(e.target.value)}
                  placeholder="Your delivery challan no."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle / Lorry No. <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="e.g. MH-04-AB-1234"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold uppercase text-slate-800 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Incoming Material Technical Parameters */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              2. Incoming Material Parameters (As received from customer)
            </h4>

            <div className="mb-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Grade of Material <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. 12 Micron Polyester Film"
                className={`${inputClass} font-bold`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thickness <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step="any"
                    required
                    min={0.001}
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                    className="w-full min-w-0 px-2.5 py-2 bg-slate-50 border border-r-0 border-slate-300 rounded-l-lg text-xs font-bold text-slate-800"
                  />
                  <select
                    value={thicknessUnit}
                    onChange={(e) => setThicknessUnit(e.target.value as MaterialInward['thicknessUnit'])}
                    className="bg-slate-200 border border-slate-300 rounded-r-lg px-2 text-xs font-semibold text-slate-700"
                  >
                    <option value="microns">μm</option>
                    <option value="mm">mm</option>
                    <option value="gauge">G</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Width (mm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min={1}
                  value={incomingWidth}
                  onChange={(e) => setIncomingWidth(e.target.value)}
                  className={`${inputClass} font-bold`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Weight (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step={0.05}
                  required
                  min={0.05}
                  value={incomingWeight}
                  onChange={(e) => setIncomingWeight(e.target.value)}
                  onBlur={(e) => {
                    const kg = Number(e.target.value);
                    if (kg > 0) setIncomingWeight(toScaleKg(kg).toFixed(2));
                  }}
                  className={`${inputClass} font-bold text-blue-900`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Length (m)
                </label>
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={incomingLength}
                  onChange={(e) => setIncomingLength(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  No. of Rolls / Coils
                </label>
                <input
                  type="number"
                  min={1}
                  value={coilsOrRollsCount}
                  onChange={(e) => setCoilsOrRollsCount(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Slitting Sizes */}
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-blue-600" />
              3. Slitting Sizes Required
            </h4>
            <p className="text-[11px] text-slate-500 mb-3">
              Add each width you need and how many kg of that width (in steps of 50 g).
            </p>

            <SlitSizesEditor rows={slitRows} onChange={setSlitRows} availableKg={weightNum} />

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Other instructions <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={extraInstructions}
                onChange={(e) => setExtraInstructions(e.target.value)}
                placeholder="e.g. Core size 76 mm, tolerance ±0.5 mm, rewind edge trim separately"
                className={inputClass}
              />
            </div>
          </div>

          {/* Section 4: Packaging & Bundle Specifications */}
          <div className="border-t border-slate-200 pt-4 bg-purple-50/40 p-4 rounded-xl border border-purple-200">
            <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-purple-700" />
              4. Bundle & Packaging Specifications
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Bundle Weight
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={0.05}
                    max={500}
                    step={0.05}
                    value={targetBundleWeightKg}
                    onChange={(e) => setTargetBundleWeightKg(e.target.value)}
                    onBlur={(e) => {
                      const kg = Number(e.target.value);
                      if (kg > 0) setTargetBundleWeightKg(toScaleKg(kg).toFixed(2));
                    }}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950"
                  />
                  <span className="absolute right-3 top-2 text-xs text-purple-700 font-semibold">kg max</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Units per Bundle
                </label>
                <input
                  type="number"
                  min={1}
                  value={unitsPerBundle}
                  onChange={(e) => setUnitsPerBundle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Type
                </label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as 'reels' | 'reams')}
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="reels">Reels</option>
                  <option value="reams">Reams</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                Bundle Configuration Note <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={bundleMaxNotes}
                onChange={(e) => setBundleMaxNotes(e.target.value)}
                placeholder="e.g. Each bundle with 10 reels of 20 mm"
                className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs text-slate-800"
              />
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2 text-xs text-red-900 bg-red-50 border border-red-200 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Footer CTA */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-sm transition flex items-center gap-2"
            >
              <PackagePlus className="w-4 h-4" />
              Register Inward Material & Notify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
