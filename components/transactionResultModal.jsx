// components/transactionResultModal.jsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import DetailRow from 'components/detailRow';

/**
 * Reusable transaction result modal.
 *
 * Props:
 * - visible: boolean
 * - success: boolean
 * - successTitle: string          (default "Purchase Successful")
 * - failureTitle: string          (default "Purchase Failed")
 * - message: string               (result message shown under the title)
 * - details: Array<{ label: string, value: string }>   (only rendered when success)
 * - onDone: () => void            (called on "Done" - success path, or "Cancel" - failure path)
 * - onTryAgain: () => void        (called on "Try Again" - failure path)
 * - doneLabel: string             (default "Done")
 * - tryAgainLabel: string         (default "Try Again")
 * - cancelLabel: string           (default "Cancel")
 */
export default function TransactionResultModal({
  visible,
  success,
  successTitle,
  failureTitle,
  message,
  details = [],
  onDone,
  onTryAgain,
  doneLabel,
  tryAgainLabel,
  cancelLabel,
}) {
  const { colors, shadows, isDark } = useTheme();
  const { t } = useTranslation();

  // Resolve user-facing defaults from i18n (callers may still override each).
  const resolvedSuccessTitle = successTitle ?? t('components.result.successTitle');
  const resolvedFailureTitle = failureTitle ?? t('components.result.failureTitle');
  const resolvedDoneLabel = doneLabel ?? t('components.result.done');
  const resolvedTryAgainLabel = tryAgainLabel ?? t('components.result.tryAgain');
  const resolvedCancelLabel = cancelLabel ?? t('components.result.cancel');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View
          className="w-full p-6"
          style={[{ backgroundColor: colors.card, borderRadius: 24 }, shadows.md]}>
          {/* Icon */}
          <View className="mb-4 items-center">
            <View
              className="h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: success ? colors.successSoft : colors.dangerSoft }}>
              <Ionicons
                name={success ? 'checkmark' : 'close'}
                size={34}
                color={success ? colors.success : colors.danger}
              />
            </View>
          </View>

          {/* Title */}
          <Text
            className="mb-1 text-center"
            style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
            {success ? resolvedSuccessTitle : resolvedFailureTitle}
          </Text>

          {/* Message */}
          <Text
            className="mb-5 text-center"
            style={{ fontSize: 14, lineHeight: 20, color: colors.inkMuted }}>
            {message}
          </Text>

          {/* Details (success only) */}
          {success && details.length > 0 && (
            <View
              className="mb-6 rounded-2xl px-4 py-1"
              style={{
                backgroundColor: colors.cardMuted,
                borderWidth: 1,
                borderColor: colors.line,
              }}>
              {details.map((detail, index) => (
                <DetailRow
                  key={index}
                  label={detail.label}
                  value={detail.value}
                  last={index === details.length - 1}
                />
              ))}
            </View>
          )}

          {/* Actions */}
          {success ? (
            <TouchBtn
              onPress={onDone}
              label={resolvedDoneLabel}
              backgroundColor={colors.primary}
              textColor={colors.onPrimary}
              loadingColor={colors.onPrimary}
              buttonClassName="items-center rounded-lg py-4"
              textClassName="text-base font-semibold"
              activeOpacity={0.8}
            />
          ) : (
            <View>
              <TouchBtn
                onPress={onTryAgain}
                label={resolvedTryAgainLabel}
                backgroundColor={colors.primary}
                textColor={colors.onPrimary}
                loadingColor={colors.onPrimary}
                buttonClassName="items-center rounded-lg py-4"
                textClassName="text-base font-semibold"
                activeOpacity={0.8}
              />
              <TouchableOpacity
                onPress={onDone}
                className="mt-3 items-center rounded-xl py-4"
                style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
                <Text className="text-base font-semibold" style={{ color: colors.ink }}>
                  {resolvedCancelLabel}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
