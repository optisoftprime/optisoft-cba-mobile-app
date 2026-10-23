export const baseUrl = 'https://gateway.ezoneapps.com:30002/ezone-cba-mobile';
export const billsServicesUrl = 'https://gateway.ezoneapps.com:30002/ezone-bills-service';
// https://gateway.ezoneapps.com:30002/ezone-cba-mobile/api/v1/vendor-vending/execute
// https://gateway.ezoneapps.com:30002/ezone-bills-service/api/v1/vendor-vending/execute
// NOTE: the export name is orgKey (capital K) — every importer (auth.js,
// home.js, userProfile.js, config/api.js) imports { orgKey }. A lowercase
// `orgkey` here silently resolves to `undefined` at every call site, so the
// x-org-key header goes out empty and login fails. Keep this spelling.
// The organisation key of the ACTIVE CLIENT (brand/client.json → orgKey). Every
// client shares this gateway; the x-org-key header is what scopes a request to
// that client's bank. Never hardcode one here — see BRANDING.md.
export const orgKey = require('./../brand/client.json').orgKey;

// Page size for paginated / infinite-scroll lists. Sent as the `size` query
// param; the module walks the page number up from 0 while this stays fixed.
// Change here to tune how many records each infinite-scroll fetch pulls.
export const LIMIT = 10;

// Cadence for the app-wide support-ticket reply watcher (see
// components/useTicketReplyWatcher) that makes tickets "look live" without
// websockets. It runs across the whole logged-in section (mounted in appLayout)
// and adapts its polling:
//   • ACTIVE_MS  — base cadence while there IS ≥1 open ticket and something is
//                  happening (a reply just landed, or the user is engaging).
//   • MAX_MS     — the cadence backs off toward this when an open ticket exists
//                  but nothing has changed for a while (keeps it alive, cheap).
//   • IDLE_MS    — light heartbeat when there are NO open tickets: just re-checks
//                  the list occasionally to notice when one appears. No detail
//                  calls happen in this state.
// The watcher also fully PAUSES while the app is backgrounded (AppState), and
// snaps back to ACTIVE_MS on a new reply, on foreground, or on user activity.
export const TICKET_POLL_ACTIVE_MS = 15000;
export const TICKET_POLL_MAX_MS = 120000;
export const TICKET_POLL_IDLE_MS = 60000;

// How long the OTP screen makes the user wait before "Resend" unlocks, in
// seconds. Shown as a MM:SS countdown under the code boxes.
export const OTP_RESEND_COOLDOWN_SECONDS = 300;

export const routes = {
  // Auth
  initiate: '/api/v1/auth/onboarding/initiate',
  generateOtp: '/api/v1/auth/onboarding/otp/generate',
  generateOnRegOtp: '/api/v1/auth/resend-registration-verification-otp',
  validateOtp: '/api/v1/auth/onboarding/otp/validate',
  verifyAccountOtp: '/api/v1/auth/validate-reg-otp',
  validateResetPasswordOtp: '/api/v1/auth/onboarding/otp/validate-with-user-name',
  register: '/api/v1/auth/onboarding/register',
  login: '/api/v1/auth/login',
  passwordResetRequest: '/api/v1/auth/password-reset/request',
  passwordResetConfirm: '/api/v1/auth/password-reset/confirm',

  // Support — FAQ (getFaqs is paginated/SpringPage; categories is a plain array)
  supportFaq: '/api/v1/support/faq',
  supportFaqCategories: '/api/v1/support/faq/categories',

  // Support — Tickets. supportTickets is the base for the list (GET, paginated
  // SpringPage) and for detail/close/reply (append /{id}, /{id}/close,
  // /{id}/reply). supportTicketCategories feeds the create-ticket categoryId.
  supportTickets: '/api/v1/support/tickets',
  supportTicketCategories: '/api/v1/support/tickets/categories',

  // Security
  getSecurityQuestions: '/api/v1/auth/security-question',
  // setSecurityQuestions: '/api/v1/auth/set-security-questions',
  setSecurityQuestions: '/api/v1/setup/security-questions',
  // setupTransactionPin: '/api/v1/auth/setup-transaction-pin',
  setupTransactionPin: '/api/v1/setup/setup-transaction-pin',

  resetTransactionPin: '/api/v1/setup/transaction-pin/reset',
  // Forgot transaction PIN (user is logged in but can't remember the PIN).
  // initiate sends an OTP by SMS (no body — user resolved from JWT); confirm
  // verifies the OTP and writes the new PIN atomically in one request.
  forgotTransactionPinInitiate: '/api/v1/setup/transaction-pin/forgot/initiate',
  forgotTransactionPinConfirm: '/api/v1/setup/transaction-pin/forgot/confirm',
  validateSecurityQuestion: '/api/v1/auth/validate-security-question',
  // Transfer permission (account-level security lockdown). GET returns the
  // current state { transfersEnabled, stepUpRequiredToEnable, disabledAt? };
  // PUT toggles it. Enabling requires step-up (transaction PIN + security
  // Q&A + OTP); disabling does not.
  transferPermission: '/api/v1/security/transfer-permission',
  // Device management. deviceLimit: GET current { limit, activeDevices,
  // maxAllowed, enforced, canSetLimit } + PUT { limit }. devices: GET the list;
  // append /{publicId} to DELETE (step-up body) and /{publicId}/name to PATCH
  // { deviceName }.
  deviceLimit: '/api/v1/security/device-limit',
  devices: '/api/v1/security/devices',

  // Referral programme (per-org; 404 "not available for your organisation" when
  // the org has no programme configured). All GET, x-org-key required.
  referralCode: '/api/v1/referral/code',
  referralList: '/api/v1/referral/list',
  referralSummary: '/api/v1/referral/summary',

  // https://gateway.ezoneapps.com:30002/ezone-cba-mobile/api/v1/auth/set-security-questions

  //Customer

  onBoardNewUser: '/api/v1/auth/onboard-new-user',

  // Account
  accountSetup: '/api/v1/account/account-setup',
  allUserAccounts: '/api/v1/account/all-user-accounts',
  // Public onboarding: validates the entered account number, returns the
  // customer's accounts, and triggers the registration OTP automatically.
  publicValidateAccountNumber: '/api/v1/public/validate-account-number',
  // Public onboarding: resend the registration OTP for an account number.
  publicRegenerateOtp: '/api/v1/public/re-generate-otp',

  // Dashboard
  dashboard: '/api/v1/dashboard',
  orgAccountFormat: '/api/v1/organization/account-format',

  // Loan
  fetchAllOrgLoanProducts: '/api/v1/loanProduct/fetch-all-org-loan-product',
  loanBooking: '/api/v1/loan/loan-booking',
  loanPreview: '/api/v1/loan/loan-preview',
  myLoans: '/api/v1/loan/my-loans',
  loanRepayment: '/api/v1/loan/loan-repayment',
  // Full repayment (liquidation) quote: GET, read-only — `{loanId}` is filled in by api/loans.
  loanFullRepaymentQuote: '/api/v1/loan/{loanId}/full-repayment-quote',

  // Internal Transfer
  validateAccountNumber: '/api/v1/internal-transfer/validate-account-number',
  makeInternalTransfer: '/api/v1/internal-transfer/make-transfer',

  // Savings
  bookSavingProduct: '/api/v1/saving-product-booking',
  allSavingProducts: '/api/v1/saving-product-booking/all-saving-products',
  userSavingTransactions: '/api/v1/saving-product-booking/user-saving-transactions',

  // User Profile
  createSupportTicket: '/api/v1/user-profile/create-support-ticket',
  deactivateUser: '/api/v1/user-profile/deactivate-user',
  fetchNotificationPreferences: '/api/v1/user-profile/fetch-notification-preferences',
  fetchUserDetails: '/api/v1/user-profile/fetch-user-details',
  logout: '/api/v1/user-profile/logout',
  updateUserNotificationPreferences: '/api/v1/user-profile/update-user-notification-preferences',

  // KYC
  fetchAllKycTiers: '/api/v1/kyc-management/fetch-all-kyc-tiers',
  kycUpgradeRequest: '/api/v1/kyc-management/kyc-upgrade-request',

  // Transaction
  transactionHistory: '/api/v1/transaction/transaction-history',
  downloadStatement: '/api/v1/transaction/download-statement',
  transactionPinStatus: '/api/v1/user-profile/transaction-pin-status', // new

  refreshToken: '/api/v1/auth/refresh-token',
  markAccountPrimary: '/api/v1/public/mark-account-primary',

  //Bill services

  // executeBillServices: '/api/v1/vendor-vending/execute',
  executeBillServices: '/api/v1/bills-services/vending/execute',
  validateMeter: '/api/v1/vendor-vending/meters',
  notificationList: '/api/v1/notification',
  notificationUnreadCount: '/api/v1/notification/unread-count',
  notificationDetail: '/api/v1/notification', // append /{id}
  notificationMarkRead: '/api/v1/notification', // append /{id}/read
  notificationMarkAllRead: '/api/v1/notification/read-all',
  notificationSendTest: '/api/v1/notification/send', // manual test trigger only
  notificationDeviceToken: '/api/v1/notification/device-token', // not used yet — push is out of scope for now
};
