// screens/receiptTemplate.js
//
// All of the "what the receipt looks like" code lives here:
// - amount / date formatting helpers used to populate the receipt
// - the HTML/CSS template that gets rendered to PDF via expo-print
//
// Keeping this separate from WalletToWalletTransfer.jsx means the screen
// file only has to deal with app logic, and this file only has to deal
// with the visual design of the receipt.

// The organisation name printed on the receipt — the app's own name.
const { brand } = require('config/brand');

// ─── Formatting Helpers ────────────────────────────────────────────────────

export function formatAmountNaira(amount) {
  if (amount == null) return '—';
  const num = Number(amount);
  if (isNaN(num)) return '—';
  return '₦' + num.toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

export function getNow() {
  const now = new Date();
  return (
    now.toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) +
    ', ' +
    now.toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  );
}

// Height estimate for printReceiptPdf (utils/receiptPdf.js), in CSS px:
// everything but the table rows, and one row.
export const RECEIPT_LAYOUT = { base: 590, row: 38 };

// ─── PDF Receipt Template ───────────────────────────────────────────────────

export function buildReceiptHTML({
  amount,
  destinationAccountName,
  destinationAccountNumber,
  transactionId,
  senderName,
}) {
  const printDate = getNow();
  const formattedAmount = formatAmountNaira(amount);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; background:#fff; color:#111827; }

    /* Perforated top */
    .perf-top {
      height:18px;
      background:radial-gradient(circle at 50% 100%,#fff 8px,#F3F4F6 8px);
      background-size:24px 18px;
      background-repeat:repeat-x;
    }

    .page { width:100%; max-width:520px; margin:0 auto; padding:32px 28px 44px; }

    /* Header */
    .header {
      display:flex; align-items:center; justify-content:space-between;
      padding-bottom:16px; border-bottom:2px solid #F3F4F6; margin-bottom:24px;
    }
    .org-name { font-size:17px; font-weight:800; color:#111827; }
    .org-sub  { font-size:10px; color:#9CA3AF; margin-top:2px; }
    .receipt-title { font-size:13px; font-weight:600; color:#6B7280; text-align:right; }

    /* Hero */
    .hero { text-align:center; padding:4px 0 24px; }
    .hero-label { font-size:11px; font-weight:700; color:#9CA3AF; letter-spacing:1px; text-transform:uppercase; margin-bottom:6px; }
    .hero-amount { font-size:44px; font-weight:900; color:#111827; letter-spacing:-2px; line-height:1; }
    .status-badge {
      display:inline-flex; align-items:center; gap:6px;
      background:#ECFDF5; color:#059669;
      padding:5px 14px; border-radius:20px;
      font-size:12px; font-weight:600; margin-top:12px;
    }
    .status-dot { width:7px; height:7px; border-radius:50%; background:#059669; display:inline-block; }

    /* Dashed divider */
    .dash { border:none; border-top:1.5px dashed #E5E7EB; margin:4px 0 20px; }

    /* Detail table */
    .section-label {
      font-size:10px; font-weight:700; color:#9CA3AF;
      text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;
    }
    table { width:100%; border-collapse:collapse; }
    tr td { padding:10px 0; border-bottom:1px solid #F3F4F6; }
    tr:last-child td { border-bottom:none; }
    .td-label { font-size:13px; color:#6B7280; width:46%; vertical-align:top; }
    .td-value { font-size:13px; color:#111827; font-weight:600; text-align:right; vertical-align:top; word-break:break-all; }

    /* Ref box */
    .ref-box { background:#F9FAFB; border-radius:10px; padding:14px 16px; margin-top:20px; }

    /* Verified */
    .verified {
      display:flex; justify-content:space-between; align-items:center;
      background:#F0FDF4; border:1px solid #BBF7D0;
      border-radius:10px; padding:12px 16px; margin-top:20px;
    }
    .verified-text { font-size:12px; font-weight:700; color:#059669; }
    .verified-sub  { font-size:10px; color:#6EE7B7; margin-top:2px; }
    .ref-box-inner { font-size:9px; color:#BBF7D0; border:1.5px dashed #BBF7D0; border-radius:6px; padding:6px 8px; text-align:center; line-height:1.4; }

    /* Footer */
    .footer { text-align:center; margin-top:24px; }
    .footer-note  { font-size:11px; color:#9CA3AF; line-height:1.7; }
    .footer-brand { font-size:10px; color:#D1D5DB; margin-top:10px; }
    .print-date   { font-size:10px; color:#D1D5DB; margin-top:4px; }

    /* Perforated bottom */
    .perf-bottom {
      height:18px;
      background:radial-gradient(circle at 50% 0%,#fff 8px,#F3F4F6 8px);
      background-size:24px 18px;
      background-repeat:repeat-x;
    }
  </style>
</head>
<body>

<div class="perf-top"></div>

<div class="page">

  <!-- Header -->
  <div class="header">
    <div>
      <div class="org-name">${brand.appName}</div>
      <div class="org-sub">Powered by ${brand.poweredBy}</div>
    </div>
    <div class="receipt-title">Transaction<br/>Receipt</div>
  </div>

  <!-- Hero -->
  <div class="hero">
    <div class="hero-label">Amount Sent</div>
    <div class="hero-amount">${formattedAmount}</div>
    <div>
      <span class="status-badge">
        <span class="status-dot"></span>
        Successful
      </span>
    </div>
  </div>

  <hr class="dash"/>

  <!-- Transaction Details -->
  <div class="section-label">Transaction Details</div>
  <table>
    <tbody>
      ${
        senderName
          ? `
      <tr>
        <td class="td-label">Sender Name</td>
        <td class="td-value">${senderName}</td>
      </tr>`
          : ''
      }
      <tr>
        <td class="td-label">Beneficiary Name</td>
        <td class="td-value">${destinationAccountName ?? '—'}</td>
      </tr>
      <tr>
        <td class="td-label">Account Number</td>
        <td class="td-value">${destinationAccountNumber ?? '—'}</td>
      </tr>
      <tr>
        <td class="td-label">Amount</td>
        <td class="td-value">${formattedAmount}</td>
      </tr>
      <tr>
        <td class="td-label">Transaction Type</td>
        <td class="td-value">Wallet Transfer</td>
      </tr>
    </tbody>
  </table>

  <!-- Reference -->
  <div class="ref-box">
    <div class="section-label" style="margin-bottom:8px;">Reference</div>
    <table>
      <tbody>
        <tr>
          <td class="td-label">Transaction ID</td>
          <td class="td-value">${transactionId ?? '—'}</td>
        </tr>
        <tr>
          <td class="td-label">Date</td>
          <td class="td-value">${printDate}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Verified -->
  <div class="verified">
    <div>
      <div class="verified-text">✓ Transaction Verified</div>
      <div class="verified-sub">This receipt is electronically generated</div>
    </div>
    <div class="ref-box-inner">TX<br/>REF</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p class="footer-note">
      This receipt requires no signature.<br/>
      For queries, contact your branch or customer support.
    </p>
    <p class="footer-brand">${brand.appName}</p>
    <p class="print-date">Printed: ${printDate}</p>
  </div>

</div>

<div class="perf-bottom"></div>

</body>
</html>`;
}
