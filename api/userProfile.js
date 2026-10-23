import { navigateReplace } from 'app/navigate';
import axiosCbaInstance from 'config/api';
import { baseUrl, orgKey, routes } from 'config/backendConfig';
import { loadSecure, remove, removeSecure } from 'config/storage';
import { extractApiErrorMessage } from 'helper';
import Toast from 'react-native-toast-message';

export async function createSupportTicket(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.createSupportTicket, payload, {
      params: param,
    });
    // console.log('here');
    // console.log(JSON.stringify(response, null, 2));
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    // The backend nests validation errors as a JSON string inside `message`
    // (e.g. {"responseMessage":"Subject is required"}); extract the clean text
    // so the toast shows a readable message instead of raw JSON.
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function deactivateUser(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.deactivateUser, payload, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function fetchNotificationPreferences(param) {
  try {
    const response = await axiosCbaInstance.get(routes?.fetchNotificationPreferences, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// `silent`: for background checks the user didn't ask for (the login screen's
// "is the saved session still usable?" probe). A 401/403 then just clears the
// stored session and returns ok:false — no "Session Expired" toast, no redirect.
export async function fetchUserDetails(param, { silent = false } = {}) {
  try {
    const auth = await loadSecure('auth');

    // Build query string from param object if provided
    const queryString =
      param && Object.keys(param).length > 0 ? '?' + new URLSearchParams(param).toString() : '';

    const response = await fetch(`${baseUrl}${routes?.fetchUserDetails}${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-org-key': orgKey,
        ...(auth?.accessToken && {
          Authorization: `Bearer ${auth.accessToken}`,
        }),
      },
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      await removeSecure('auth');
      await remove('user');
      if (silent) return { ok: false, message: 'Session expired' };
      Toast.show({
        type: 'error',
        text1: 'Session Expired',
        text2: 'Please login again',
      });
      navigateReplace('login');
      return { ok: false, message: 'Session expired' };
    }

    if (!response.ok) {
      console.log(JSON.stringify(data?.message || data, null, 2));
      return { ok: false, message: extractApiErrorMessage(data) };
    }

    return { ok: true, data };
  } catch (error) {
    console.log(JSON.stringify(error?.message, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function logout(param, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.logout, payload, {
      params: param,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function updateUserNotificationPreferences(param, payload) {
  try {
    const response = await axiosCbaInstance.post(
      routes?.updateUserNotificationPreferences,
      payload,
      { params: param }
    );
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(
      JSON.stringify(
        error?.response?.data || error?.response?.data?.message || error?.message,
        null,
        2
      )
    );
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}
