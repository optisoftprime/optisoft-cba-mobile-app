import axios from 'axios';
import { loadSecure, saveSecure, clearAll } from './storage';
import { baseUrl, orgKey, routes } from './backendConfig';
import { navigateReplace, isOnPreAuthScreen } from 'app/navigate';
import Toast from 'react-native-toast-message';
import { refreshToken } from 'api/auth';
import { queryClient } from 'app/_layout';
import { notificationKeys } from '../app/hooks/notifications'; // adjust path if needed

let isRefreshing = false;
let failedQueue = [];

const WRITE_METHODS = ['post', 'put', 'patch', 'delete'];

// Full request URL (baseURL + path, with path variables already substituted).
const fullUrl = (config) => `${config?.baseURL ?? ''}${config?.url ?? ''}`;

// ─────────────────────────────────────────────
// Public (auth-less) endpoints
// ─────────────────────────────────────────────
// These are reachable BEFORE a user is logged in — onboarding, login, OTP,
// password reset, and the token-refresh call itself. The user has no access
// or refresh token during these flows, so a 401/403 from one of them is a
// normal validation error (wrong OTP, invalid reset code, bad credentials),
// NOT an expired session. We must NOT run the refresh-token / clearAll /
// redirect-to-login flow for them, otherwise e.g. a wrong OTP or a
// forgot-password error would wipe storage and bounce the user to login.
const PUBLIC_ROUTES = [
  routes.initiate,
  routes.generateOtp,
  routes.generateOnRegOtp,
  routes.validateOtp,
  routes.verifyAccountOtp,
  routes.validateResetPasswordOtp,
  routes.register,
  routes.login,
  routes.passwordResetRequest,
  routes.passwordResetConfirm,
  routes.refreshToken,
  // Called during the pre-login register flow (validate account number →
  // mark primary), before any token exists. They don't require auth, so a
  // 401/403 here must NOT trigger the session-expired clearAll()/redirect —
  // just surface the error.
  routes.publicValidateAccountNumber,
  routes.publicRegenerateOtp,
  routes.markAccountPrimary,
  // FAQ is reachable from the landing screen BEFORE login (Get Help). With no
  // token yet, a 401 here must NOT trigger the refresh/clearAll/redirect flow —
  // that would wipe storage (incl. hasOpenedBefore) and bounce to login just for
  // opening Help. Treat it as public so a 401 simply surfaces an empty state.
  routes.supportFaq,
  routes.supportFaqCategories,
];

const isPublicRoute = (url = '') => PUBLIC_ROUTES.some((route) => route && url.includes(route));

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

const axiosCbaInstance = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
    'x-org-key': orgKey,
  },
});

// ─────────────────────────────────────────────
// Request interceptor (attach access token + log request details)
// ─────────────────────────────────────────────
axiosCbaInstance.interceptors.request.use(async (config) => {
  const auth = await loadSecure('auth');

  // Guarantee the org key on EVERY request. The instance default header covers
  // most calls, but a call that passes its own `headers` object can drop it —
  // setting it here in the interceptor makes it impossible to send a request
  // without x-org-key. A missing/undefined org key is rejected by the gateway.
  config.headers['x-org-key'] = orgKey;

  if (auth?.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`;
  }

  // Compact request log — just the essentials (never the auth token/headers).
  console.log('➡️', config.method?.toUpperCase(), fullUrl(config), {
    params: config.params ?? {},
    body: config.data ?? {},
  });

  return config;
});

// ─────────────────────────────────────────────
// Response interceptor (notification invalidation + refresh flow)
// ─────────────────────────────────────────────
axiosCbaInstance.interceptors.response.use(
  (response) => {
    console.log('⬅️', response.status, response.config?.url, {
      message: response.data?.message,
    });

    // ── Auto-invalidate notifications on any successful write request ──
    // Skips notification endpoints themselves to avoid a self-triggered
    // refetch loop, and skips GET requests since those don't mutate state.
    const method = response.config?.method?.toLowerCase();
    const url = response.config?.url ?? '';
    const isNotificationRequest = url.includes('/notification');

    // Skip session-ending requests (logout / deactivate). These are POSTs, so
    // they'd otherwise trigger a notifications refetch — but the token is
    // revoked the moment they succeed, so that refetch 401s and the error
    // branch below fires a bogus "Session Expired" toast + redirect. Nothing
    // should refetch on the way out.
    const isSessionEndingRequest =
      url.includes(routes?.logout ?? '/logout') ||
      url.includes(routes?.deactivateUser ?? '/deactivate-user');

    if (WRITE_METHODS.includes(method) && !isNotificationRequest && !isSessionEndingRequest) {
      queryClient?.invalidateQueries({ queryKey: notificationKeys?.all });
    }

    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url ?? '';

    console.log('❌', status, requestUrl, {
      message: error.response?.data?.message ?? error.message,
    });

    // Public (auth-less) endpoints must bypass the refresh/redirect flow.
    // Their 401/403 is a normal validation error, not an expired session,
    // so we just surface the error to the caller.
    if (
      (status === 401 || status === 403) &&
      !originalRequest._retry &&
      !isPublicRoute(requestUrl)
    ) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosCbaInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const auth = await loadSecure('auth');

        if (!auth?.refreshToken) {
          throw new Error('No refresh token found');
        }

        // ── refresh token request ──
        const refreshResponse = await refreshToken({
          refreshToken: auth.refreshToken,
        });

        // Response shape from backend:
        // { success: true, data: { token: "...", refreshToken: "...", ... }, errorCode: "200" }
        const refreshSucceeded = refreshResponse?.ok && refreshResponse?.data?.success === true;

        if (refreshSucceeded) {
          const newAccessToken = refreshResponse.data.data.token;
          const newRefreshToken = refreshResponse.data.data.refreshToken || auth.refreshToken;

          await saveSecure('auth', {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          axiosCbaInstance.defaults.headers.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

          processQueue(null, newAccessToken);

          return axiosCbaInstance(originalRequest);
        }

        throw new Error(refreshResponse?.message || 'Refresh token invalid');
      } catch (refreshError) {
        processQueue(refreshError, null);

        console.log('Refresh failed:', refreshError?.message);

        // await removeSecure('auth');
        // await remove('userLogs');

        await clearAll();

        // Only genuinely-authenticated endpoints reach this point (public
        // auth-less routes — login, OTP, password reset — are filtered out
        // above via isPublicRoute), so a failed refresh here really does mean
        // an expired session.
        //
        // BUT: a late 401 can arrive from a request a PREVIOUS authenticated
        // screen fired, after the user has already moved to a pre-auth screen
        // (login / registration / onboarding). Firing the toast + redirect then
        // is the "ghost: your session expired, bounced to login" QA saw on the
        // register screen. The token is already wiped above; if we're on a
        // pre-auth screen there's nothing to sign out of, so stay quiet and just
        // reject. Only notify + redirect when the user is actually in the app.
        if (!isOnPreAuthScreen()) {
          Toast.show({
            type: 'error',
            text1: 'Session Expired',
            text2: 'Please login again',
          });

          navigateReplace('login');
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosCbaInstance;
