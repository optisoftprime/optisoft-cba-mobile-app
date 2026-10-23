// utils/navigation.js
import { router, useSegments, usePathname } from 'expo-router';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';

// ── Module-level mirror of the current route group ───────────────────────────
// Kept in sync by <RouteTracker/> (mounted once at the app root). Lets non-React
// code — specifically the axios response interceptor in config/api.js — know
// whether the user is currently on a pre-auth / onboarding screen WITHOUT a hook.
// A late 401 from a lingering authenticated request must NOT fire the
// "Session Expired" toast + redirect while the user is already on login /
// registration / onboarding (that's the "ghost redirect" QA reported).
let _currentSegments = [];

// Route groups that are pre-authentication: a session-expired redirect here is
// a spurious interruption, not a real sign-out. `(auth)` covers login, OTP,
// registration, password reset; `(open-account)` covers the open-account flow.
const PRE_AUTH_GROUPS = ['(auth)', '(open-account)'];

// True when the current screen lives in a pre-auth route group, or is the
// landing/splash entry. Used by the interceptor to stay quiet on those screens.
export function isOnPreAuthScreen() {
  const segs = _currentSegments || [];
  if (segs.some((s) => PRE_AUTH_GROUPS.includes(s))) return true;
  const joined = segs.join('/').toLowerCase();
  return joined.includes('landing') || joined.includes('splash') || joined === '';
}

// Mount ONCE at the app root (see app/_layout.jsx). Renders nothing; just keeps
// `_currentSegments` current so isOnPreAuthScreen() works outside React.
export function RouteTracker() {
  const segments = useSegments();
  useEffect(() => {
    _currentSegments = segments || [];
  }, [segments]);
  return null;
}

// ── Double-tap push guard ────────────────────────────────────────────────────
// navigateTo() is router.push, so tapping a button twice pushes the SAME screen
// onto the stack twice — QA saw a screen "cloned" once per tap, with the back
// button then popping through every duplicate. We ignore a repeat push to the
// same screen fired within this window. A back/replace clears the guard so an
// intentional re-visit right after still works.
const NAV_DEBOUNCE_MS = 700;
let lastPush = { path: null, at: 0 };

const pathKey = (path) => (typeof path === 'string' ? path : (path?.pathname ?? ''));

export function navigateTo(path, params = {}) {
  try {
    const key = pathKey(path);
    const now = Date.now();
    if (key && key === lastPush.path && now - lastPush.at < NAV_DEBOUNCE_MS) {
      // Duplicate rapid tap on the same destination — swallow it.
      return;
    }
    lastPush = { path: key, at: now };

    console.log('navigating to ', path);
    if (params && Object.keys(params).length > 0) {
      router.push({ pathname: path, params });
    } else {
      router.push(path);
    }
  } catch (error) {
    Toast.show({ type: 'error', text1: 'Navigation Error', text2: error?.message });
  }
}

export function navigateBack(fallback = 'landingScreen') {
  // Leaving a screen resets the guard so re-pushing it afterwards isn't blocked.
  lastPush = { path: null, at: 0 };
  try {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback);
    }
  } catch (error) {
    Toast.show({ type: 'error', text1: 'Navigation Error', text2: error?.message });
    router.replace(fallback);
  }
}

export function navigateReplace(path, params = {}) {
  // Replacing the current screen also clears the push guard.
  lastPush = { path: null, at: 0 };
  try {
    console.log('navigating to ', path);
    if (params && Object.keys(params).length > 0) {
      router.replace({ pathname: path, params });
    } else {
      router.replace(path);
    }
  } catch (error) {
    Toast.show({ type: 'error', text1: 'Navigation Error', text2: error?.message });
  }
}

/**
 * Returns the current full pathname as a string.
 * e.g. "/home/dashboard", "/auth/login"
 *
 * Usage (must be called inside a React component):
 *
 *   import { useCurrentRoute } from 'utils/navigation';
 *
 *   function MyScreen() {
 *     const currentRoute = useCurrentRoute();
 *     console.log(currentRoute); // e.g. "/home/dashboard"
 *   }
 */
export function useCurrentRoute() {
  const pathname = usePathname();
  return pathname;
}

/**
 * Returns the current route segments as an array.
 * e.g. ["home", "dashboard"] for "/home/dashboard"
 *
 * Useful for checking which section of the app you're in:
 *
 *   const segments = useCurrentSegments();
 *   const isInAuth = segments[0] === 'auth';
 */
export function useCurrentSegments() {
  const segments = useSegments();
  return segments;
}
