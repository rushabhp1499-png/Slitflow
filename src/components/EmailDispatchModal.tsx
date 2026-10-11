import React, { useState, useEffect } from 'react';
import { MaterialInward, DeliveryChallan, Customer } from '../types';
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { buildChallanEmailTemplates } from '../services/gmailService';

interface EmailDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: MaterialInward;
  challan?: DeliveryChallan | null;
  customer?: Customer | null;
  onEmailSentSuccess?: (recipients: string) => void;
}

export const EmailDispatchModal: React.FC<EmailDispatchModalProps> = ({
  isOpen,
  onClose,
  job,
  challan,
  customer,
  onEmailSentSuccess,
}) => {
  const [recipientsInput, setRecipientsInput] = useState<string>('');
  const [subjectInput, setSubjectInput] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'rich' | 'plain'>('rich');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const activeChallan =
    challan ||
    (job.challans && job.challans.length > 0
      ? job.challans[job.challans.length - 1]
      : job.challan);

  const trackingUrl = `${window.location.origin}?track=${encodeURIComponent(
    customer?.accessCode || customer?.id || job.customerId
  )}`;

  // Prepare email template data
  const emailTemplates = activeChallan
    ? buildChallanEmailTemplates(job, activeChallan, customer, trackingUrl)
    : {
        subject: `Production Status Update - Progressive Enterprises (PO #${job.customerPoNo})`,
        plainTextBody: `Status update for PO #${job.customerPoNo}`,
        htmlBody: `<p>Status update for PO #${job.customerPoNo}</p>`,
      };

  useEffect(() => {
    if (isOpen) {
      const allEmails =
        customer?.authorizedEmails && customer.authorizedEmails.length > 0
          ? customer.authorizedEmails
          : [customer?.email || job.customerEmail].filter(Boolean);
      setRecipientsInput(allEmails.join(', '));
      setSubjectInput(emailTemplates.subject);
      setStatusMessage(null);
      setCopied(false);
    }
  }, [isOpen, customer, job, activeChallan]);

  if (!isOpen) return null;

  const cleanRecipientList = recipientsInput
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const gmailWebUrl = `https://mail.google.com/mail/?authuser=progressive.ent8@gmail.com&view=cm&fs=1&to=${encodeURIComponent(
    cleanRecipientList.join(',')
  )}&su=${encodeURIComponent(subjectInput)}&body=${encodeURIComponent(
    emailTemplates.plainTextBody
  )}`;

  const mailtoUrl = `mailto:${cleanRecipientList.join(',')}?subject=${encodeURIComponent(
    subjectInput
  )}&body=${encodeURIComponent(emailTemplates.plainTextBody)}`;

  const handle1ClickDispatch = () => {
    if (cleanRecipientList.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter at least one recipient email address.',
      });
      return;
    }

    if (onEmailSentSuccess) {
      onEmailSentSuccess(cleanRecipientList.join(', '));
    }

    setStatusMessage({
      type: 'success',
      text: `Draft opened and recorded! Sent from progressive.ent8@gmail.com to: ${cleanRecipientList.join(', ')}`,
    });
  };

  const handleCopyBody = async () => {
    try {
      await navigator.clipboard.writeText(
        `Subject: ${subjectInput}\n\n${emailTemplates.plainTextBody}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-blue-700 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-800 rounded-xl shadow-xs">
              <Mail className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                <span>Email Customer Dispatch Advice</span>
                <span className="text-[10px] bg-blue-900/80 text-blue-200 font-mono px-2 py-0.5 rounded-full uppercase font-bold">
                  1-Click Dispatch
                </span>
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Official Dispatch From: <strong className="underline font-mono">progressive.ent8@gmail.com</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white hover:bg-blue-800 rounded-lg transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`px-5 py-3 text-xs flex items-center justify-between gap-3 shrink-0 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-b border-emerald-200'
                : 'bg-red-50 text-red-900 border-b border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600 text-[11px] font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Body Form */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">

          {/* Official Factory Sender Banner */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Sender Email:</span>
                <span className="font-mono bg-white text-blue-900 px-2 py-0.5 rounded border border-blue-300 font-bold text-xs">
                  progressive.ent8@gmail.com
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Factory Email Configured
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Dispatches directly to your customers' inboxes from <strong>progressive.ent8@gmail.com</strong> with pre-filled PO, Challan #, bundle weight breakdown, and vehicle details.
            </p>
          </div>

          {/* Recipients Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Recipient Email Address(es):
            </label>
            <input
              type="text"
              value={recipientsInput}
              onChange={(e) => setRecipientsInput(e.target.value)}
              placeholder="e.g. purchase@customer.com, logistics@customer.com"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Separate multiple email addresses with commas. All registered customer contacts will receive this dispatch advice.
            </p>
          </div>

          {/* Subject Input */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Email Subject:
            </label>
            <input
              type="text"
              value={subjectInput}
              onChange={(e) => setSubjectInput(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email Preview Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">Preview:</span>
                <div className="flex bg-slate-200 p-0.5 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('rich')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      previewTab === 'rich'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Formatted HTML
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('plain')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      previewTab === 'plain'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyBody}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Body'}</span>
              </button>
            </div>

            <div className="p-3 bg-white max-h-56 overflow-y-auto text-xs">
              {previewTab === 'rich' ? (
                <div
                  className="prose prose-xs max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: emailTemplates.htmlBody }}
                />
              ) : (
                <pre className="text-[11px] font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {emailTemplates.plainTextBody}
                </pre>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <p>
              Clicking <strong>Send via Gmail</strong> launches Gmail in 1 click from <strong>progressive.ent8@gmail.com</strong> with your customer emails, subject line, and challan table already filled in.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Default Mail Client */}
            <a
              href={mailtoUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl transition text-xs shadow-2xs"
              title="Open in default desktop mail client"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Default Mail App</span>
            </a>

            <button
              type="button"
              onClick={handleCopyBody}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl transition text-xs shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Primary 1-Click Send Button */}
            <a
              href={gmailWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handle1ClickDispatch}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition text-xs shadow-md hover:shadow-lg cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>1-Click Send via Gmail (progressive.ent8@gmail.com)</span>
              <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
