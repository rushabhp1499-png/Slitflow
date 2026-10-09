import React, { useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { MaterialInward } from '../types';
import {
  PackagePlus,
  X,
  Building2,
  Calendar,
  Layers,
  Scale,
  Maximize2,
  FileText,
  AlertCircle,
  PackageCheck,
  Hash,
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
  const { customers, addInwardMaterial } = useProduction();

  const [customerId, setCustomerId] = useState<string>(
    preselectedCustomerId || (customers[0]?.id ?? 'CUST-001')
  );
  const [customerPoNo, setCustomerPoNo] = useState<string>(
    `PO/PE/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`
  );
  const [inwardChallanNo, setInwardChallanNo] = useState<string>(
    `INW-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [vehicleNo, setVehicleNo] = useState<string>('MH-12-');
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [materialType, setMaterialType] = useState<MaterialInward['materialType']>(
    'Plastic / Polymer Film'
  );
  const [grade, setGrade] = useState<string>('BOPET 12 Micron Polyester Film (Corona Treated)');
  const [thickness, setThickness] = useState<number>(12);
  const [thicknessUnit, setThicknessUnit] = useState<MaterialInward['thicknessUnit']>('microns');
  const [incomingWidth, setIncomingWidth] = useState<number>(1000);
  const [incomingLength, setIncomingLength] = useState<number>(75000);
  const [incomingWeight, setIncomingWeight] = useState<number>(1252);
  const [coilsOrRollsCount, setCoilsOrRollsCount] = useState<number>(2);
  
  // Packaging & Bundle Specs
  const [targetBundleWeightKg, setTargetBundleWeightKg] = useState<number>(28);
  const [unitsPerBundle, setUnitsPerBundle] = useState<number>(10);
  const [unitType, setUnitType] = useState<'reels' | 'reams' | 'packets' | 'strips'>('reels');
  const [bundleMaxNotes, setBundleMaxNotes] = useState<string>(
    'Bundles max approx 25 to 30 kg max. Each bundle with 10 reels or 20 reams of 20mm each.'
  );

  const [customerInstructions, setCustomerInstructions] = useState<string>(
    'Slit into 20mm width reels. Max bundle weight approx 25 to 30 kg. Pack with 10 reels or 20 reams of 20mm each per bundle. Core size 76mm, edge trim rewound separately.'
  );
  const [assignedMachine, setAssignedMachine] = useState<string>(
    'Paper & Film Slitter Rewinder #3 (2000mm)'
  );

  // Quick preset for EDD
  const getFutureDate = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string>(getFutureDate(3));
  const [assignEddNow, setAssignEddNow] = useState<boolean>(true);

  // Preset material templates for fast entry
  const sampleMaterialTemplates = [
    {
      name: '⭐ 12 Micron Polyester Film (1000mm / 1252kg)',
      type: 'Plastic / Polymer Film' as const,
      grade: 'BOPET 12 Micron Polyester Film (Corona Treated)',
      thk: 12,
      unit: 'microns' as const,
      width: 1000,
      wt: 1252,
      len: 75000,
      rolls: 2,
      bundleMax: 30,
      unitsPer: 10,
      uType: 'reels' as const,
      bNotes: 'All bundles approx 25-30 kg max. Each bundle has 10 reels or 20 reams of 20mm each.',
      inst: 'Slit to 20mm reels. Max bundle weight 25-30 kg. Each bundle with 10 reels or 20 reams of 20mm. Core 76mm.',
      machine: 'Paper & Film Slitter Rewinder #3 (2000mm)',
    },
    {
      name: 'SS 304 Coil (0.8mm x 1250mm / 4500kg)',
      type: 'Steel Coil / Sheet' as const,
      grade: 'Stainless Steel 304 (Cold Rolled 2B)',
      thk: 0.8,
      unit: 'mm' as const,
      width: 1250,
      wt: 4500,
      len: 1500,
      rolls: 2,
      bundleMax: 50,
      unitsPer: 5,
      uType: 'reels' as const,
      bNotes: 'Corrugated packing with VCI rust inhibitor paper.',
      inst: 'Slit into 45mm and 60mm reels. Pack into corrugated boxes with VCI paper.',
      machine: 'Precision Slitter #1 (1300mm)',
    },
    {
      name: 'ETP Copper Strip (1.2mm x 600mm / 3200kg)',
      type: 'Copper / Brass Strip' as const,
      grade: 'Electrolytic Tough Pitch (ETP) Copper Strip',
      thk: 1.2,
      unit: 'mm' as const,
      width: 600,
      wt: 3200,
      len: 2200,
      rolls: 3,
      bundleMax: 35,
      unitsPer: 6,
      uType: 'reels' as const,
      bNotes: 'Heavy wooden pallet packing with eye-to-sky strapping.',
      inst: 'Slit into 32mm wide electrical winding strips. Zero burr, wrapped with core rings.',
      machine: 'Precision Slitter #2 (Heavy Gauge)',
    },
    {
      name: 'Kraft Liner Paper (180 GSM x 1800mm / 5200kg)',
      type: 'Kraft Paper Reel' as const,
      grade: 'Virgin Kraft Linerboard 180 GSM',
      thk: 180,
      unit: 'microns' as const,
      width: 1800,
      wt: 5200,
      len: 16000,
      rolls: 4,
      bundleMax: 40,
      unitsPer: 8,
      uType: 'reels' as const,
      bNotes: 'Moisture barrier film stretch wrapping.',
      inst: 'Slit into 300mm x 4 reels and 250mm x 2 reels. Moisture protected packaging.',
      machine: 'Paper & Film Slitter Rewinder #3 (2000mm)',
    },
  ];

  const applyTemplate = (tpl: (typeof sampleMaterialTemplates)[0]) => {
    setMaterialType(tpl.type);
    setGrade(tpl.grade);
    setThickness(tpl.thk);
    setThicknessUnit(tpl.unit);
    setIncomingWidth(tpl.width);
    setIncomingWeight(tpl.wt);
    setIncomingLength(tpl.len);
    setCoilsOrRollsCount(tpl.rolls);
    setTargetBundleWeightKg(tpl.bundleMax);
    setUnitsPerBundle(tpl.unitsPer);
    setUnitType(tpl.uType);
    setBundleMaxNotes(tpl.bNotes);
    setCustomerInstructions(tpl.inst);
    setAssignedMachine(tpl.machine);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    addInwardMaterial({
      customerId,
      customerPoNo,
      inwardChallanNo,
      vehicleNo,
      receivedDate,
      materialType,
      grade,
      thickness: Number(thickness),
      thicknessUnit,
      incomingWidth: Number(incomingWidth),
      incomingLength: Number(incomingLength),
      incomingWeight: Number(incomingWeight),
      coilsOrRollsCount: Number(coilsOrRollsCount),
      customerInstructions,
      assignedMachine,
      estimatedDeliveryDate: isCustomerPortal ? undefined : (assignEddNow ? estimatedDeliveryDate || getFutureDate(3) : undefined),
      bundleSpecs: {
        targetBundleWeightKg: Number(targetBundleWeightKg),
        unitsPerBundle: Number(unitsPerBundle),
        unitType,
        packagingFormat: 'Corrugated Boxes & Shrink Bundles',
        specialPackingNotes: bundleMaxNotes,
      },
    });

    onClose();
  };

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
          
          {/* Quick Template Picker */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Quick Material Grade & Slitting Presets</span>
              <span className="text-[10px] text-blue-600">Click to autofill exact job specs</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {sampleMaterialTemplates.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 rounded-md transition text-left"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Customer & Inward Transport Details */}
          <div className="border-t border-slate-200 pt-4">
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
                  <div className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 flex items-center justify-between" title="Locked to your authenticated customer account">
                    <span className="truncate">{customers.find(c => c.id === customerId)?.companyName || 'Your Account'}</span>
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
                  Customer PO # <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerPoNo}
                  onChange={(e) => setCustomerPoNo(e.target.value)}
                  placeholder="e.g. PO/PW/2026/092"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-blue-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Inward Challan # <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={inwardChallanNo}
                  onChange={(e) => setInwardChallanNo(e.target.value)}
                  placeholder="e.g. AT/INW/9904"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle / Lorry No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value.toUpperCase())}
                  placeholder="e.g. MH-12-RN-8842"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Material Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white"
                >
                  <option value="Plastic / Polymer Film">Plastic / Polymer Film (BOPET, BOPP, PVC)</option>
                  <option value="Steel Coil / Sheet">Steel Coil / Sheet</option>
                  <option value="Aluminum Coil">Aluminum Coil</option>
                  <option value="Copper / Brass Strip">Copper / Brass Strip</option>
                  <option value="Kraft Paper Reel">Kraft Paper Reel</option>
                  <option value="Other">Other Industrial Material</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grade of Material <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 12 Micron Polyester Film, SS 304, CRCA D..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                />
              </div>
            </div>

            {/* Dimensional & Weight Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thickness & Unit <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input
                    type="number"
                    step={0.01}
                    required
                    min={0.01}
                    value={thickness}
                    onChange={(e) => setThickness(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-r-0 border-slate-300 rounded-l-lg text-xs font-bold text-slate-800"
                  />
                  <select
                    value={thicknessUnit}
                    onChange={(e) => setThicknessUnit(e.target.value as any)}
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
                  Incoming Width (mm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={incomingWidth}
                  onChange={(e) => setIncomingWidth(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Length (Meters)
                </label>
                <input
                  type="number"
                  min={1}
                  value={incomingLength}
                  onChange={(e) => setIncomingLength(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Weight (Kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  step={0.5}
                  value={incomingWeight}
                  onChange={(e) => setIncomingWeight(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-blue-900 focus:bg-white"
                />
              </div>
            </div>

            <div className={`grid gap-3 mt-3 ${isCustomerPortal ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Incoming Coils / Jumbo Rolls Count
                </label>
                <input
                  type="number"
                  min={1}
                  value={coilsOrRollsCount}
                  onChange={(e) => setCoilsOrRollsCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white"
                />
              </div>
              {!isCustomerPortal && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Machine Line
                  </label>
                  <select
                    value={assignedMachine}
                    onChange={(e) => setAssignedMachine(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white"
                  >
                    <option value="Paper & Film Slitter Rewinder #3 (2000mm)">Slitter Rewinder #3 (Film & Paper 2000mm)</option>
                    <option value="Precision Slitter #1 (1300mm)">Slitter Line #1 (1300mm Precision)</option>
                    <option value="Precision Slitter #2 (Heavy Gauge)">Slitter Line #2 (Heavy Gauge Coil)</option>
                    <option value="Micro Shearing Line #4">Shearing & Micro Strip Line #4</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Packaging & Bundle Specifications (Approx 25-30kg max, 10 reels / 20 reams) */}
          <div className="border-t border-slate-200 pt-4 bg-purple-50/40 p-4 rounded-xl border border-purple-200">
            <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-purple-700" />
              3. Bundle & Packaging Specifications Required by Customer
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Bundle Weight (approx 25 to 30 kg max)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={5}
                    max={200}
                    value={targetBundleWeightKg}
                    onChange={(e) => setTargetBundleWeightKg(parseFloat(e.target.value) || 28)}
                    className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950"
                  />
                  <span className="absolute right-3 top-2 text-xs text-purple-700 font-semibold">kg max</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Units per Bundle (e.g. 10 or 20)
                </label>
                <input
                  type="number"
                  min={1}
                  value={unitsPerBundle}
                  onChange={(e) => setUnitsPerBundle(parseInt(e.target.value) || 10)}
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-purple-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Unit Packaging Type
                </label>
                <select
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-purple-300 rounded-lg text-xs font-semibold text-slate-800"
                >
                  <option value="reels">Reels</option>
                  <option value="reams">Reams</option>
                  <option value="packets">Packets</option>
                  <option value="strips">Strips</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-purple-900 mb-1">
                Bundle Configuration Note:
              </label>
              <input
                type="text"
                value={bundleMaxNotes}
                onChange={(e) => setBundleMaxNotes(e.target.value)}
                placeholder="e.g. Each bundle will have either 10 reels or 20 reams of 20 mm each"
                className="w-full px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-xs text-slate-800"
              />
            </div>
          </div>

          {/* Section 4: Customer Instructions */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                4. Customer Slitting Instructions & Tolerance Notes
              </label>
              <span className="text-[11px] text-slate-500">Output requirements</span>
            </div>
            <textarea
              rows={3}
              required
              value={customerInstructions}
              onChange={(e) => setCustomerInstructions(e.target.value)}
              placeholder="e.g. Slit into 20mm width reels. Max bundle weight 25 to 30 kg max. Each bundle with 10 reels or 20 reams of 20mm each..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white"
            />
          </div>

          {/* Section 5: Estimated Delivery Date (EDD) */}
          {isCustomerPortal ? (
            <div className="border-t border-slate-200 pt-4 bg-amber-50/70 p-4 rounded-xl border border-amber-200/80">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <Calendar className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      5. Estimated Delivery Date (EDD) — Set Exclusively by Factory
                    </h4>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 font-semibold px-2 py-0.5 rounded border border-amber-300">
                      Factory Policy
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                    Customer cannot set the Estimated Delivery Date (EDD) for themselves. Once your material is physically received and weighed at the Progressive Enterprises works, our factory production head will review blade setup schedule and assign your official EDD.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-200 pt-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                    5. Estimated Delivery Date (EDD)
                  </span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={assignEddNow}
                    onChange={(e) => setAssignEddNow(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  Assign EDD Right Now
                </label>
              </div>

              {assignEddNow ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">Quick turnaround:</span>
                    <button
                      type="button"
                      onClick={() => setEstimatedDeliveryDate(getFutureDate(2))}
                      className="px-2.5 py-1 text-xs bg-white hover:bg-blue-100 border border-blue-200 rounded font-semibold text-blue-800 transition"
                    >
                      +2 Days (Urgent)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstimatedDeliveryDate(getFutureDate(3))}
                      className="px-2.5 py-1 text-xs bg-white hover:bg-blue-100 border border-blue-200 rounded font-semibold text-blue-800 transition"
                    >
                      +3 Days (Standard)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEstimatedDeliveryDate(getFutureDate(7))}
                      className="px-2.5 py-1 text-xs bg-white hover:bg-blue-100 border border-blue-200 rounded font-semibold text-blue-800 transition"
                    >
                      +7 Days (Heavy Lot)
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <input
                        type="date"
                        value={estimatedDeliveryDate}
                        onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                        min={receivedDate}
                        className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-slate-800"
                      />
                    </div>
                    <span className="text-xs text-blue-900 font-medium">
                      Customer portal will immediately update with this delivery commitment.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    The factory manager will receive a pending notification on the dashboard to review and set the Estimated Delivery Date.
                  </span>
                </div>
              )}
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
