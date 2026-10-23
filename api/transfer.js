import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

export async function validateAccountNumber(params) {
  try {
    const response = await axiosCbaInstance.get(routes?.validateAccountNumber, { params });
    console.log(response, 'valaidation response 2');
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function makeInternalTransfer(params, payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.makeInternalTransfer, payload, { params });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    // Surface status + errorCode so callers can special-case TRANSFER_DISABLED
    // (403) — the user's own transfer switch — and deep-link them to Settings.
    return {
      ok: false,
      status: error?.response?.status,
      errorCode: error?.response?.data?.errorCode,
      message: extractApiErrorMessage(error),
    };
  }
}
