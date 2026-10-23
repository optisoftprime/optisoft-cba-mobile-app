// config/device.js
//
// Device-management headers sent on login (see the Device Management integration
// guide). The server identifies a handset solely by the `x-device-id` we send
// (it stores a SHA-256 of it, never the raw value) and matches future logins
// against it. If that id changes, the server treats the phone as a brand-new
// device — which is exactly what caused the "max devices reached" lockouts: the
// old build minted a fresh UUID in SecureStore on every install, and SecureStore
// is wiped on uninstall, so each reinstall burned another device slot.
//
// The id must therefore SURVIVE a reinstall:
//   • Android — Settings.Secure.ANDROID_ID (SSAID), via expo-application. Scoped
//     to our signing key + device, survives uninstall/reinstall, resets only on a
//     factory reset. No permission required; the raw value never leaves as-is
//     (the server hashes it).
//   • iOS — a UUID generated once and kept in the Keychain. Keychain items
//     survive app removal on iOS, so this is stable across reinstalls. We do NOT
//     use identifierForVendor: it resets when the last vendor app is removed.
//
// Invariant: never clear this id on logout — it identifies the handset, not the
// session. Clearing it looks like a reinstall to the server. (clearAll /
// clearAllFull in config/storage.js deliberately leave `deviceId` alone.)
//
// It's an identifier, not a security credential — a modified client can lie about
// it — so these simple OS-provided ids are fine. The other headers describe the
// handset and are refreshed on each login; any that resolve empty are omitted.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

const DEVICE_ID_KEY = 'deviceId';

// Keychain accessibility for the stored UUID (iOS, and the rare Android SSAID
// fallback): readable after first unlock and never migrated to another device.
// On iOS this is what makes the value outlive an app uninstall.
const SECURE_OPTS = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

// Clip a header value to a maximum length. The backend persists these into
// fixed-width `user_device` columns, and an over-long value makes the INSERT
// throw ("Data too long for column 'os_version'") — which fails the whole
// login. Some OEM handsets report long os/model/name strings, so we cap every
// value defensively. Caps are conservative and comfortably under typical column
// sizes; the real column widths are backend-owned, so if any are smaller than
// these the backend should widen them (or tell us the exact size to match).
function clip(value, max) {
  const s = String(value ?? '').trim();
  return s.length > max ? s.slice(0, max) : s;
}

// Per-header length caps (characters).
const MAX = {
  os: 32, // e.g. "Android 13" / "iOS 17.1" — the column that overflowed
  name: 60, // user-set device names can be long ("Jane's iPhone 15 Pro Max")
  model: 60,
  appVersion: 20,
};

// RFC-4122 v4 UUID using Math.random — sufficient for a non-secret device id.
// Only used as a fallback now (iOS, or Android when SSAID is unavailable).
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// A UUID persisted in SecureStore (Keychain on iOS). Generated once, then reused.
async function getStoredDeviceId() {
  try {
    let id = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (!id) {
      id = uuidv4();
      await SecureStore.setItemAsync(DEVICE_ID_KEY, id, SECURE_OPTS);
    }
    return id;
  } catch {
    // SecureStore unavailable — fall back to a non-persistent id so login still
    // works (the device just won't be recognised across launches).
    return uuidv4();
  }
}

export async function getOrCreateDeviceId() {
  if (Platform.OS === 'android') {
    try {
      const ssaid = Application.getAndroidId();
      if (ssaid && ssaid.trim()) return ssaid.trim();
    } catch {
      // SSAID unreadable (very rare) — fall through to a persisted UUID.
    }
    return getStoredDeviceId();
  }

  // iOS (and any non-android platform): Keychain-backed UUID.
  return getStoredDeviceId();
}

// Returns the x-device-* headers for the login request. Best-effort: only
// x-device-id is essential; anything that can't be resolved is left out.
export async function getDeviceHeaders() {
  const headers = {};
  try {
    const deviceId = await getOrCreateDeviceId();
    // Guard against a blank id — the server treats a blank x-device-id as absent,
    // which silently unbinds the session from device management.
    if (deviceId && deviceId.trim()) headers['x-device-id'] = deviceId.trim();

    const name = clip(Device.deviceName, MAX.name);
    if (name) headers['x-device-name'] = name;

    const model = clip(Device.modelName, MAX.model);
    if (model) headers['x-device-model'] = model;

    const os = clip([Device.osName, Device.osVersion].filter(Boolean).join(' '), MAX.os);
    if (os) headers['x-device-os'] = os;

    if (Platform.OS) headers['x-device-platform'] = Platform.OS;

    const version = clip(
      Constants?.expoConfig?.version ?? Constants?.manifest?.version,
      MAX.appVersion
    );
    if (version) headers['x-app-version'] = version;
  } catch {
    // best-effort — a login with just x-device-id (or none) is still valid
  }
  return headers;
}
