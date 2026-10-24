import { DeliveryChallan, MaterialInward, Customer } from '../types';
import { COMPANY, companyContactLine } from '../config/company';

export interface SendEmailParams {
  accessToken: string;
  recipients: string[];
  subject: string;
  htmlBody: string;
  plainTextBody: string;
  fromName?: string;
  fromEmail?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}

/**
 * Builds standard base64url (RFC 4648 §5) string from a utf-8 string
 */
function toBase64Url(str: string): string {
  // Use UTF-8 safe encodeURIComponent + unescape before btoa
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  return btoa(utf8Bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Constructs RFC 2822 formatted email message
 */
function createMimeMessage({
  fromName = 'Progressive Enterprises Precision Slitting',
  fromEmail = 'progressive.ent8@gmail.com',
  recipients,
  subject,
  htmlBody,
  plainTextBody,
}: Omit<SendEmailParams, 'accessToken'>): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  const toHeader = recipients.join(', ');

  const headers = [
    `From: "${fromName.replace(/"/g, '')}" <${fromEmail}>`,
    `To: ${toHeader}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    plainTextBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    htmlBody,
    '',
    `--${boundary}--`,
  ];

  return `${headers.join('\r\n')}\r\n\r\n${body.join('\r\n')}`;
}

/**
 * Sends an email directly via the official Gmail REST API
 * (https://gmail.googleapis.com/gmail/v1/users/me/messages/send)
 */
export async function sendEmailViaGmailApi(params: SendEmailParams): Promise<SendEmailResult> {
  const { accessToken, recipients, subject, htmlBody, plainTextBody, fromEmail, fromName } = params;

  if (!accessToken) {
    throw new Error('Missing Google access token. Please connect progressive.ent8@gmail.com with Google.');
  }

  if (!recipients || recipients.length === 0) {
    throw new Error('Please provide at least one recipient email address.');
  }

  const mimeString = createMimeMessage({
    recipients,
    subject,
    htmlBody,
    plainTextBody,
    fromEmail: fromEmail || 'progressive.ent8@gmail.com',
    fromName: fromName || 'Progressive Enterprises Precision Slitting Works',
  });

  const rawBase64Url = toBase64Url(mimeString);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: rawBase64Url,
    }),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await response.text();
    }
    throw new Error(`Gmail API error (${response.status}): ${errorDetail}`);
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.id,
    threadId: data.threadId,
  };
}

/**
 * Generates email content tailored for Delivery Challans
 */
export function buildChallanEmailTemplates(
  job: MaterialInward,
  challan: DeliveryChallan,
  customer?: Customer | null,
  trackingUrl?: string
) {
  const custName = customer?.companyName || job.customerName;
  const dispatchWeight = challan.thisDispatchWeightKg.toLocaleString();
  const balanceWeight = challan.remainingBalanceWeightKg.toLocaleString();
  const vehicle = challan.vehicleNo || 'Self / Direct Pickup';
  const transporter = challan.transporterName || 'Direct Delivery';
  const url = trackingUrl || window.location.origin;

  const subject = `Delivery Challan #${challan.challanNo} - Progressive Enterprises (PO #${job.customerPoNo})`;

  const plainTextBody = `Dear ${custName} Team,

Greetings from Progressive Enterprises Precision Slitting Works.

Please find below the official dispatch advice and delivery challan for your Purchase Order #${job.customerPoNo}:

=======================================================
DELIVERY CHALLAN DISPATCH DETAILS
=======================================================
• Delivery Challan No: ${challan.challanNo}
• Challan Date: ${challan.challanDate}
• Customer PO Ref: ${job.customerPoNo}
• Inward Material Ref: Challan #${job.inwardChallanNo}
• Material Grade & Size: ${job.grade} (${job.thickness} ${job.thicknessUnit})
• Dispatched Net Weight: ${dispatchWeight} kg
• Total Bundles Dispatched: ${challan.totalBundles} bundles
• Vehicle / Lorry No: ${vehicle}
• Transporter Name: ${transporter}
• Balance Remaining at Works: ${balanceWeight} kg
=======================================================

VIEW & PRINT DIGITAL CHALLAN:
${url}

Official Dispatch Email: progressive.ent8@gmail.com
Works Address: ${COMPANY.address}
${companyContactLine()}

Best regards,
Dispatch In-Charge
Progressive Enterprises Precision Slitting Works`;

  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Delivery Challan #${challan.challanNo}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <!-- Header Banner -->
    <tr>
      <td style="background: #0f172a; padding: 24px; color: #ffffff; text-align: left;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">
                PROGRESSIVE ENTERPRISES
              </h1>
              <p style="margin: 4px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8;">
                Precision Cold Rolled & Stainless Steel Slitting Works
              </p>
            </td>
            <td style="text-align: right;">
              <span style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">
                E-Challan Advice
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Notice -->
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #334155;">
          Dear <strong>${custName}</strong> Team,
        </p>
        <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #475569;">
          We are pleased to advise that the slitted coils against your <strong>PO #${job.customerPoNo}</strong> have been processed and dispatched under <strong>Delivery Challan #${challan.challanNo}</strong>.
        </p>

        <!-- Dispatch Summary Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 24px;">
          <tr>
            <td style="padding: 16px;">
              <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 13px; color: #1e293b;">
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td width="40%" style="color: #64748b; font-weight: 600;">Delivery Challan No:</td>
                  <td width="60%" style="font-weight: 700; font-family: monospace; color: #0f172a; font-size: 14px;">${challan.challanNo}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Challan Date:</td>
                  <td style="font-weight: 600;">${challan.challanDate}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Customer PO No:</td>
                  <td style="font-weight: 700; color: #1d4ed8;">${job.customerPoNo}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Material Grade & Gauge:</td>
                  <td style="font-weight: 600;">${job.grade} (${job.thickness} ${job.thicknessUnit})</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Dispatched Net Weight:</td>
                  <td style="font-weight: 800; color: #047857; font-size: 15px;">${dispatchWeight} kg</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Total Slitted Bundles:</td>
                  <td style="font-weight: 600;">${challan.totalBundles} bundles</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Vehicle / Lorry No:</td>
                  <td style="font-weight: 700; font-family: monospace;">${vehicle}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="color: #64748b; font-weight: 600;">Transporter Name:</td>
                  <td style="font-weight: 600;">${transporter}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; font-weight: 600;">Balance Pending at Works:</td>
                  <td style="font-weight: 600; color: #475569;">${balanceWeight} kg</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Action CTA -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td align="center">
              <a href="${url}" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">
                View & Print Official Challan &rarr;
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0 0 16px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
          Note: This job-work delivery is governed under GST Rule 55. Goods received should be inspected against bundled barcodes and verified within 24 hours of delivery.
        </p>

        <!-- Sender & Company Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; font-size: 12px; color: #64748b; line-height: 1.6;">
          <p style="margin: 0; font-weight: 700; color: #0f172a;">Progressive Enterprises Precision Slitting Works</p>
          <p style="margin: 2px 0;">Shed no. H-11/5,6, Shree Arihant Compound, Kalher, Bhiwandi, Maharashtra - 421302</p>
          <p style="margin: 2px 0;">${companyContactLine()}</p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, plainTextBody, htmlBody };
}
