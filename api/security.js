import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

// Transfer permission — current state.
// data: { transfersEnabled: bool, stepUpRequiredToEnable: bool, disabledAt?: string }
export async function getTransferPermission() {
  try {
    const response = await axiosCbaInstance.get(routes?.transferPermission);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return {
      ok: false,
      status: error?.response?.status,
      message: extractApiErrorMessage(error),
    };
  }
}

// ── Device management ────────────────────────────────────────────────────────

// GET device-limit → { limit, activeDevices, maxAllowed, enforced, canSetLimit }
export async function getDeviceLimit() {
  try {
    const response = await axiosCbaInstance.get(routes?.deviceLimit);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, status: error?.response?.status, message: extractApiErrorMessage(error) };
  }
}

// PUT device-limit — body { limit }.
export async function updateDeviceLimit(payload) {
  try {
    const response = await axiosCbaInstance.put(routes?.deviceLimit, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, status: error?.response?.status, message: extractApiErrorMessage(error) };
  }
}

// GET devices → [ { publicId, deviceName, model, platform, lastSeenAt, likelyThisDevice, currentDevice } ]
export async function getDevices() {
  try {
    const response = await axiosCbaInstance.get(routes?.devices);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, status: error?.response?.status, message: extractApiErrorMessage(error) };
  }
}

// DELETE a device — requires step-up (ONE of transactionPin | securityQuestion+
// securityAnswer | otp), sent in the request body.
export async function deleteDevice(publicId, payload) {
  try {
    const response = await axiosCbaInstance.delete(`${routes?.devices}/${publicId}`, {
      data: payload,
    });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, status: error?.response?.status, message: extractApiErrorMessage(error) };
  }
}

// PATCH device name — body { deviceName }.
export async function renameDevice(publicId, payload) {
  try {
    const response = await axiosCbaInstance.patch(`${routes?.devices}/${publicId}/name`, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return { ok: false, status: error?.response?.status, message: extractApiErrorMessage(error) };
  }
}

// Transfer permission — toggle.
// payload: { enabled: bool, transactionPin?, securityQuestion?, securityAnswer?, otp? }
// (the step-up fields are only needed when ENABLING, per stepUpRequiredToEnable).
// `status` is surfaced so the caller can branch on HTTP code; message is the
// backend's own text (shown verbatim).
export async function updateTransferPermission(payload) {
  try {
    const response = await axiosCbaInstance.put(routes?.transferPermission, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error?.response?.data || error?.message, null, 2));
    return {
      ok: false,
      status: error?.response?.status,
      message: extractApiErrorMessage(error),
    };
  }
}
