// utils/helpers.js
import { Colors } from 'config/theme';

export function trimMessage(message, maxLength = 150) {
  if (!message) return 'Something went wrong';
  const str = String(message);
  return str.length > maxLength ? str.substring(0, maxLength).trimEnd() + '...' : str;
}

// Try to JSON.parse a string that looks like JSON; return null otherwise.
function tryParseJson(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

// Pull the most human-readable message out of a response-body object, trying
// the field names the various backend versions have used.
function readMessageField(obj) {
  if (!obj || typeof obj !== 'object') return null;
  const candidate =
    obj.responseMessage ?? obj.errorMessage ?? obj.error ?? obj.message ?? obj.detail;
  return typeof candidate === 'string' && candidate.trim() ? candidate : null;
}

// Extract a clean, human-readable error message, resilient to every response
// shape this backend has shipped. The API layer changed hands mid-project and
// the error envelope changed with it, so this handles both:
//   A) { errorCode, message: "Readable text", success }              — plain message (new dev)
//   B) { errorCode, message: '{"responseMessage":"...","...":...}' } — JSON wrapped in message (old dev)
//   C) { responseMessage: "...", responseCode, ... }                 — top-level responseMessage
//   D) a raw JSON (or plain) string body
// Accepts an axios error (body at error.response.data), a raw response body
// object (the fetch-based endpoints pass their parsed `data`), or a plain
// Error. Always returns a trimmed, display-ready string.
export function extractApiErrorMessage(input) {
  // Locate the response body: axios errors nest it at .response.data; otherwise
  // treat the input itself as the body (fetch's parsed json, or an Error).
  const rawBody = input?.response?.data !== undefined ? input.response.data : input;
  const body =
    typeof rawBody === 'string' ? (tryParseJson(rawBody) ?? { message: rawBody }) : rawBody;

  // If `message` is itself a JSON string (shape B), unwrap it first so we get
  // the inner responseMessage rather than the raw JSON blob.
  const fromNested = readMessageField(tryParseJson(body?.message));

  const candidate = fromNested ?? readMessageField(body) ?? input?.message;
  return trimMessage(candidate);
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatAmount = (amount) =>
  `₦${Number(amount ?? 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

// Formats a loan tenure as "<count> <time-unit>" (e.g. "1 week", "8 days"),
// deriving the unit from tenureType (Daily/Weekly/Monthly/Yearly) and pluralising
// by count. Keeps tenure (the loan's duration) distinct from repayment frequency,
// which the backend returns separately — previously the UI showed "1 Weekly".
// `t` is the i18next translator (units live under loans.tenureUnit*).
export const formatTenure = (t, type, count) => {
  const n = Number(count);
  if (count == null || Number.isNaN(n)) return '—';
  const key = String(type ?? '').toLowerCase();
  let unit;
  if (key.startsWith('dai') || key.startsWith('day'))
    unit = n === 1 ? 'tenureUnitDay' : 'tenureUnitDays';
  else if (key.startsWith('week')) unit = n === 1 ? 'tenureUnitWeek' : 'tenureUnitWeeks';
  else if (key.startsWith('month')) unit = n === 1 ? 'tenureUnitMonth' : 'tenureUnitMonths';
  else if (key.startsWith('year') || key.startsWith('ann'))
    unit = n === 1 ? 'tenureUnitYear' : 'tenureUnitYears';
  else return type ? `${n} ${type}` : `${n}`; // unknown unit — show what we have
  return `${n} ${t(`loans.${unit}`)}`;
};

export const formatWithCommas = (value) => {
  const digits = value.replace(/[^0-9.]/g, '');
  const parts = digits.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0];
};

export const stripCommas = (value) => value.replace(/,/g, '');

// Deduplicate transactions by accountNumber, keep most recent per account
// Transactions the core-banking system posts on the user's behalf — salary,
// PAYE/pension/welfare deductions, cash withdrawals, airtime/bill-payment
// vendor & commission legs — are NOT people the user can transfer to. They
// surface with a non-account recipient like "System" or an internal GL name
// such as "BILL PAYMENT-VENDOR PAYABLE". Keep only genuine wallet-to-wallet
// recipients so the transfer screen's recent list doesn't suggest them.
function isTransferableRecipient(tx) {
  const acct = String(tx?.recipientAccountNumber ?? '').trim();
  // A real NUBAN is numeric; "System" and blanks fail this outright.
  if (!/^\d{6,}$/.test(acct)) return false;

  const name = String(tx?.recipientName ?? tx?.recipient ?? '')
    .trim()
    .toUpperCase();
  if (!name || name === 'SYSTEM') return false;
  // Internal ledger / vendor legs, not customers.
  if (name.startsWith('BILL PAYMENT')) return false;

  return true;
}

export function getUniqueRecipients(transactions = []) {
  const seen = new Map();
  for (const tx of transactions) {
    if (!isTransferableRecipient(tx)) continue;
    if (!seen.has(tx.recipientAccountNumber)) {
      seen.set(tx.recipientAccountNumber, tx);
    }
  }
  return Array.from(seen.values());
}

// Converts TIER_2 → "Tier 2 Account"
export function formatTier(tier) {
  if (!tier) return 'Tier 1 Account';
  const match = tier?.toString()?.match(/\d+/);
  return match ? `Tier ${match[0]} Account` : 'Tier 1 Account';
}

// Returns "Upgrade to Tier X" or null if already at max tier (3)
export function getUpgradeLabel(tier) {
  const match = tier?.toString()?.match(/\d+/);
  if (!match) return 'Upgrade to Tier 2';
  const current = parseInt(match[0], 10);
  if (current >= 3) return null;
  return `Upgrade to Tier ${current + 1}`;
}

// helpers/loanStatus.js
export const getLoanStatusConfig = (status) => {
  const s = (status ?? '').toLowerCase();

  if (s === 'completed' || s === 'paid')
    return {
      statusColor: '#16A34A',
      progressOverride: 100,
      progressColor: '#16A34A',
      progressLabel: 'Fully paid',
      badge: { bgColor: '#DCFCE7', textColor: '#16A34A', icon: 'checkmark-circle' },
      button: {
        label: 'View Details',
        bgColor: '#16A34A',
        textColor: '#fff',
        icon: 'checkmark-circle-outline',
        disabled: false,
        action: 'details',
      },
    };

  if (s === 'declined')
    return {
      statusColor: '#DC2626',
      progressOverride: 0,
      progressColor: '#DC2626',
      progressLabel: 'Not applicable',
      badge: { bgColor: '#FEE2E2', textColor: '#DC2626', icon: 'close-circle' },
      button: {
        label: 'View Details',
        bgColor: '#FEE2E2',
        textColor: '#DC2626',
        icon: 'close-circle-outline',
        disabled: false,
        action: 'details',
      },
    };

  if (s === 'processing')
    return {
      statusColor: '#D97706',
      progressOverride: null,
      progressColor: '#D97706',
      progressLabel: null,
      badge: { bgColor: '#FEF3C7', textColor: '#D97706', icon: 'time' },
      button: {
        label: 'View Details',
        bgColor: '#FEF3C7',
        textColor: '#D97706',
        icon: 'time-outline',
        disabled: false,
        action: 'details',
      },
    };

  if (s === 'approved')
    return {
      statusColor: '#2563EB',
      progressOverride: null,
      progressColor: Colors?.primary,
      progressLabel: null,
      badge: { bgColor: '#DBEAFE', textColor: '#2563EB', icon: 'radio-button-on' },
      button: {
        label: 'View Details',
        bgColor: Colors?.primary,
        textColor: '#fff',
        icon: 'document-text-outline',
        disabled: false,
        action: 'details',
      },
    };

  if (s === 'due')
    return {
      statusColor: '#DC2626',
      progressOverride: null,
      progressColor: '#DC2626',
      progressLabel: null,
      badge: { bgColor: '#FEE2E2', textColor: '#DC2626', icon: 'alert-circle' },
      button: {
        label: 'Make Repayment',
        bgColor: '#DC2626',
        textColor: '#fff',
        icon: 'card-outline',
        disabled: false,
        action: 'repayment',
      },
    };

  if (s === 'running')
    return {
      statusColor: '#16A34A',
      progressOverride: null,
      progressColor: Colors?.primary,
      progressLabel: null,
      badge: { bgColor: '#DCFCE7', textColor: '#16A34A', icon: 'radio-button-on' },
      button: {
        label: 'Make Repayment',
        bgColor: Colors?.primary,
        textColor: '#fff',
        icon: 'card-outline',
        disabled: false,
        action: 'repayment',
      },
    };

  return {
    statusColor: '#6B7280',
    progressOverride: null,
    progressColor: Colors?.primary,
    progressLabel: null,
    badge: { bgColor: '#F3F4F6', textColor: '#6B7280', icon: 'ellipse' },
    button: {
      label: 'View Details',
      bgColor: Colors?.primary,
      textColor: '#fff',
      icon: 'document-text-outline',
      disabled: false,
      action: 'details',
    },
  };
};
