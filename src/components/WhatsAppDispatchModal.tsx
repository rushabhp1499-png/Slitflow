import React, { useState, useEffect } from 'react';
import { MaterialInward, DeliveryChallan, Customer } from '../types';
import { X, Copy, Check, MessageSquare, ExternalLink, Smartphone, Globe, ShieldCheck } from 'lucide-react';

interface WhatsAppDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: MaterialInward;
  challan?: DeliveryChallan | null;
  customer?: Customer | null;
}

export const WhatsAppDispatchModal: React.FC<WhatsAppDispatchModalProps> = ({
  isOpen,
  onClose,
  job,
  challan,
  customer,
}) => {
  const [phone, setPhone] = useState<string>('');
  const [customNotes, setCustomNotes] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultPhone = customer?.phone || job.customerPhone || '9820045678';
      setPhone(defaultPhone);
      setCopied(false);
      setCustomNotes('');
    }
  }, [isOpen, customer, job]);

  if (!isOpen) return null;

  const activeChallan = challan || (job.challans && job.challans.length > 0 ? job.challans[job.challans.length - 1] : job.challan);
  const custName = customer?.companyName || job.customerName;
  const trackingUrl = `${window.location.origin}?track=${encodeURIComponent(customer?.accessCode || customer?.id || job.customerId)}`;

  // Format phone number with country code
  const cleanDigits = phone.replace(/\D/g, '');
  const formattedPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;

  const buildMessage = () => {
    if (activeChallan) {
      return `*PROGRESSIVE ENTERPRISES*
*DELIVERY CHALLAN DISPATCH ADVICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 *Challan No:* ${activeChallan.challanNo}
🗓️ *Date:* ${activeChallan.challanDate}
🏢 *Customer:* ${custName}
📦 *Customer PO #:* ${job.customerPoNo}
⚙️ *Material Grade:* ${job.grade} (${job.thickness} ${job.thicknessUnit})
⚖️ *Dispatched Net Weight:* ${activeChallan.thisDispatchWeightKg.toLocaleString()} kg
📦 *Total Bundles:* ${activeChallan.totalBundles} bundles
🚛 *Vehicle / Lorry No:* ${activeChallan.vehicleNo || 'N/A'}
🚚 *Transporter:* ${activeChallan.transporterName || 'Direct Delivery'}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Live Tracking & Digital Challan:*
${trackingUrl}
${customNotes ? `\n📝 *Notes:* ${customNotes}\n` : ''}
_Progressive Enterprises Precision Slitting Works, Pune_
_Official Dispatch Email: progressive.ent8@gmail.com_`;
    }

    return `*PROGRESSIVE ENTERPRISES*
*PRODUCTION & DISPATCH UPDATE*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 *Customer:* ${custName}
📦 *Customer PO #:* ${job.customerPoNo}
⚙️ *Material Grade:* ${job.grade} (${job.thickness} ${job.thicknessUnit})
⚖️ *Incoming Material Weight:* ${job.incomingWeight.toLocaleString()} kg
🔄 *Current Status:* ${job.status.replace('-', ' ').toUpperCase()}
${job.bundles ? `📦 *Completed Bundles:* ${job.bundles.filter(b => b.status === 'ready').length} bundles` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 *Live Tracking & Portal:*
${trackingUrl}
${customNotes ? `\n📝 *Notes:* ${customNotes}\n` : ''}
_Progressive Enterprises Precision Slitting Works, Pune_
_Official Dispatch Email: progressive.ent8@gmail.com_`;
  };

  const messageText = buildMessage();
  const encodedText = encodeURIComponent(messageText);

  const waWebUrl = formattedPhone
    ? `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;

  const waAppUrl = formattedPhone
    ? `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = messageText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-emerald-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-800 rounded-xl shadow-xs">
              <MessageSquare className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                <span>Send WhatsApp Dispatch Advice</span>
                <span className="text-[10px] bg-emerald-900/80 text-emerald-200 font-mono px-2 py-0.5 rounded-full uppercase font-bold">
                  Instant
                </span>
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                Send to {custName} (PO #{job.customerPoNo})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-emerald-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">

          {/* Customer & Phone Input */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Recipient WhatsApp Number
              </span>
              <span className="text-[11px] text-slate-500">
                Customer: <strong className="text-slate-800">{custName}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-700 font-bold shrink-0">
                +91
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number (e.g. 9820045678)"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Prefilled from customer profile. You can edit or enter any dispatch coordinator / transporter number.
            </p>
          </div>

          {/* Optional Note */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Add Custom Message Note (Optional):
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Driver contact details or unloading instruction..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                Message Preview
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto border border-slate-800 selection:bg-emerald-500 selection:text-white">
              {messageText}
            </pre>
          </div>

          {/* Safe launch notice */}
          <div className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p>
              Click either <strong>WhatsApp Web</strong> (for desktop browsers) or <strong>WhatsApp App</strong>. Both links open securely in a new tab with the complete text pre-filled.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl transition text-xs shadow-2xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            {/* WhatsApp App Link */}
            <a
              href={waAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setTimeout(onClose, 800)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition text-xs shadow-xs"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>WhatsApp App</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            {/* WhatsApp Web Direct Link */}
            <a
              href={waWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setTimeout(onClose, 800)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition text-xs shadow-xs"
            >
              <Globe className="w-4 h-4" />
              <span>WhatsApp Web</span>
              <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
