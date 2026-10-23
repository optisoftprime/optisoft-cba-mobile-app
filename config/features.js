// config/features.js
//
// Features whose screens exist but whose BACKEND does not (yet). Each is off by
// default: its entry point is faded and explains itself on tap, and the screen
// itself renders "Coming soon" (components/layout/coming-soon) — so a deep link,
// a notification or a stale navigation stack can never land on a screen that
// only pretends to work.
//
// A client can switch one on in its client.json once its backend is live:
//   "features": { "liveChat": true }
// Turning a feature on is a promise that its screens call real endpoints.
const client = require('../brand/client.json');

const DEFAULTS = {
  // Scan-to-pay (the centre tab button) and the face-scan screens behind it.
  scanToPay: false,
  // Support → Live chat. Tickets (createTicket / ticketDetail) are live.
  liveChat: false,
  // Rewards, spin, leaderboard, budget.
  rewards: false,
  // Transfer to other banks. Wallet-to-wallet transfer is live.
  bankTransfer: false,
  // The Card tab.
  cards: false,
  // Security → two-factor authentication.
  twoFactor: false,
  // Security → login activity.
  loginActivity: false,
};

export const FEATURES = { ...DEFAULTS, ...(client.features || {}) };

/** True when `feature` is switched on. Unknown names are off. */
export const isEnabled = (feature) => FEATURES[feature] === true;
