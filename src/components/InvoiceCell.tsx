import React, { useEffect, useState } from 'react';
import { useProduction } from '../context/ProductionContext';
import { DeliveryChallan } from '../types';
import { Check } from 'lucide-react';

interface InvoiceCellProps {
  jobId: string;
  challan: DeliveryChallan;
}

// The Tally invoice a challan was billed on, typed straight into the challan card.
// Owner/developer can type it (saved on Enter or when leaving the box); everyone else just sees it.
// The same invoice number may be used on several challans.
export const InvoiceCell: React.FC<InvoiceCellProps> = ({ jobId, challan }) => {
  const { isAdmin, setChallanInvoice } = useProduction();
  const saved = challan.invoiceNo || '';
  const [value, setValue] = useState(saved);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => setValue(saved), [saved]);

  if (!isAdmin) {
    return saved ? (
      <span className="text-[11px] font-bold text-emerald-800">Invoice {saved}</span>
    ) : (
      <span className="text-[11px] font-semibold text-blue-800">Not invoiced yet</span>
    );
  }

  const save = () => {
    if (value.trim() === saved) return;
    setChallanInvoice(jobId, challan.id, value);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  return (
    <label
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600"
      onClick={(e) => e.stopPropagation()}
    >
      Invoice
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setValue(saved);
        }}
        placeholder="No."
        title="Tally invoice number for this challan. One invoice can cover several challans."
        className={`w-20 px-2 py-0.5 rounded border font-mono font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 ${
          saved ? 'border-emerald-300' : 'border-blue-400 bg-blue-50'
        }`}
      />
      {justSaved && <Check className="w-3.5 h-3.5 text-emerald-600" aria-label="Saved" />}
    </label>
  );
};
