// receiptTemplate.js
// Pure presentation layer for transaction receipt PDFs.
// Styled to match TransactionDetailModal (scalloped ticket card, brand colour,
// status icon circle, secure badge). Keep all visual/design changes confined
// to this file.
//
// This is written to be REUSABLE across receipt types (transfers, deposits,
// withdrawals, airtime, bills, etc.) — not just the transfer modal. See the
// `details` param in buildReceiptHTML for how other screens should plug in.

// From the palette (light — a printed receipt has no dark mode).
const { light: brandLight, brand } = require('config/brand');
const BRAND = brandLight.primary;
const BRAND_LIGHT = brandLight.primaryLight;

// ─── Formatters ─────────────────────────────────────────────────────────────

export function formatAmountNaira(amount) {
  if (amount == null) return '—';
  const num = Number(amount);
  if (isNaN(num)) return '—';
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

export function formatFullDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return (
    date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  );
}

export function safeString(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.trim() === '' ? '—' : value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') {
    const display = value?.name || value?.fullName || value?.accountName || value?.label;
    if (display) return String(display);
  }
  return '—';
}

export function maskAccountNumber(accountNumber) {
  const str = String(accountNumber || '');
  if (str.length <= 6) return str;
  return str.slice(0, 3) + '****' + str.slice(-3);
}

export function getStatusColor(status) {
  const s = status?.toLowerCase();
  if (s === 'successful' || s === 'success' || s === 'approved') return '#059669';
  if (s === 'failed' || s === 'declined' || s === 'rejected') return '#DC2626';
  return '#D97706';
}

function getStatusBg(status) {
  const s = status?.toLowerCase();
  if (s === 'successful' || s === 'success' || s === 'approved') return '#ECFDF5';
  if (s === 'failed' || s === 'declined' || s === 'rejected') return '#FEF2F2';
  return '#FFFBEB';
}

// ─── Inline status/shield icons (no external assets needed for print) ──────

function checkIconSVG(color) {
  return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="none"/>
    <path d="M7 12.5l3 3 7-7.5" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </svg>`;
}
function closeIconSVG(color) {
  return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="${color}" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;
}
function clockIconSVG(color) {
  return `<svg width="32" height="32" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="${color}" stroke-width="2"/>
    <path d="M12 7v5l3.5 2" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
  </svg>`;
}
function shieldIconSVG(color) {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2l7 3v6c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V5l7-3z" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M9 12l2 2 4-4.5" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}
function getStatusIconSVG(status, color) {
  const s = status?.toLowerCase();
  if (s === 'successful' || s === 'success' || s === 'approved') return checkIconSVG(color);
  if (s === 'failed' || s === 'declined' || s === 'rejected') return closeIconSVG(color);
  return clockIconSVG(color);
}

// ─── Watermark pattern (tiled, rotated brand name) ──────────────────────────

function buildWatermarkDataUri(brandName) {
  const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="160">
          <text x="8" y="90" font-family="Helvetica, Arial, sans-serif" font-size="18"
                fill="#F5F6F8" transform="rotate(-28 100 80)">${brandName}</text>
        </svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg.replace(/\s+/g, ' '));
}

// ─── Row builders ────────────────────────────────────────────────────────────
// These are the reusable primitives. Any screen (transfer, airtime, bills,
// deposits, etc.) can build its own `details` array of { label, value, subValue }
// and pass it in — it doesn't have to fit the recipient/sender shape.

function buildPartyRow(label, name, bank, account) {
  if (!name && !account) return '';

  const nameLine = name
    ? `<div style="color:#111827; font-size:14px; font-weight:700;">${safeString(name)}</div>`
    : '';

  let subLine = '';
  if (bank && account) {
    subLine = `${safeString(bank)} | ${safeString(account)}`;
  } else if (bank) {
    subLine = safeString(bank);
  } else if (account) {
    subLine = safeString(account);
  }

  const subLineHTML = subLine
    ? `<div style="color:#6B7280; font-size:12px; margin-top:2px;">${subLine}</div>`
    : '';

  return `
        <tr>
          <td style="padding:9px 0; color:#6B7280; font-size:12px; width:34%; white-space:nowrap; vertical-align:top;">${label}</td>
          <td style="padding:9px 0; text-align:right; vertical-align:top;">
            ${nameLine}
            ${subLineHTML}
          </td>
        </tr>`;
}

// Generic reusable row — { label, value, subValue }. Used for both the
// reference section and any custom `details` a caller passes in.
function buildDetailRow(label, value, subValue) {
  if (value === undefined || value === null || value === '') return '';
  const valueStr = safeString(value);
  if (valueStr === '—') return '';

  const subLineHTML = subValue
    ? `<div style="color:#6B7280; font-size:11px; margin-top:2px;">${safeString(subValue)}</div>`
    : '';

  return `
        <tr>
          <td style="padding:8px 0; color:#6B7280; font-size:12px; width:34%; white-space:nowrap; vertical-align:top;">${label}</td>
          <td style="padding:8px 0; color:#111827; font-size:13px; font-weight:600; text-align:right; word-break:break-all; vertical-align:top;">
            ${valueStr}
            ${subLineHTML}
          </td>
        </tr>`;
}

// Height estimate for printReceiptPdf (utils/receiptPdf.js), in CSS px:
// everything but the table rows, and an average row (detail rows are ~32,
// party rows with their bank line ~50).
export const RECEIPT_LAYOUT = { base: 390, row: 40 };

// ─── Receipt HTML builder ───────────────────────────────────────────────────
//
// `data` shape (all fields optional unless noted):
// {
//   brandName, brandSubtitle, brandInitial, brandLogoUri, // brandLogoUri: base64 or remote img src, takes over from the initial badge
//   amount, status, date,                                  // required for the hero section
//   recipient: { name, bank, account },                    // transfer-style receipts
//   sender:    { name, bank, account, masked },
//   details: [{ label, value, subValue }],                 // generic rows — use this for
//                                                           // non-transfer receipts (airtime,
//                                                           // bills, data, deposits, etc.)
//   transactionId, sessionId, fee,
//   footerNote,                                             // override the default footer copy
// }

export function buildReceiptHTML(data) {
  const {
    brandName = 'Receipt',
    brandSubtitle = '',
    brandInitial = brandName.charAt(0).toUpperCase(),
    brandLogoUri,
    amount,
    status,
    date,
    recipient = {},
    sender = {},
    details = [],
    transactionId,
    sessionId,
    fee,
    footerNote,
  } = data;

  const statusColor = getStatusColor(status);
  const statusBg = getStatusBg(status);
  const statusIcon = getStatusIconSVG(status, statusColor);
  const watermark = buildWatermarkDataUri(brandName);

  const senderAccountDisplay = sender.masked ? maskAccountNumber(sender.account) : sender.account;

  const partyHTML = [
    buildPartyRow('Recipient', recipient.name, recipient.bank, recipient.account),
    buildPartyRow('Sender', sender.name, sender.bank, senderAccountDisplay),
  ].join('');

  // Generic, reusable rows for any receipt type (airtime, bills, data, etc.)
  const detailsHTML = (details || [])
    .map((row) => buildDetailRow(row?.label, row?.value, row?.subValue))
    .join('');

  const refHTML = [
    buildDetailRow('Transaction No.', transactionId),
    buildDetailRow('Session ID', sessionId),
    fee != null ? buildDetailRow('Fee', formatAmountNaira(fee)) : '',
  ].join('');

  const logoHTML = brandLogoUri
    ? `<img src="${brandLogoUri}" style="width:34px; height:34px; object-fit:contain;" />`
    : `<div class="brand-badge">${brandInitial}</div>`;

  const defaultFooter = `Enjoy seamless payments with ${brandName}. Send money, save, and
      grow your finances with ease. ${brandName} is powered by ${brand.poweredBy}.`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Helvetica Neue', Helvetica, Arial, sans-serif; background:#F3F4F6; color:#111827; }

    /* Scalloped ticket edges — bumps sized/spaced to nearly touch so the
       card reads as a continuous wavy border, matching the app modal. */
    .scallop-top {
      height:16px;
      background: radial-gradient(circle at 50% 100%, transparent 10px, #fff 10px);
      background-size:22px 16px;
      background-repeat:repeat-x;
      background-color:#F3F4F6;
    }
    .scallop-bottom {
      height:16px;
      background: radial-gradient(circle at 50% 0%, transparent 10px, #fff 10px);
      background-size:22px 16px;
      background-repeat:repeat-x;
      background-color:#F3F4F6;
    }

    .page {
      position:relative;
      width:100%;
      padding:14px 18px 10px;
      background:#fff;
      background-image:url("${watermark}");
      background-repeat:repeat;
    }

    .header {
      display:flex; align-items:center; justify-content:space-between;
      padding-bottom:10px;
    }
    .brand { display:flex; align-items:center; gap:8px; }
    .brand-badge {
      width:34px; height:34px; border-radius:10px;
      background:${BRAND_LIGHT}; color:${BRAND};
      display:flex; align-items:center; justify-content:center;
      font-weight:800; font-size:14px;
      flex-shrink:0;
    }
    .brand-name { font-size:14px; font-weight:800; color:#111827; line-height:1.2; }
    .brand-sub  { font-size:9px; color:#9CA3AF; margin-top:1px; }
    .receipt-title { font-size:11px; font-weight:600; color:#6B7280; text-align:right; line-height:1.3; }

    .hero { text-align:center; padding:6px 0 18px; }
    .hero-icon {
      width:56px; height:56px; border-radius:28px;
      background:${statusBg};
      display:flex; align-items:center; justify-content:center;
      margin:0 auto 10px;
    }
    .hero-amount { font-size:28px; font-weight:800; color:#111827; letter-spacing:-0.5px; }
    .hero-status { font-size:14px; font-weight:700; color:${statusColor}; margin-top:8px; }
    .hero-date { font-size:11px; color:#9CA3AF; margin-top:4px; }

    hr.dash  { border:none; border-top:1.5px dashed #E5E7EB; margin:4px 0; }

    table { width:100%; border-collapse:collapse; }
    table.rows tr + tr td { border-top:1px solid #F3F4F6; }

    .secure {
      display:flex; align-items:center; gap:10px;
      background:#EFF8FB; border-radius:12px; padding:12px;
      margin-top:14px;
    }
    .secure-icon {
      width:30px; height:30px; border-radius:15px;
      background:#DDEEF3;
      display:flex; align-items:center; justify-content:center;
      flex-shrink:0;
    }
    .secure-title { font-size:12.5px; font-weight:700; color:#111827; }
    .secure-sub { font-size:10.5px; color:#6B7280; margin-top:1px; }

    .footer { text-align:center; margin-top:12px; padding:0 1px; }
    .footer-note { font-size:9px; color:#9CA3AF; line-height:1.5; }
  </style>
</head>
<body>

<div class="scallop-top"></div>

<div class="page">
  <div class="header">
    <div class="brand">
      ${logoHTML}
      <div>
        <div class="brand-name">${brandName}</div>
        ${brandSubtitle ? `<div class="brand-sub">${brandSubtitle}</div>` : ''}
      </div>
    </div>
    <div class="receipt-title">Transaction<br/>Receipt</div>
  </div>

  <div class="hero">
    <div class="hero-icon">${statusIcon}</div>
    <div class="hero-amount">${formatAmountNaira(amount)}</div>
    <div class="hero-status">${safeString(status)}</div>
    <div class="hero-date">${safeString(date)}</div>
  </div>

  <hr class="dash"/>

  ${partyHTML ? `<table class="rows"><tbody>${partyHTML}</tbody></table>` : ''}

  ${detailsHTML ? `<hr class="dash"/><table class="rows"><tbody>${detailsHTML}</tbody></table>` : ''}

  ${refHTML ? `<hr class="dash"/><table class="rows"><tbody>${refHTML}</tbody></table>` : ''}

  <div class="secure">
    <div class="secure-icon">${shieldIconSVG(BRAND)}</div>
    <div>
      <div class="secure-title">Secure &amp; Protected</div>
      <div class="secure-sub">Your transaction is secure and protected</div>
    </div>
  </div>

  <div class="footer">
    <p class="footer-note">${footerNote || defaultFooter}</p>
  </div>
</div>

<div class="scallop-bottom"></div>

</body>
</html>`;
}
