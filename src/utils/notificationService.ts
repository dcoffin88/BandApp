import { BandMember, BandProfile, EmailEventType, EmailNotificationLog, SmtpSettings } from '../types/band.ts';

/**
 * Builds responsive, dark-mode styled HTML email templates tailored to band collaboration.
 */
export function buildBandEmailHtml(options: {
  band: BandProfile;
  title: string;
  badge: string;
  badgeColor?: string;
  headline: string;
  bodyText: string;
  details?: { label: string; value: string }[];
  actionLabel?: string;
  actionUrl?: string;
  accentColorHex?: string;
}): string {
  const {
    band,
    title,
    badge,
    badgeColor = '#f59e0b',
    headline,
    bodyText,
    details = [],
    actionLabel,
    actionUrl,
    accentColorHex = '#f59e0b',
  } = options;

  const detailsRows = details
    .map(
      (d) =>
        `<tr>
          <td style="padding: 6px 12px; font-weight: 600; color: #a1a1aa; font-size: 13px; border-bottom: 1px solid #27272a;">${d.label}</td>
          <td style="padding: 6px 12px; color: #ffffff; font-size: 13px; border-bottom: 1px solid #27272a;">${d.value}</td>
        </tr>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 28px; background: linear-gradient(135deg, #18181b 0%, #27272a 100%); border-bottom: 1px solid #3f3f46;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="display: inline-block; padding: 4px 10px; border-radius: 20px; background-color: rgba(245, 158, 11, 0.15); border: 1px solid ${accentColorHex}; color: ${accentColorHex}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      ${badge}
                    </div>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                      ${band.name}
                    </h1>
                    <p style="margin: 2px 0 0 0; font-size: 12px; color: #a1a1aa;">
                      ${band.motto || 'BandJam Collaboration Vault'}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px;">
              <h2 style="margin: 0 0 12px 0; font-size: 17px; font-weight: 700; color: #ffffff;">
                ${headline}
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                ${bodyText.replace(/\n/g, '<br>')}
              </p>

              ${
                details.length > 0
                  ? `<div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 10px; padding: 12px; margin-bottom: 24px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        ${detailsRows}
                      </table>
                    </div>`
                  : ''
              }

              ${
                actionLabel
                  ? `<table border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td align="center" style="border-radius: 8px; background-color: ${accentColorHex};">
                          <a href="${actionUrl || '#'}" target="_blank" style="font-size: 13px; font-weight: 700; color: #09090b; text-decoration: none; padding: 12px 24px; border-radius: 8px; display: inline-block;">
                            ${actionLabel}
                          </a>
                        </td>
                      </tr>
                    </table>`
                  : ''
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; background-color: #09090b; border-top: 1px solid #27272a; font-size: 11px; color: #71717a; text-align: center;">
              <p style="margin: 0 0 4px 0;">
                You received this email because you are a member of <strong>${band.name}</strong> on BandJam.
              </p>
              <p style="margin: 0;">
                To customize your email notification preferences, visit <strong>Admin & Settings &gt; Profile Management</strong> or <strong>SMTP Settings</strong>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatches an email notification via the backend API or simulated queue,
 * and records it into the persistent Email Notification Outbox.
 */
export async function sendBandNotification(params: {
  recipient: BandMember;
  subject: string;
  eventType: EmailEventType;
  htmlContent: string;
  smtpSettings: SmtpSettings;
}): Promise<EmailNotificationLog> {
  const { recipient, subject, eventType, htmlContent, smtpSettings } = params;

  const logId = `eml-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const hostUsed = smtpSettings.isEnabled
    ? `${smtpSettings.host || 'smtp.custom'}:${smtpSettings.port || 587}`
    : 'SMTP Disabled (Simulated)';

  let status: 'sent' | 'simulated' | 'failed' = 'simulated';
  let errorMessage: string | undefined = undefined;

  // If SMTP is enabled and we have at least a host, attempt to send through /api/smtp/send
  if (smtpSettings.isEnabled && smtpSettings.host) {
    try {
      const res = await fetch('/api/smtp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipient.email,
          toName: recipient.name,
          subject,
          html: htmlContent,
          smtpSettings,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        status = data.status === 'sent' ? 'sent' : 'simulated';
      } else {
        const errData = await res.json().catch(() => ({}));
        status = 'failed';
        errorMessage = errData.message || `Server returned ${res.status}`;
      }
    } catch (e: any) {
      // Backend not running or network error -> fallback to simulated success so UX never crashes
      console.warn('Backend SMTP API unreachable; logging simulated email dispatch:', e);
      status = 'simulated';
      errorMessage = 'Delivered to local simulated band outbox (Backend offline or connecting)';
    }
  } else {
    status = 'simulated';
  }

  const newLog: EmailNotificationLog = {
    id: logId,
    recipientEmail: recipient.email,
    recipientName: recipient.name,
    subject,
    eventType,
    status,
    sentAt: now,
    htmlContent,
    errorMessage,
    smtpHostUsed: hostUsed,
  };

  return newLog;
}
