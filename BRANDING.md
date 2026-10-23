# Customising CBA-Mobile for a client

CBA-Mobile is sold customised for each client: their **name, icon, logo, colours
and organisation key**. Everything client-specific lives in one folder,
`clients/<client>/`. No code changes — ever — to rebrand.

```
clients/
  optisoft/                 ← one folder per client (commit these)
    client.json             ← name, store ids, org key, colours, Expo project
    assets/                 ← the 6 images the app uses (generated)
    source/                 ← the client's original artwork (keep it!)
brand/                      ← the ACTIVE client — what gets built. Never edit by hand.
credentials/<client>/       ← that client's Android signing key (NEVER committed)
```

The app reads only `brand/`. `npm run brand:use <client>` copies a client into it.

---

## New client — step by step

### 1. Ask the client for

| What | Format | Used for |
|---|---|---|
| **Lockup** (symbol + name) | SVG, or transparent PNG ≥ 1024 px | in-app logo, splash, receipts |
| **Mark** (symbol alone) | SVG, or transparent PNG ≥ 1024 px | app icon |
| Logo for dark backgrounds *(optional)* | same | dark mode — otherwise generated |
| Brand colour(s) | hex, e.g. `#15803D` | buttons, cards, highlights |
| App name | ≤ 30 characters | home-screen label, text in the app |
| Organisation key | `ORG-…` from the core-banking admin | scopes every API call to their bank |

> **Ask for transparent artwork.** A logo exported on a white background gets its
> background removed automatically, but any *white inside the logo* is removed too.

### 2. Create the client folder

Copy an existing client and edit `client.json`:

```bash
cp -r clients/optisoft clients/acme      # then delete clients/acme/assets/* and source/*
```

`clients/acme/client.json`:

| Field | Example | Notes |
|---|---|---|
| `appName` | `"Acme Bank"` | shown everywhere the app names itself |
| `slug` | `"acme-bank"` | Expo project slug — lowercase-dashes |
| `scheme` | `"acmebank"` | deep-link scheme |
| `version` | `"1.0.0"` | the client's app version |
| `orgKey` | `"ORG-1234567890123"` | **the client's** org key — never another client's |
| `poweredBy` | `"Optisoft Technology Limited"` | receipt footer line |
| `expo.owner` | `"optisoft_tech"` | Expo account that builds it |
| `expo.projectId` | *(fill after step 5)* | |
| `android.package` | `"com.acme.bank"` | **unique per client, cannot change after release** |
| `android.versionCode` | `1` | +1 on every Play Store upload |
| `ios.bundleIdentifier` | `"com.acme.bank"` | |
| `icon.background` | `"#FFFFFF"` | behind the app icon |
| `splash.background` / `darkBackground` | `"#ffffff"` / `"#151B23"` | launch screen |
| `colors.light` / `colors.dark` | `primary`, `primaryDark`, `primaryLight`, `onPrimary`, `panelFrom`, `panelTo`, `onPanel` | the brand colours, both themes. Any other token from `config/brand.js` may be overridden too. |

### 3. Generate the images

```bash
npm run brand:assets -- acme path/to/lockup.svg --mark path/to/mark.svg
#   optional:  --dark path/to/lockup-white.svg   --store   (Play Store listing images → Downloads)
```

Writes all 6 images into `clients/acme/assets/` with the rules that stores and
phones enforce (opaque iOS icon, Android safe circle, transparent logos, a
white-wordmark logo for dark mode) and keeps the originals in `source/`.
Needs `pip install pillow` (and `pip install pymupdf` for SVG).

### 4. Check and activate

```bash
npm run check:brand -- acme     # validates fields, colours and every image
npm run brand:use acme          # makes it the active client (runs the check again)
npx expo start -c               # look at it — switch light/dark in Settings
```

### 5. Expo project and build

```bash
eas init                        # once per client — creates its Expo project
```
Copy the printed project id into `clients/acme/client.json` → `expo.projectId`,
run `npm run brand:use acme` again, then:

```bash
eas build --platform android --profile preview      # APK
```

### Signing key

Every client needs **its own** Android signing key, kept in
`credentials/<client>/` (git-ignored). Losing it means existing installs can't be
updated — **back it up somewhere safe** (password manager / secure drive).

Create one for a new client:

```bash
mkdir -p credentials/acme
"<Android Studio>/jbr/bin/keytool" -genkeypair -keystore credentials/acme/acme.jks \
  -alias acme -keyalg RSA -keysize 2048 -validity 10000 -storetype JKS \
  -dname "CN=Acme Bank, O=Acme, C=NG"
```

and `credentials/acme/credentials.json`:

```json
{ "android": { "keystore": {
  "keystorePath": "credentials/acme/acme.jks",
  "keystorePassword": "…", "keyAlias": "acme", "keyPassword": "…" } } }
```

`npm run brand:use acme` puts it in place for EAS automatically.

---

## Switching between clients

```bash
npm run brand:use optisoft      # or any folder name under clients/
npx expo start -c               # -c: clear the cache so the new colours/logo load
```

For a local native build (`npx expo run:android`), also run
`npx expo prebuild --clean` after switching — the `android/` folder is generated
from the active client.

## What is (and isn't) per client

**Per client** (in `client.json` / `assets/`): name, store ids, Expo project,
org key, brand colours, icon, logo, splash, receipt "powered by" line, signing key.

**Shared by every client** (change once, every client gets it): all screens and
features, the API gateway (`config/backendConfig.js`), the neutral/status colours
(`config/brand.js` base palette), translations — which say `{{appName}}` instead
of a name, filled in from the active client.

Rules that keep it that way:
- Never write a client's name in code or a translation — use `brand.appName` /
  `{{appName}}`.
- Never write a colour outside `config/brand.js` / `client.json`.
- Never reference an image in `brand/` other than through `config/brand.js` and
  `app.config.js`.

## Checks

| Command | Checks |
|---|---|
| `npm run check:brand` | active client: fields, colours, all 6 images |
| `npm run check:theme` | light/dark palettes complete and valid |
