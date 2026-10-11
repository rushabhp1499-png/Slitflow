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
  Loader2,
  ShieldAlert,
  Sparkles,
  LogOut,
  RefreshCw
} from 'lucide-react';
import {
  googleSignIn,
  googleSignOut,
  subscribeToAuth,
  getAccessToken,
  getCurrentGoogleUser
} from '../services/firebaseAuth';
import {
  sendEmailViaGmailApi,
  buildChallanEmailTemplates
} from '../services/gmailService';
import { User } from 'firebase/auth';

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
  const [googleUser, setGoogleUser] = useState<User | null>(getCurrentGoogleUser());
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [recipientsInput, setRecipientsInput] = useState<string>('');
  const [subjectInput, setSubjectInput] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'rich' | 'plain'>('rich');

  // Action states
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Subscribe to auth updates
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user, token) => {
      setGoogleUser(user);
      setAccessToken(token);
    });
    return () => unsubscribe();
  }, []);

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
      setShowConfirmSend(false);
      setCopied(false);
    }
  }, [isOpen, customer, job, activeChallan]);

  if (!isOpen) return null;

  const handleGoogleConnect = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      setGoogleUser(res.user);
      setAccessToken(res.accessToken);
      setStatusMessage({
        type: 'success',
        text: `Connected with Google (${res.user.email || 'progressive.ent8@gmail.com'})! You can now send emails directly via Gmail API.`,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      const isAccessDenied = errMsg.includes('access_denied') || errMsg.includes('403') || errMsg.includes('verification');
      setStatusMessage({
        type: 'error',
        text: isAccessDenied
          ? 'Notice: Google Cloud OAuth is currently in Developer Testing mode. To send right now from progressive.ent8@gmail.com without restrictions, use the "Open & Send in Gmail Web" button below — it opens pre-filled and ready to send!'
          : `Google sign-in error: ${errMsg || 'Please check popup permissions.'}. You can use "Open in Gmail Web" below.`,
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setAccessToken(null);
      setStatusMessage({
        type: 'success',
        text: 'Disconnected Google account.',
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSendViaGmailDirect = async () => {
    const cleanEmails = recipientsInput
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);

    if (cleanEmails.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter at least one valid recipient email.',
      });
      return;
    }

    if (!accessToken) {
      setStatusMessage({
        type: 'error',
        text: 'Please connect your Google account first to enable direct Gmail sending.',
      });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    setShowConfirmSend(false);

    try {
      const result = await sendEmailViaGmailApi({
        accessToken,
        recipients: cleanEmails,
        subject: subjectInput,
        htmlBody: emailTemplates.htmlBody,
        plainTextBody: emailTemplates.plainTextBody,
        fromEmail: 'progressive.ent8@gmail.com',
        fromName: 'Progressive Enterprises Precision Slitting Works',
      });

      setStatusMessage({
        type: 'success',
        text: `Delivery challan email dispatched successfully from progressive.ent8@gmail.com to ${cleanEmails.join(
          ', '
        )}! Message ID: ${result.messageId}`,
      });

      if (onEmailSentSuccess) {
        onEmailSentSuccess(cleanEmails.join(', '));
      }
    } catch (err: any) {
      console.error('Failed to send email:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to send email: ${err.message || 'Unknown Gmail API error'}. You can still use the "Open in Gmail Web" fallback button below.`,
      });
    } finally {
      setIsSending(false);
    }
  };

  const cleanRecipientList = recipientsInput
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    cleanRecipientList.join(',')
  )}&su=${encodeURIComponent(subjectInput)}&body=${encodeURIComponent(
    emailTemplates.plainTextBody
  )}`;

  const mailtoUrl = `mailto:${cleanRecipientList.join(',')}?subject=${encodeURIComponent(
    subjectInput
  )}&body=${encodeURIComponent(emailTemplates.plainTextBody)}`;

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
                  Gmail API
                </span>
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Dispatch from official email: <strong className="underline">progressive.ent8@gmail.com</strong>
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

          {/* Google Workspace Connection Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Sender Account:</span>
                <span className="font-mono bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-semibold text-[11px]">
                  progressive.ent8@gmail.com
                </span>
              </div>

              {accessToken ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Google Connected ({googleUser?.email || 'Active'})
                  </span>
                  <button
                    type="button"
                    onClick={handleGoogleDisconnect}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded transition"
                    title="Disconnect Google account"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-lg transition text-xs shadow-2xs"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      <span>Sign in with Google (progressive.ent8@gmail.com)</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {!accessToken && (
              <p className="text-[11px] text-slate-500">
                To send emails directly from <strong>progressive.ent8@gmail.com</strong> into your customers' inboxes, connect your Google account above. You can also use the Gmail Web fallback at any time.
              </p>
            )}
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

          {/* Explicit User Confirmation Box */}
          {showConfirmSend && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-extrabold text-amber-900 text-xs">
                    Confirm Dispatch Email Sending
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Are you sure you want to send this official delivery challan email from{' '}
                    <strong>progressive.ent8@gmail.com</strong> to{' '}
                    <strong>{cleanRecipientList.join(', ')}</strong>?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmSend(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendViaGmailDirect}
                  disabled={isSending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition text-xs shadow-xs"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending via Gmail...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Yes, Send Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {/* Primary Fallback Gmail Web */}
            <a
              href={gmailWebUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (onEmailSentSuccess) {
                  onEmailSentSuccess(cleanRecipientList.join(', '));
                }
                setStatusMessage({
                  type: 'success',
                  text: `Opened in Gmail for progressive.ent8@gmail.com! Marked as dispatched to: ${cleanRecipientList.join(', ')}`,
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-xs shadow-xs"
              title="Open draft in Gmail web app with prefilled body"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in Gmail Web</span>
            </a>

            {/* Default Mail Client */}
            <a
              href={mailtoUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl transition text-xs shadow-2xs"
              title="Open in default desktop mail client"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Default Mail Client</span>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {!showConfirmSend && (
              <button
                type="button"
                onClick={() => {
                  if (!accessToken) {
                    handleGoogleConnect();
                  } else {
                    setShowConfirmSend(true);
                  }
                }}
                disabled={isSending}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-xs shadow-xs"
              >
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : !accessToken ? (
                  <>
                    <Sparkles className="w-4 h-4 text-blue-200" />
                    <span>Connect & Send via Gmail</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send via Gmail API</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
