// screens/UpgradeAccount.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import TouchBtn from 'components/touchBtn';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { getUser } from 'config/storage';
import { fetchAllKycTiers, kycUpgradeRequest } from 'api/kyc';

// Pick the singular/plural key in JS rather than relying on i18next's plural
// suffix lookup, which needs Intl.PluralRules — not reliably available in
// Hermes, where the lookup fails and the raw key is shown on screen.
const pluralKey = (key, count) => `${key}_${Number(count) === 1 ? 'one' : 'other'}`;

export default function UpgradeAccount() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [tiers, setTiers] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [selectedTier, setSelectedTier] = useState(null);
  const [tierUpgradeStatuses, setTierUpgradeStatuses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTierName, setCurrentTierName] = useState(null);

  useEffect(() => {
    async function init() {
      setIsFetching(true);

      const [user, tiersResult] = await Promise.all([getUser(), fetchAllKycTiers()]);

      setCurrentTierName(user?.customerKycTier ?? null);
      // Keep the FULL list of per-tier upgrade statuses. The old
      // `setTierUpgradeStatus(...arr)` spread only the first entry into state
      // (so other tiers never showed their status) and threw for a new user
      // whose tierUpgradeStatusResponse is null.
      setTierUpgradeStatuses(
        Array.isArray(user?.tierUpgradeStatusResponse) ? user.tierUpgradeStatusResponse : []
      );

      if (tiersResult?.ok && Array.isArray(tiersResult?.data?.data)) {
        setTiers(tiersResult.data.data);
      } else {
        Toast.show({
          type: 'error',
          text1: t('kyc.toastLoadTiersFailed'),
          text2: tiersResult?.message || t('kyc.pleaseTryAgain'),
        });
      }

      setIsFetching(false);
    }

    init();
  }, [t]);

  // Extract the numeric level from e.g. "TIER_2" → 2
  function tierLevel(tierName) {
    const match = tierName?.toString()?.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  const currentLevel = tierLevel(currentTierName);

  // A request still awaiting review blocks starting ANY other upgrade.
  const hasPendingUpgrade = tierUpgradeStatuses.some((s) => s?.status === 'PENDING');

  // A tier is upgradeable only when: you don't already have it, no request is
  // pending, and it's the IMMEDIATE next tier. This stops the user jumping to
  // Tier 3 while Tier 2 is still Pending / not yet approved (BUG-015).
  const isTierDisabled = (tier) => {
    const level = tierLevel(tier?.kycTierName);
    if (level <= currentLevel) return true; // already have it / passed
    if (hasPendingUpgrade) return true; // hold everything until the pending one resolves
    if (level > currentLevel + 1) return true; // upgrade one tier at a time
    return false;
  };

  // The upgrade request status for a given tier (or null). Backend returns an
  // array of { tierName, status } under tierUpgradeStatusResponse.
  const upgradeStatusForTier = (tierName) =>
    tierUpgradeStatuses.find((s) => s?.tierName === tierName) ?? null;

  // Reviewer's note attached to a reviewed request, if the backend sends one.
  // We check the common field names so it surfaces automatically once the API
  // includes it (currently it returns only tierName + status).
  const upgradeCommentOf = (status) =>
    status?.comment ?? status?.reason ?? status?.remark ?? status?.rejectionReason ?? null;

  // NOTE: No permission request needed on Android 13+.
  // launchImageLibraryAsync uses the system photo picker which requires no
  // READ_MEDIA_IMAGES permission — removing requestMediaLibraryPermissionsAsync
  // prevents Google Play from flagging restricted permissions in your build.
  const handlePickDocument = async () => {
    const required = selectedTier?.requiredDocuments ?? 1;
    const remaining = required - documents.length;

    if (remaining <= 0) {
      Toast.show({
        type: 'info',
        text1: t('kyc.limitReached'),
        text2: t(pluralKey('kyc.exactDocuments', required), { count: required }),
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets?.length) return;

    const picked = result.assets
      .filter((asset) => !!asset.base64)
      .slice(0, remaining)
      .map((asset) => {
        const extension = asset.uri?.split('.')?.pop()?.toLowerCase() ?? 'jpeg';
        const name = asset.fileName ?? `document.${extension}`;
        return { name, base64: asset.base64 };
      });

    if (picked.length > 0) {
      setDocuments((prev) => [...prev, ...picked]);
    }

    if (result.assets.length > remaining) {
      Toast.show({
        type: 'info',
        text1: t('kyc.filesSkipped'),
        text2: t(pluralKey('kyc.filesSkippedSub', remaining), { count: remaining }),
      });
    }
  };

  const handleRemoveDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpgrade = (tier) => {
    setSelectedTier(tier);
    setDocuments([]);
  };

  const handleCancelUpgrade = () => {
    if (isSubmitting) return;
    setSelectedTier(null);
    setDocuments([]);
  };

  const handleSubmitUpgrade = async () => {
    if (!selectedTier) return;

    const required = selectedTier?.requiredDocuments ?? 1;

    if (documents.length === 0) {
      Toast.show({
        type: 'error',
        text1: t('kyc.noDocuments'),
        text2: t('kyc.attachRequired'),
      });
      return;
    }

    if (documents.length !== required) {
      Toast.show({
        type: 'error',
        text1: t('kyc.incorrectCount'),
        text2: t(pluralKey('kyc.incorrectCountSub', required), {
          count: required,
          have: documents.length,
        }),
      });
      return;
    }

    setIsSubmitting(true);

    Toast.show({
      type: 'info',
      text1: t('kyc.submittingRequest'),
      text2: t('kyc.pleaseWait'),
      autoHide: false,
    });

    const payload = {
      targetTierId: selectedTier?.id,
      documents: documents.map((d) => d.base64),
    };

    const result = await kycUpgradeRequest(null, payload);

    Toast.hide();
    setIsSubmitting(false);

    if (result?.ok) {
      Toast.show({
        type: 'success',
        text1: t('kyc.requestSubmitted'),
        text2: t('kyc.requestSubmittedSub'),
      });
      setSelectedTier(null);
      setDocuments([]);
    } else {
      Toast.show({
        type: 'error',
        text1: t('kyc.upgradeFailed'),
        text2: result?.message || t('kyc.somethingWrong'),
      });
    }
  };

  // ─── Upgrade form view ────────────────────────────────────────────────────
  if (selectedTier) {
    const required = selectedTier?.requiredDocuments ?? 1;
    const remaining = required - documents.length;
    const hasEnough = documents.length === required;

    return (
      <View className="flex-1 bg-background">
        <Header
          title={t('kyc.upgradeTo', {
            tier: selectedTier?.displayName || selectedTier?.kycTierName,
          })}
          onLeftPress={handleCancelUpgrade}
          showLeftIcon={true}
          color={colors.textPrimary}
        />

        <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
          {/* Tier info card */}
          <View className="mb-6 rounded-2xl border border-line bg-card p-4" style={shadows.sm}>
            <Text className="mb-1 text-[17px] font-bold text-ink">
              {selectedTier?.displayName || selectedTier?.kycTierName}
            </Text>
            {!!selectedTier?.description && (
              <Text className="mb-2 text-[13px] text-ink-muted">{selectedTier.description}</Text>
            )}
            {!!selectedTier?.transactionLimit && (
              <View className="self-start rounded-full bg-primary-light px-3 py-1.5">
                <Text className="text-[13px] font-medium text-primary-dark">
                  {t('kyc.transactionLimit', {
                    amount: Number(selectedTier.transactionLimit).toLocaleString(),
                  })}
                </Text>
              </View>
            )}
          </View>

          {/* Required documents info */}
          {Array.isArray(selectedTier?.documentTypes) && selectedTier.documentTypes.length > 0 && (
            <View className="mb-6">
              <Text className="mb-3 text-[17px] font-bold text-ink">
                {t('kyc.requiredDocumentsTitle', { count: required })}
              </Text>
              <View className="rounded-2xl border border-line bg-card px-4">
                {selectedTier.documentTypes.map((doc, index) => (
                  <View
                    key={doc?.id}
                    className={`flex-row items-center py-3 ${
                      index < selectedTier.documentTypes.length - 1 ? 'border-b border-line' : ''
                    }`}>
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-ink">{doc?.name}</Text>
                      {!!doc?.description && (
                        <Text className="mt-0.5 text-xs text-ink-muted">{doc.description}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Attached documents */}
          <View className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[17px] font-bold text-ink">
                {t('kyc.attachDocuments')} <Text className="text-danger">*</Text>
              </Text>
              <View
                className={`rounded-full px-3 py-1.5 ${hasEnough ? 'bg-success-soft' : 'bg-card-muted'}`}>
                <Text
                  className={`text-xs font-medium ${hasEnough ? 'text-on-success-soft' : 'text-ink-muted'}`}>
                  {t('kyc.attachedCount', { count: documents.length, required })}
                </Text>
              </View>
            </View>

            {documents.map((doc, index) => (
              <View
                key={index}
                className="mb-2 flex-row items-center rounded-2xl border border-line bg-card px-4 py-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                  <Ionicons name="document-attach-outline" size={20} color={colors.primary} />
                </View>
                <Text className="mx-3 flex-1 text-sm text-ink" numberOfLines={1}>
                  {doc?.name}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveDocument(index)}
                  disabled={isSubmitting}
                  activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={22} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ))}

            {documents.length < required && (
              <TouchableOpacity
                onPress={handlePickDocument}
                disabled={isSubmitting}
                activeOpacity={0.8}
                className="mt-1 flex-row items-center justify-center rounded-2xl border border-dashed border-line bg-card py-4"
                style={{ opacity: isSubmitting ? 0.6 : 1 }}>
                <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
                <Text className="ml-2 text-sm font-medium text-primary">
                  {t('kyc.tapToAttach', { remaining })}
                </Text>
              </TouchableOpacity>
            )}

            {documents.length === required && (
              <View className="mt-1 flex-row items-center justify-center rounded-2xl bg-success-soft py-4">
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.success} />
                <Text className="ml-2 text-sm font-medium text-on-success-soft">
                  {t('kyc.allDocumentsAttached')}
                </Text>
              </View>
            )}
          </View>

          <View className="h-4" />

          <TouchBtn
            onPress={handleSubmitUpgrade}
            label={t('kyc.submitRequest')}
            isLoading={isSubmitting}
            loadingText={t('kyc.submitting')}
            disabled={!hasEnough}
            textClassName="text-base font-semibold"
            buttonClassName="items-center rounded-xl py-4 mb-3"
            activeOpacity={0.8}
            containerClassName=""
          />

          <TouchBtn
            onPress={handleCancelUpgrade}
            label={t('kyc.cancel')}
            disabled={isSubmitting}
            textClassName="text-base font-semibold"
            textColor={colors.ink}
            backgroundColor={colors.card}
            borderColor={colors.line}
            borderWidth={1}
            buttonClassName="items-center rounded-xl py-4"
            activeOpacity={0.8}
            variant="outline"
            containerClassName=""
          />

          <View className="h-8" />
        </ScrollView>
      </View>
    );
  }

  // ─── Tiers list view ──────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('kyc.title')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
      />

      <ScrollView className="flex-1 px-4 pt-6" showsVerticalScrollIndicator={false}>
        {isFetching ? (
          <View className="mt-16 items-center">
            <ActivityIndicator size="large" color={colors.primary} />
            <Text className="mt-3 text-sm text-ink-muted">{t('kyc.loadingTiers')}</Text>
          </View>
        ) : tiers.length === 0 ? (
          <View className="mt-16 items-center px-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-card-muted">
              <Ionicons name="layers-outline" size={30} color={colors.inkSoft} />
            </View>
            <Text className="mt-4 text-center text-[15px] font-semibold text-ink">
              {t('kyc.noTiers')}
            </Text>
            <Text className="mt-1.5 text-center text-[13px] leading-5 text-ink-muted">
              {t('kyc.noTiersSub')}
            </Text>
          </View>
        ) : (
          tiers.map((tier) => {
            const disabled = isTierDisabled(tier);
            const isCurrent = tier?.kycTierName === currentTierName;
            const level = tierLevel(tier?.kycTierName);
            const upgradeStatus = upgradeStatusForTier(tier?.kycTierName);
            const upgradeComment = upgradeCommentOf(upgradeStatus);
            // Locked = a higher tier the user can't start yet (a request is
            // pending, or it isn't the next tier). Distinct from an already-passed
            // tier, and never overrides its own Pending/Approved/Rejected status.
            const isLocked = disabled && level > currentLevel && !upgradeStatus;

            return (
              <View
                key={tier?.id}
                className="mb-3 flex-row items-center justify-between rounded-2xl border border-line bg-card p-4"
                style={shadows.sm}>
                <View className="mr-3 flex-1">
                  <View className="mb-0.5 flex-row items-center gap-2">
                    <Text className="text-[15px] font-semibold text-ink">
                      {tier?.displayName || tier?.kycTierName}
                    </Text>
                    {isCurrent && (
                      <View className="rounded-full bg-primary-light px-2.5 py-0.5">
                        <Text className="text-[11px] font-semibold text-primary-dark">
                          {t('kyc.current')}
                        </Text>
                      </View>
                    )}
                  </View>
                  {!!tier?.description && (
                    <Text className="text-xs text-ink-muted" numberOfLines={1}>
                      {tier.description}
                    </Text>
                  )}
                  {!!tier?.transactionLimit && (
                    <Text
                      className={`mt-1 text-xs font-medium ${disabled ? 'text-ink-soft' : 'text-primary'}`}>
                      {t('kyc.limit', { amount: Number(tier.transactionLimit).toLocaleString() })}
                    </Text>
                  )}
                  <Text className="mt-1 text-xs text-ink-soft">
                    {t(pluralKey('kyc.documentsRequired', tier?.requiredDocuments), {
                      count: tier?.requiredDocuments,
                    })}
                  </Text>

                  {isLocked && (
                    <Text className="mt-1 text-xs text-ink-soft">{t('kyc.lockedHint')}</Text>
                  )}

                  {/* Reviewer's note on an approved/rejected request — backend
                      text, shown verbatim (not translated) once the API sends it. */}
                  {!!upgradeComment && (
                    <Text
                      className={`mt-1 text-xs ${
                        upgradeStatus?.status === 'REJECTED' ? 'text-danger' : 'text-ink-muted'
                      }`}>
                      {t('kyc.reviewNote')}: {upgradeComment}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() => !disabled && handleUpgrade(tier)}
                  disabled={disabled}
                  className={`rounded-full px-3 py-1.5 ${
                    upgradeStatus?.status === 'PENDING'
                      ? 'bg-warning-soft'
                      : upgradeStatus?.status === 'APPROVED'
                        ? 'bg-success-soft'
                        : upgradeStatus?.status === 'REJECTED'
                          ? 'bg-danger-soft'
                          : disabled
                            ? 'bg-card-muted'
                            : 'bg-primary'
                  }`}
                  style={{ opacity: disabled ? 0.7 : 1 }}
                  activeOpacity={0.8}>
                  {upgradeStatus?.status === 'PENDING' ? (
                    <Text className="text-[13px] font-semibold text-on-warning-soft">
                      {t('kyc.pending')}
                    </Text>
                  ) : upgradeStatus?.status === 'APPROVED' ? (
                    <Text className="text-[13px] font-semibold text-on-success-soft">
                      {t('kyc.approved')}
                    </Text>
                  ) : upgradeStatus?.status === 'REJECTED' ? (
                    <Text className="text-[13px] font-semibold text-on-danger-soft">
                      {t('kyc.rejected')}
                    </Text>
                  ) : (
                    <Text
                      className={`text-[13px] font-semibold ${disabled ? 'text-ink-muted' : 'text-on-primary'}`}>
                      {isCurrent
                        ? t('kyc.active')
                        : level <= currentLevel
                          ? t('kyc.passed')
                          : disabled
                            ? t('kyc.locked')
                            : t('kyc.upgrade')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View className="h-6" />
      </ScrollView>
    </View>
  );
}

// s
