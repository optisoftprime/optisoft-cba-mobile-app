// config/i18n.js
//
// i18next setup. Translations are split ONE FILE PER NAMESPACE (roughly one per
// flow/feature) under locales/<lang>/<namespace>.json, then merged back into a
// single `translation` namespace here — so screens keep referencing keys the
// same way: t('login.foo'), t('openAccount.bar'), etc. (no `namespace:` prefix).
//
// Adding a NAMESPACE (e.g. a newly-swept flow):
//   1. create locales/en/<name>.json and locales/fr/<name>.json,
//   2. import both below and add one line to each language's map.
// Adding a LANGUAGE:
//   1. copy the whole locales/en/ folder to locales/<code>/ and translate,
//   2. import its files, add a `<code>: { translation: {...} }` block, and add
//      one entry to LANGUAGES.
// The scripts/check-locale-parity guard (node one-liner) flags any key that
// exists in one language but not another, or a namespace you forgot to wire up.
/* eslint-disable import/no-named-as-default-member -- the whole i18next API is used via its default export */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { save, load } from 'config/storage';
import { brand } from 'config/brand';

import enCommon from '../locales/en/common.json';
import enLanguage from '../locales/en/language.json';
import enTheme from '../locales/en/theme.json';
import enSettings from '../locales/en/settings.json';
import enOnboarding from '../locales/en/onboarding.json';
import enLanding from '../locales/en/landing.json';
import enLogin from '../locales/en/login.json';
import enRegister from '../locales/en/register.json';
import enOtp from '../locales/en/otp.json';
import enOpenAccount from '../locales/en/openAccount.json';
import enComponents from '../locales/en/components.json';
import enTransfer from '../locales/en/transfer.json';
import enUtilities from '../locales/en/utilities.json';
import enLoans from '../locales/en/loans.json';
import enSavings from '../locales/en/savings.json';
import enDashboard from '../locales/en/dashboard.json';
import enProfile from '../locales/en/profile.json';
import enSupport from '../locales/en/support.json';
import enTabs from '../locales/en/tabs.json';
import enKyc from '../locales/en/kyc.json';
import enTransactions from '../locales/en/transactions.json';
import enNotifications from '../locales/en/notifications.json';
import enTickets from '../locales/en/tickets.json';
import enFaq from '../locales/en/faq.json';
import enLinkAccount from '../locales/en/linkAccount.json';
import enSecurity from '../locales/en/security.json';
import enFace from '../locales/en/face.json';
import enScan from '../locales/en/scan.json';
import enPreferences from '../locales/en/preferences.json';
import enReferral from '../locales/en/referral.json';

import frCommon from '../locales/fr/common.json';
import frLanguage from '../locales/fr/language.json';
import frTheme from '../locales/fr/theme.json';
import frSettings from '../locales/fr/settings.json';
import frOnboarding from '../locales/fr/onboarding.json';
import frLanding from '../locales/fr/landing.json';
import frLogin from '../locales/fr/login.json';
import frRegister from '../locales/fr/register.json';
import frOtp from '../locales/fr/otp.json';
import frOpenAccount from '../locales/fr/openAccount.json';
import frComponents from '../locales/fr/components.json';
import frTransfer from '../locales/fr/transfer.json';
import frUtilities from '../locales/fr/utilities.json';
import frLoans from '../locales/fr/loans.json';
import frSavings from '../locales/fr/savings.json';
import frDashboard from '../locales/fr/dashboard.json';
import frProfile from '../locales/fr/profile.json';
import frSupport from '../locales/fr/support.json';
import frTabs from '../locales/fr/tabs.json';
import frKyc from '../locales/fr/kyc.json';
import frTransactions from '../locales/fr/transactions.json';
import frNotifications from '../locales/fr/notifications.json';
import frTickets from '../locales/fr/tickets.json';
import frFaq from '../locales/fr/faq.json';
import frLinkAccount from '../locales/fr/linkAccount.json';
import frSecurity from '../locales/fr/security.json';
import frFace from '../locales/fr/face.json';
import frScan from '../locales/fr/scan.json';
import frPreferences from '../locales/fr/preferences.json';
import frReferral from '../locales/fr/referral.json';

// The set of shipped languages (drives the in-app language picker).
export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

// Each language's namespaces, merged into one flat `translation` namespace so
// key paths stay t('<namespace>.<key>'). Keep the two maps in lock-step.
const en = {
  common: enCommon,
  language: enLanguage,
  theme: enTheme,
  settings: enSettings,
  onboarding: enOnboarding,
  landing: enLanding,
  login: enLogin,
  register: enRegister,
  otp: enOtp,
  openAccount: enOpenAccount,
  components: enComponents,
  transfer: enTransfer,
  utilities: enUtilities,
  loans: enLoans,
  savings: enSavings,
  dashboard: enDashboard,
  profile: enProfile,
  support: enSupport,
  tabs: enTabs,
  kyc: enKyc,
  transactions: enTransactions,
  notifications: enNotifications,
  tickets: enTickets,
  faq: enFaq,
  linkAccount: enLinkAccount,
  security: enSecurity,
  face: enFace,
  scan: enScan,
  preferences: enPreferences,
  referral: enReferral,
};

const fr = {
  common: frCommon,
  language: frLanguage,
  theme: frTheme,
  settings: frSettings,
  onboarding: frOnboarding,
  landing: frLanding,
  login: frLogin,
  register: frRegister,
  otp: frOtp,
  openAccount: frOpenAccount,
  components: frComponents,
  transfer: frTransfer,
  utilities: frUtilities,
  loans: frLoans,
  savings: frSavings,
  dashboard: frDashboard,
  profile: frProfile,
  support: frSupport,
  tabs: frTabs,
  kyc: frKyc,
  transactions: frTransactions,
  notifications: frNotifications,
  tickets: frTickets,
  faq: frFaq,
  linkAccount: frLinkAccount,
  security: frSecurity,
  face: frFace,
  scan: frScan,
  preferences: frPreferences,
  referral: frReferral,
};

// Last line of defence against a raw key reaching the screen. Every key used in
// code is checked to exist in every language, but if one is ever missing (a
// string added while Metro was running, a typo) the user sees readable words
// built from the key — "login.signUpText" → "Sign up text" — never the dotted
// key path itself.
function humaniseMissingKey(key) {
  const last = String(key).split('.').pop() ?? '';
  const words = last
    .replace(/_(one|other|zero|few|many|two)$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : '';
}

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

// Persisted under this key via config/storage (AsyncStorage).
const LANG_KEY = 'appLanguage';

// Init synchronously so the first render already has strings (defaults to en);
// initAppLanguage() below then swaps to the saved / device language.
i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
    // Every string can say {{appName}} and gets the active client's name
    // (brand/client.json) — so no translation ever hardcodes a client.
    defaultVariables: { appName: brand.appName },
  },
  returnNull: false,
  react: { useSuspense: false }, // RN: translations are bundled + synchronous
  parseMissingKeyHandler: humaniseMissingKey,
});

// Resolve the best initial language: saved choice → device locale → English.
// Call once at app start (after i18n is initialised).
export async function initAppLanguage() {
  try {
    const saved = await load(LANG_KEY);
    if (saved && resources[saved]) {
      if (i18n.language !== saved) await i18n.changeLanguage(saved);
      return;
    }

    // Device locale via expo-localization. Required lazily + guarded so the app
    // still runs if the native module isn't in the current binary yet (it only
    // becomes available after a dev-client / native rebuild) — falls back to en.
    let device = 'en';
    try {
      const Localization = require('expo-localization');
      const code = Localization.getLocales?.()?.[0]?.languageCode;
      if (code && resources[code]) device = code;
    } catch {
      // native module not present yet — stay on English
    }
    if (i18n.language !== device) await i18n.changeLanguage(device);
  } catch {
    // any failure → stay on the synchronous default (en)
  }
}

// Change + persist the language. Screens/pickers call this.
export async function setAppLanguage(code) {
  if (!resources[code]) return;
  await i18n.changeLanguage(code);
  try {
    await save(LANG_KEY, code);
  } catch {
    // non-fatal: language still changes for this session
  }
}

export default i18n;
