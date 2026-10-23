import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { queryClient } from './../app/_layout';

// Helper functions
const save = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log('Storage save error:', error);
  }
};

const load = async (key) => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.log('Storage load error:', error);
    return null;
  }
};

const remove = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.log('Storage remove error:', error);
  }
};

// ─── SecureStore (sensitive — token) ────────────────────────────────────────

async function saveSecure(key, value) {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
  } catch (error) {
    console.log('SecureStore save error:', error);
  }
}

async function loadSecure(key) {
  try {
    const value = await SecureStore.getItemAsync(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.log('SecureStore load error:', error);
    return null;
  }
}

async function removeSecure(key) {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.log('SecureStore remove error:', error);
  }
}

// ─── User ────────────────────────────────────────────────────────────────────

async function getUser() {
  return load('user');
}

async function getUserLogs() {
  return load('userLogs');
}

// Merges the provided fields into the existing saved user object.
// e.g. updateUser({ accountName: 'John Doe' }) only touches that field.
async function updateUser(fields) {
  try {
    const existing = (await load('user')) ?? {};
    const updated = { ...existing, ...fields };
    await save('user', updated);
    return updated;
  } catch (error) {
    console.log('Storage updateUser error:', error);
  }
}

// ─── Clear session (logout / deactivate) ─────────────────────────────────────

async function clearAll() {
  try {
    await Promise.all([
      // Wipe all known SecureStore keys — SecureStore has no "clear all" API,
      // so you must explicitly delete every key you ever set.
      SecureStore.deleteItemAsync('auth'),
      SecureStore.deleteItemAsync('biometricKey'), // if you have one
      // any other secure keys go here

      // Wipe AsyncStorage entirely
      AsyncStorage.clear(),
    ]);

    // Wipe all cached queries/mutations in memory
    queryClient.clear();

    // Restore the "already opened" flag so the splash screen skips onboarding
    // and doesn't re-run first-launch logic after a logout/clear.
    await save('app', { hasOpenedBefore: true });
  } catch (error) {
    console.log('Storage clearAll error:', error);
  }
}

// Full sign-out — called only when user explicitly switches account.
// This wipes everything including username so LoginScreen shows instead of UnlockScreen.
async function clearAllFull() {
  try {
    await Promise.all([
      // Wipe all known SecureStore keys — SecureStore has no "clear all" API,
      // so you must explicitly delete every key you ever set.
      SecureStore.deleteItemAsync('auth'),
      SecureStore.deleteItemAsync('biometricKey'), // if you have one
      // any other secure keys go here

      // Wipe AsyncStorage entirely
      AsyncStorage.clear(),
    ]);

    // Wipe all cached queries/mutations in memory
    queryClient.clear();

    // Restore the device-level "already opened" flag. hasOpenedBefore tracks
    // first launch ON THIS DEVICE — it must survive logout / account switch,
    // otherwise the next app open wrongly re-shows the onboarding screen.
    await save('app', { hasOpenedBefore: true });
  } catch (error) {
    console.log('Storage clearAllFull error:', error);
  }
}

export {
  save,
  load,
  remove,
  removeSecure,
  loadSecure,
  saveSecure,
  getUser,
  getUserLogs,
  updateUser,
  clearAll,
  clearAllFull,
};
