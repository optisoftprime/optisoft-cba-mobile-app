// screens/DeviceManagement.jsx
//
// Lets the user see the devices signed in to their account, rename them, remove
// one (requires step-up), and set how many devices are allowed.
//
// Endpoints (api/security.js):
//   GET  /security/device-limit            → { limit, activeDevices, maxAllowed, enforced, canSetLimit }
//   PUT  /security/device-limit            → { limit }
//   GET  /security/devices                 → [ { publicId, deviceName, model, platform, lastSeenAt, likelyThisDevice, currentDevice } ]
//   DELETE /security/devices/{publicId}    → step-up body (one credential)
//   PATCH  /security/devices/{publicId}/name → { deviceName }
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import Header from 'components/header';
import TouchBtn from 'components/touchBtn';
import TextInputComponent from 'components/textInputs';
import StepUpModal from 'components/StepUpModal';
import { navigateBack } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import useKeyboardHeight from 'app/hooks/useKeyboardHeight';
import { GlobalStatusBar } from 'config/statusBar';
import {
  getDeviceLimit,
  updateDeviceLimit,
  getDevices,
  deleteDevice,
  renameDevice,
} from 'api/security';
import { formatDate } from 'helper';

const platformIcon = (platform = '') => {
  const p = platform.toLowerCase();
  if (p.includes('ios') || p.includes('apple') || p.includes('iphone') || p.includes('ipad'))
    return 'logo-apple';
  if (p.includes('android')) return 'logo-android';
  return 'phone-portrait-outline';
};

export default function DeviceManagement() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // Android: the rename modal's window isn't resized for the keyboard, so the
  // card re-centres above it by the measured height (app/hooks/useKeyboardHeight).
  const keyboardHeight = useKeyboardHeight();

  const [limitDraft, setLimitDraft] = useState(null);
  const [savingLimit, setSavingLimit] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showError = (message) =>
    Toast.show({ type: 'error', text1: t('security.dmErrorTitle'), text2: message });

  // ── Device limit ───────────────────────────────────────────────────────────
  const {
    data: limitData,
    isLoading: loadingLimit,
    refetch: refetchLimit,
  } = useQuery({
    queryKey: ['deviceLimit'],
    queryFn: async () => {
      const res = await getDeviceLimit();
      if (res?.ok && res?.data?.data) return res.data.data;
      Toast.show({ type: 'error', text1: t('security.dmLoadFailed'), text2: res?.message });
      return null;
    },
    staleTime: 0,
  });

  // ── Devices ────────────────────────────────────────────────────────────────
  const {
    data: devices = [],
    isLoading: loadingDevices,
    isRefetching,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ['devices'],
    queryFn: async () => {
      const res = await getDevices();
      if (res?.ok && Array.isArray(res?.data?.data)) return res.data.data;
      if (!res?.ok)
        Toast.show({ type: 'error', text1: t('security.dmLoadFailed'), text2: res?.message });
      return [];
    },
    staleTime: 0,
  });

  const maxAllowed = limitData?.maxAllowed ?? 1;
  const canSetLimit = !!limitData?.canSetLimit;

  useEffect(() => {
    if (limitData?.limit != null && limitDraft == null) setLimitDraft(limitData.limit);
  }, [limitData, limitDraft]);

  const limitChanged =
    limitDraft != null && limitData?.limit != null && limitDraft !== limitData.limit;

  const stepLimit = (delta) => {
    setLimitDraft((v) => {
      const next = (v ?? limitData?.limit ?? 1) + delta;
      return Math.max(1, Math.min(maxAllowed, next));
    });
  };

  const handleSaveLimit = async () => {
    setSavingLimit(true);
    try {
      const res = await updateDeviceLimit({ limit: limitDraft });
      if (res?.ok) {
        Toast.show({
          type: 'success',
          text1: t('security.dmUpdated'),
          text2: t('security.dmLimitSaved'),
        });
        refetchLimit();
        refetchDevices();
      } else {
        showError(res?.message);
      }
    } catch (error) {
      showError(error?.message);
    } finally {
      setSavingLimit(false);
    }
  };

  // ── Rename ─────────────────────────────────────────────────────────────────
  const openRename = (device) => {
    setRenameTarget(device);
    setNewName(device?.deviceName ?? '');
  };

  const submitRename = async () => {
    if (!newName.trim()) {
      showError(t('security.dmNameRequired'));
      return;
    }
    setRenaming(true);
    try {
      const res = await renameDevice(renameTarget.publicId, { deviceName: newName.trim() });
      if (res?.ok) {
        Toast.show({
          type: 'success',
          text1: t('security.dmUpdated'),
          text2: t('security.dmRenameSaved'),
        });
        setRenameTarget(null);
        refetchDevices();
      } else {
        showError(res?.message);
      }
    } catch (error) {
      showError(error?.message);
    } finally {
      setRenaming(false);
    }
  };

  // ── Remove (step-up) ───────────────────────────────────────────────────────
  const confirmDelete = async (credential) => {
    setDeleting(true);
    try {
      const res = await deleteDevice(deleteTarget.publicId, credential);
      if (res?.ok) {
        Toast.show({
          type: 'success',
          text1: t('security.dmUpdated'),
          text2: t('security.dmRemoved'),
        });
        setDeleteTarget(null);
        refetchDevices();
        refetchLimit();
      } else {
        showError(res?.message); // backend message, verbatim — modal stays open for retry
      }
    } catch (error) {
      showError(error?.message);
    } finally {
      setDeleting(false);
    }
  };

  const refetchAll = () => {
    refetchLimit();
    refetchDevices();
  };

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <Header
        title={t('security.dmTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.ink}
        leftIconColor={colors.ink}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetchAll}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        {loadingLimit && loadingDevices ? (
          <View className="mt-24 items-center">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="mt-4 text-sm text-ink-muted">{t('security.dmLoading')}</Text>
          </View>
        ) : (
          <>
            {/* Device limit */}
            {!!limitData && (
              <View className="mb-6 rounded-2xl border border-line bg-card p-4">
                <View className="flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                    <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-ink">
                      {t('security.dmLimitTitle')}
                    </Text>
                    <Text className="mt-0.5 text-xs text-ink-muted">
                      {t('security.dmLimitUsage', {
                        active: limitData.activeDevices ?? 0,
                        limit: limitData.limit ?? 0,
                      })}
                    </Text>
                  </View>
                </View>

                <Text className="mt-3 text-xs text-ink-soft">
                  {limitData.enforced
                    ? t('security.dmLimitEnforced')
                    : t('security.dmLimitNotEnforced')}
                </Text>

                {canSetLimit ? (
                  <>
                    <View className="mt-4 flex-row items-center justify-between border-t border-line pt-4">
                      <Text className="text-sm font-semibold text-ink">
                        {t('security.dmSetLimit')}
                      </Text>
                      <View className="flex-row items-center" style={{ gap: 16 }}>
                        <TouchableOpacity
                          onPress={() => stepLimit(-1)}
                          disabled={savingLimit || (limitDraft ?? 1) <= 1}
                          className="h-9 w-9 items-center justify-center rounded-full border border-line bg-card-muted"
                          style={{ opacity: (limitDraft ?? 1) <= 1 ? 0.4 : 1 }}>
                          <Ionicons name="remove" size={20} color={colors.ink} />
                        </TouchableOpacity>
                        <Text
                          className="text-lg font-bold text-ink"
                          style={{ minWidth: 24, textAlign: 'center' }}>
                          {limitDraft ?? limitData.limit}
                        </Text>
                        <TouchableOpacity
                          onPress={() => stepLimit(1)}
                          disabled={savingLimit || (limitDraft ?? 1) >= maxAllowed}
                          className="h-9 w-9 items-center justify-center rounded-full border border-line bg-card-muted"
                          style={{ opacity: (limitDraft ?? 1) >= maxAllowed ? 0.4 : 1 }}>
                          <Ionicons name="add" size={20} color={colors.ink} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text className="mt-1 text-right text-xs text-ink-soft">
                      {t('security.dmMaxAllowed', { max: maxAllowed })}
                    </Text>
                    {limitChanged && (
                      <TouchBtn
                        onPress={handleSaveLimit}
                        label={t('security.dmSaveLimit')}
                        isLoading={savingLimit}
                        loadingText={t('security.tpWorking')}
                        textClassName="text-base font-semibold"
                        buttonClassName="items-center rounded-xl py-3.5"
                        containerClassName="mt-4"
                        textColor={colors.onPrimary}
                        loadingColor={colors.onPrimary}
                        activeOpacity={0.85}
                      />
                    )}
                  </>
                ) : (
                  <Text className="mt-3 text-xs text-ink-soft">{t('security.dmLimitCantSet')}</Text>
                )}
              </View>
            )}

            {/* Devices list */}
            <Text className="mb-3 text-[17px] font-bold text-ink">
              {t('security.dmDevicesTitle')}
            </Text>

            {devices.length === 0 ? (
              <View className="mt-6 items-center px-6">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-card-muted">
                  <Ionicons name="phone-portrait-outline" size={30} color={colors.inkSoft} />
                </View>
                <Text className="mt-3 text-center text-sm text-ink-muted">
                  {t('security.dmNoDevices')}
                </Text>
              </View>
            ) : (
              devices.map((device) => {
                const isThis = device?.currentDevice || device?.likelyThisDevice;
                return (
                  <View
                    key={device?.publicId}
                    className="mb-3 rounded-2xl border border-line bg-card p-4">
                    <View className="flex-row items-center">
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                        <Ionicons
                          name={platformIcon(device?.platform)}
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text
                            className="shrink text-[15px] font-semibold text-ink"
                            numberOfLines={1}>
                            {device?.deviceName || device?.model || t('security.dmUnknownDevice')}
                          </Text>
                          {isThis && (
                            <View className="ml-2 rounded-full bg-success-soft px-2 py-0.5">
                              <Text className="text-[10px] font-semibold text-on-success-soft">
                                {t('security.dmThisDevice')}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                          {[device?.model, device?.platform].filter(Boolean).join(' · ') || '—'}
                        </Text>
                        {!!device?.lastSeenAt && (
                          <Text className="mt-0.5 text-xs text-ink-soft">
                            {t('security.dmLastSeen', { date: formatDate(device.lastSeenAt) })}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View className="mt-3 flex-row border-t border-line pt-3" style={{ gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => openRename(device)}
                        className="flex-row items-center rounded-full bg-primary-light px-3 py-1.5"
                        activeOpacity={0.7}>
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text className="ml-1.5 text-xs font-semibold text-primary-dark">
                          {t('security.dmRename')}
                        </Text>
                      </TouchableOpacity>

                      {!isThis && (
                        <TouchableOpacity
                          onPress={() => setDeleteTarget(device)}
                          className="flex-row items-center rounded-full bg-danger-soft px-3 py-1.5"
                          activeOpacity={0.7}>
                          <Ionicons name="trash-outline" size={16} color={colors.danger} />
                          <Text className="ml-1.5 text-xs font-semibold text-danger">
                            {t('security.dmRemove')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Rename modal */}
      {renameTarget && (
        <Modal
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => !renaming && setRenameTarget(null)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            enabled={Platform.OS === 'ios'}
            style={{ flex: 1 }}>
            {/* Tap outside the card to close (unless a rename is in flight). */}
            <TouchableWithoutFeedback onPress={renaming ? undefined : () => setRenameTarget(null)}>
              <View
                className="flex-1 items-center justify-center px-6"
                style={{ backgroundColor: `${colors.black}73`, paddingBottom: keyboardHeight }}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View
                    className="w-full rounded-3xl p-5"
                    style={{
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.line,
                    }}>
                    <Text className="text-[17px] font-bold" style={{ color: colors.ink }}>
                      {t('security.dmRenameTitle')}
                    </Text>
                    <TextInputComponent
                      label={t('security.dmRenameLabel')}
                      value={newName}
                      onChangeText={setNewName}
                      placeholder={t('security.dmRenamePlaceholder')}
                      isLoading={renaming}
                      maxLength={40}
                      containerStyle={{ marginTop: 14, marginBottom: 4 }}
                    />
                    <TouchBtn
                      onPress={submitRename}
                      label={t('security.dmSave')}
                      isLoading={renaming}
                      loadingText={t('security.tpWorking')}
                      textClassName="text-base font-semibold"
                      buttonClassName="items-center rounded-xl py-3.5"
                      containerClassName="mt-2"
                      textColor={colors.onPrimary}
                      loadingColor={colors.onPrimary}
                      activeOpacity={0.85}
                    />
                    <TouchableOpacity
                      onPress={() => setRenameTarget(null)}
                      disabled={renaming}
                      className="mt-3 items-center py-2">
                      <Text className="text-sm font-semibold" style={{ color: colors.inkMuted }}>
                        {t('security.dmCancel')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* Remove (step-up) */}
      {deleteTarget && (
        <StepUpModal
          onClose={() => !deleting && setDeleteTarget(null)}
          submitting={deleting}
          title={t('security.dmRemoveTitle')}
          description={t('security.dmRemoveDesc', {
            name: deleteTarget.deviceName || deleteTarget.model || '',
          })}
          onConfirm={confirmDelete}
        />
      )}
    </View>
  );
}
