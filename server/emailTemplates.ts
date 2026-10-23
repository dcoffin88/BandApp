import type { AppSettings } from '../src/types/band.ts';

export interface EmailDetail {
  label: string;
  value: string;
}

export interface EmailContent {
  preheader: string;
  eyebrow: string;
  title: string;
  greeting?: string;
  intro: string;
  details?: EmailDetail[];
  callout?: {
    label: string;
    text: string;
  };
  ctaLabel: string;
  ctaUrl?: string;
  afterCta?: string;
}

export interface EmailBrand {
  bandName: string;
  subtitle: string;
  appUrl: string;
  appSettings: Pick<AppSettings, 'primaryColor' | 'customColor'> &
    Partial<
      Pick<
        AppSettings,
        'headerLogoUrl' | 'headerLogoShape' | 'accentGlow'
      >
    >;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
  cid: string;
}

const REHEARSAL_HQ_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#09090b" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>`;

const DEFAULT_LOGO_DATA_URL = `data:image/svg+xml;base64,${Buffer.from(REHEARSAL_HQ_LOGO).toString('base64')}`;

export function prepareEmailForDelivery(html: string): {
  html: string;
  attachments: EmailAttachment[];
} {
  const attachments: EmailAttachment[] = [];
  const transportHtml = html.replace(
    /src="data:image\/(png|jpeg|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)"/g,
    (_match, subtype: string, data: string) => {
      const cid = `rehearsalhq-logo-${attachments.length + 1}`;
      attachments.push({
        filename: `rehearsalhq-logo.${subtype === 'svg+xml' ? 'svg' : subtype}`,
        content: Buffer.from(data, 'base64'),
        contentType: `image/${subtype}`,
        cid,
      });
      return `src="cid:${cid}"`;
    },
  );
  return { html: transportHtml, attachments };
}

const ACCENT_COLORS: Record<string, string> = {
  amber: '#f59e0b',
  emerald: '#10b981',
  cyan: '#06b6d4',
  purple: '#a855f7',
  rose: '#f43f5e',
  orange: '#f97316',
  blue: '#3b82f6',
  indigo: '#6366f1',
  teal: '#14b8a6',
  lime: '#84cc16',
  pink: '#ec4899',
};

export const escapeEmailHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] || character,
  );

const withLineBreaks = (value: string) =>
  escapeEmailHtml(value).replaceAll('\n', '<br>');

const accentFor = (settings: EmailBrand['appSettings']) => {
  if (
    settings.primaryColor === 'custom' &&
    settings.customColor &&
    /^#[0-9a-fA-F]{6}$/.test(settings.customColor)
  ) {
    return settings.customColor;
  }
  return ACCENT_COLORS[settings.primaryColor] || ACCENT_COLORS.amber;
};

export function renderBrandedEmail(
  brand: EmailBrand,
  content: EmailContent,
): RenderedEmail {
  const accent = accentFor(brand.appSettings);
  const ctaUrl = content.ctaUrl || brand.appUrl;
  const logoUrl = brand.appSettings.headerLogoUrl || DEFAULT_LOGO_DATA_URL;
  const logoShape = brand.appSettings.headerLogoShape || 'rounded';
  const logoRadius =
    logoShape === 'circle' ? '999px' : logoShape === 'square' ? '8px' : '16px';
  const logoGlow = brand.appSettings.accentGlow
    ? `box-shadow:0 0 18px ${accent}66;`
    : '';
  const customLogo = Boolean(brand.appSettings.headerLogoUrl);
  const logo = customLogo
    ? `<img src="${escapeEmailHtml(logoUrl)}" width="44" height="44" alt="${escapeEmailHtml(brand.bandName)}" style="display:block;width:44px;height:44px;object-fit:cover;border:2px solid ${accent}66;border-radius:${logoRadius};${logoGlow}">`
    : `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="width:44px;height:44px;border-radius:16px;background:${accent};background-image:linear-gradient(45deg,#f59e0b,#e11d48);text-align:center;vertical-align:middle;${logoGlow}"><img src="${DEFAULT_LOGO_DATA_URL}" width="24" height="24" alt="RehearsalHQ" style="display:inline-block;width:24px;height:24px;vertical-align:middle;"></td></tr></table>`;
  const details = (content.details || []).filter(
    (detail) => detail.value.trim().length > 0,
  );
  const detailRows = details
    .map(
      ({ label, value }) => `
        <tr>
          <td style="padding:9px 12px;color:#a1a1aa;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;border-bottom:1px solid #27272a;width:34%;vertical-align:top;">${escapeEmailHtml(label)}</td>
          <td style="padding:9px 12px;color:#f4f4f5;font-size:14px;line-height:1.45;border-bottom:1px solid #27272a;vertical-align:top;">${withLineBreaks(value)}</td>
        </tr>`,
    )
    .join('');
  const detailTable = detailRows
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0;border:1px solid #3f3f46;border-radius:12px;border-collapse:separate;overflow:hidden;background:#18181b;">${detailRows}</table>`
    : '';
  const callout = content.callout?.text.trim()
    ? `<div style="margin:22px 0;padding:16px 18px;border-left:4px solid ${accent};border-radius:8px;background:#27272a;">
        <div style="margin-bottom:6px;color:${accent};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.09em;">${escapeEmailHtml(content.callout.label)}</div>
        <div style="color:#e4e4e7;font-size:14px;line-height:1.6;">${withLineBreaks(content.callout.text)}</div>
      </div>`
    : '';
  const greeting = content.greeting
    ? `<p style="margin:0 0 12px;color:#f4f4f5;font-size:15px;line-height:1.6;">Hi ${escapeEmailHtml(content.greeting)},</p>`
    : '';
  const afterCta = content.afterCta
    ? `<p style="margin:18px 0 0;color:#a1a1aa;font-size:12px;line-height:1.6;">${withLineBreaks(content.afterCta)}</p>`
    : '';

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${escapeEmailHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;color:#f4f4f5;font-family:Inter,Segoe UI,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeEmailHtml(content.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#09090b;">
    <tr>
      <td align="center" style="padding:28px 14px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;border:1px solid #3f3f46;border-radius:18px;border-collapse:separate;overflow:hidden;background:#18181b;box-shadow:0 18px 50px rgba(0,0,0,.35);">
          <tr>
            <td style="padding:22px 26px;border-bottom:1px solid #3f3f46;background:#18181b;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:44px;height:44px;vertical-align:middle;">${logo}</td>
                  <td style="padding-left:13px;vertical-align:middle;">
                    <div style="color:#fafafa;font-size:19px;font-weight:800;line-height:1.2;">${escapeEmailHtml(brand.bandName)}</div>
                    <div style="margin-top:3px;color:#a1a1aa;font-size:12px;line-height:1.3;">${escapeEmailHtml(brand.subtitle)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 26px 28px;">
              <div style="margin-bottom:8px;color:${accent};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.1em;">${escapeEmailHtml(content.eyebrow)}</div>
              <h1 style="margin:0 0 18px;color:#fafafa;font-size:26px;line-height:1.2;letter-spacing:-.02em;">${escapeEmailHtml(content.title)}</h1>
              ${greeting}
              <p style="margin:0;color:#d4d4d8;font-size:15px;line-height:1.65;">${withLineBreaks(content.intro)}</p>
              ${detailTable}
              ${callout}
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                <tr>
                  <td style="border-radius:10px;background:${accent};">
                    <a href="${escapeEmailHtml(ctaUrl)}" style="display:inline-block;padding:12px 20px;color:#09090b;font-size:14px;font-weight:800;text-decoration:none;">${escapeEmailHtml(content.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
              ${afterCta}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 26px;border-top:1px solid #3f3f46;background:#09090b;color:#71717a;font-size:11px;line-height:1.6;">
              Sent by ${escapeEmailHtml(brand.bandName)} through <a href="https://github.com/dcoffin88/RehearsalHQ" style="color:#a1a1aa;text-decoration:underline;">RehearsalHQ</a>.<br>
              Manage notification preferences in Profile &amp; Settings.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    brand.bandName,
    brand.subtitle,
    '',
    content.eyebrow.toUpperCase(),
    content.title,
    '',
    content.greeting ? `Hi ${content.greeting},` : '',
    content.intro,
    '',
    ...details.map(({ label, value }) => `${label}: ${value}`),
    details.length ? '' : '',
    content.callout?.text
      ? `${content.callout.label}:\n${content.callout.text}\n`
      : '',
    `${content.ctaLabel}: ${ctaUrl}`,
    content.afterCta || '',
    '',
    `Sent by ${brand.bandName} through RehearsalHQ.`,
    'Manage notification preferences in Profile & Settings.',
  ]
    .filter((line, index, lines) => line !== '' || lines[index - 1] !== '')
    .join('\n')
    .trim();

  return { html, text };
}
