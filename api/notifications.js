import axiosCbaInstance from 'config/api';
import { routes } from 'config/backendConfig';
import { extractApiErrorMessage } from 'helper';

export async function getNotifications(params) {
  try {
    const response = await axiosCbaInstance.get(routes?.notificationList, { params });
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function getUnreadNotificationCount() {
  try {
    const response = await axiosCbaInstance.get(routes?.notificationUnreadCount);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function getNotificationById(id) {
  try {
    const response = await axiosCbaInstance.get(`${routes?.notificationDetail}/${id}`);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function markNotificationRead(id) {
  try {
    const response = await axiosCbaInstance.patch(`${routes?.notificationMarkRead}/${id}/read`);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

export async function markAllNotificationsRead() {
  try {
    const response = await axiosCbaInstance.patch(routes?.notificationMarkAllRead);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}

// Manual test trigger only — real notifications come from backend business events
export async function sendTestNotification(payload) {
  try {
    const response = await axiosCbaInstance.post(routes?.notificationSendTest, payload);
    return { ok: true, data: response.data };
  } catch (error) {
    console.log(JSON.stringify(error, null, 2));
    return { ok: false, message: extractApiErrorMessage(error) };
  }
}
