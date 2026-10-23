/**
 * Expo config = app.json (everything shared by every client) + the ACTIVE
 * CLIENT from brand/client.json (everything that differs per client).
 *
 * CBA-Mobile is sold customised per client. Never put a client's name, ids,
 * icons or Expo project in app.json — they belong in clients/<client>/, and
 * `npm run brand:use <client>` makes one active. See BRANDING.md.
 */
const client = require('./brand/client.json');

const BRAND = './brand/assets';

module.exports = ({ config }) => ({
  ...config,
  name: client.appName,
  slug: client.slug,
  owner: client.expo.owner,
  scheme: client.scheme,
  version: client.version,
  icon: `${BRAND}/icon.png`,
  web: { ...config.web, favicon: `${BRAND}/favicon.png` },
  ios: {
    ...config.ios,
    bundleIdentifier: client.ios.bundleIdentifier,
    icon: `${BRAND}/icon.png`,
  },
  android: {
    ...config.android,
    package: client.android.package,
    versionCode: client.android.versionCode,
    adaptiveIcon: {
      foregroundImage: `${BRAND}/adaptive-icon.png`,
      monochromeImage: `${BRAND}/adaptive-icon-monochrome.png`,
      backgroundColor: client.icon.background,
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    // The launch splash: the client's logo, light and dark.
    [
      'expo-splash-screen',
      {
        image: `${BRAND}/logo.png`,
        backgroundColor: client.splash.background,
        resizeMode: 'contain',
        dark: {
          image: `${BRAND}/logo-dark.png`,
          backgroundColor: client.splash.darkBackground,
          resizeMode: 'contain',
        },
      },
    ],
  ],
  extra: {
    ...config.extra,
    ...(client.expo.projectId ? { eas: { projectId: client.expo.projectId } } : {}),
  },
});
