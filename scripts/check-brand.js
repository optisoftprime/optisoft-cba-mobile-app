/* global __dirname, Buffer -- a Node build script, not app code */
/**
 * Validates the active client in brand/ (or clients/<id> with an argument):
 *   npm run check:brand            -> brand/
 *   node scripts/check-brand.js acme  -> clients/acme/
 *
 * Catches, before a build, the mistakes that otherwise surface as a store
 * rejection or a broken screen: a malformed package id, a non-hex colour, a
 * missing image, an app icon with transparency (iOS rejects it), a logo with an
 * opaque background (a white box in dark mode), a non-square icon.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const id = process.argv[2];
const dir = id ? path.join(ROOT, 'clients', id) : path.join(ROOT, 'brand');
const label = id ? `clients/${id}` : 'brand/';
const problems = [];
const warnings = [];

const fail = (msg) => problems.push(msg);
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

let client;
try {
  client = JSON.parse(fs.readFileSync(path.join(dir, 'client.json'), 'utf8'));
} catch (e) {
  console.error(`✖ ${label}/client.json is missing or not valid JSON: ${e.message}`);
  process.exit(1);
}

// ── Fields ──────────────────────────────────────────────────────────────────
const get = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), client);
const need = (p, test, why) => {
  const v = get(p);
  if (v === undefined || v === null || v === '') fail(`${p} is required`);
  else if (test && !test(v)) fail(`${p} = ${JSON.stringify(v)} — ${why}`);
};
need(
  'appName',
  (v) => typeof v === 'string' && v.length <= 30,
  'max 30 characters (it is the home-screen label)'
);
need('slug', (v) => /^[a-z0-9-]+$/.test(v), 'lowercase letters, digits and dashes only');
need('scheme', (v) => /^[a-z][a-z0-9+.-]*$/.test(v), 'lowercase URL scheme, e.g. "acmebank"');
need('version', (v) => /^\d+\.\d+\.\d+$/.test(v), 'semantic version like 1.0.0');
need(
  'orgKey',
  (v) => /^ORG-\d+$/.test(v),
  'the organisation key from the core banking admin, e.g. ORG-1728290007232'
);
need('poweredBy', (v) => typeof v === 'string');
need(
  'android.package',
  (v) => /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(v),
  'like com.company.app (lowercase)'
);
need(
  'android.versionCode',
  (v) => Number.isInteger(v) && v > 0,
  'a positive whole number, bumped on every store upload'
);
need(
  'ios.bundleIdentifier',
  (v) => /^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z][A-Za-z0-9-]*)+$/.test(v),
  'like com.company.app'
);
need('expo.owner', (v) => /^[a-z0-9_-]+$/i.test(v), 'the Expo account that owns the project');
if (!get('expo.projectId'))
  warnings.push(
    'expo.projectId is empty — run `eas init` once for this client, then copy the id here'
  );
need('icon.background', (v) => HEX.test(v), 'hex colour');
need('splash.background', (v) => HEX.test(v), 'hex colour');
need('splash.darkBackground', (v) => HEX.test(v), 'hex colour');

for (const mode of ['light', 'dark']) {
  const colours = get(`colors.${mode}`) || {};
  for (const [token, value] of Object.entries(colours)) {
    if (!HEX.test(value))
      fail(`colors.${mode}.${token} = ${JSON.stringify(value)} — must be a hex colour`);
  }
}
const lightKeys = Object.keys(get('colors.light') || {})
  .sort()
  .join();
const darkKeys = Object.keys(get('colors.dark') || {})
  .sort()
  .join();
if (lightKeys !== darkKeys)
  fail(
    'colors.light and colors.dark must override the same tokens (else one theme keeps the old brand)'
  );

// ── Images ──────────────────────────────────────────────────────────────────
// Read width/height/alpha straight from the PNG header — no image library.
function pngInfo(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 1, 4) !== 'PNG') return null;
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  const colorType = b[25]; // 0 grey, 2 RGB, 3 palette, 4 grey+alpha, 6 RGBA
  const hasTrns = b.includes(Buffer.from('tRNS'));
  const alpha = colorType === 4 || colorType === 6 || (colorType === 3 && hasTrns);
  return { width, height, alpha };
}

const IMAGES = {
  'icon.png': {
    square: 1024,
    alpha: false,
    why: 'the app icon — iOS rejects an icon with transparency',
  },
  'adaptive-icon.png': {
    square: 1024,
    alpha: true,
    why: 'Android adaptive icon — the mark on transparency, inside the safe circle',
  },
  'adaptive-icon-monochrome.png': {
    square: 1024,
    alpha: true,
    why: 'Android themed icon — a white silhouette on transparency',
  },
  'favicon.png': { squareAny: true, why: 'web tab icon' },
  'logo.png': {
    alpha: true,
    why: 'logo for LIGHT backgrounds — must be transparent, or it shows as a box in dark mode',
  },
  'logo-dark.png': {
    alpha: true,
    why: 'logo for DARK backgrounds (white wordmark) — must be transparent',
  },
};
for (const [name, rule] of Object.entries(IMAGES)) {
  const file = path.join(dir, 'assets', name);
  if (!fs.existsSync(file)) {
    fail(`assets/${name} is missing (${rule.why}) — run npm run brand:assets`);
    continue;
  }
  const info = pngInfo(file);
  if (!info) {
    fail(`assets/${name} is not a PNG`);
    continue;
  }
  if (rule.square && (info.width !== rule.square || info.height !== rule.square)) {
    fail(
      `assets/${name} is ${info.width}x${info.height}, must be ${rule.square}x${rule.square} (${rule.why})`
    );
  }
  if (rule.squareAny && info.width !== info.height)
    fail(`assets/${name} must be square (${rule.why})`);
  if (rule.alpha === false && info.alpha) fail(`assets/${name} has transparency — ${rule.why}`);
  if (rule.alpha === true && !info.alpha) fail(`assets/${name} has no transparency — ${rule.why}`);
}

for (const w of warnings) console.warn(`! ${w}`);
if (problems.length) {
  console.error(`\n✖ ${label} has ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `Brand OK — ${label} "${client.appName}" (${client.android.package}), ${Object.keys(IMAGES).length} images checked.`
);
