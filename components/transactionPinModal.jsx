// components/transactionPinModal.jsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';

const DEFAULT_PIN_LENGTH = 4;

/**
 * Reusable transaction-authorization PIN modal.
 *
 * Props:
 * - visible: boolean
 * - onClose: () => void                      (called when closing, ignored while submitting)
 * - pin: string                               (current entered pin)
 * - pinError: string
 * - isSubmitting: boolean
 * - onKeyPress: (key: string) => void         ('backspace' or a digit '0'-'9')
 * - pinLength: number                         (default 4)
 * - title: string                             (default "Authorize Payment")
 * - promptText: string                        (default "Enter your 4-digit transaction PIN to confirm")
 * - processingText: string                    (default "Processing your payment...")
 * - summary: {
 *     icon: () => JSX.Element | null,         (render function for the leading icon)
 *     iconBackgroundColor: string,
 *     title: string,                          (e.g. plan name, or "MTN Recharge")
 *     subtitle: string,                       (e.g. phone number)
 *     amountLabel: string,                    (already formatted, e.g. "₦1,000.00")
 *     details: Array<{ label: string, value: string }>  (optional - extra rows shown
 *       in a bordered section below the main row, e.g. Customer Name, Card Number)
 *   }
 */
export default function TransactionPinModal({
  visible,
  onClose,
  pin,
  pinError,
  isSubmitting,
  onKeyPress,
  pinLength = DEFAULT_PIN_LENGTH,
  title,
  promptText,
  processingText,
  summary,
}) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // Resolve user-facing defaults from i18n (callers may still override each).
  const resolvedTitle = title ?? t('components.pinModal.title');
  const resolvedPrompt = promptText ?? t('components.pinModal.prompt');
  const resolvedProcessing = processingText ?? t('components.pinModal.processing');

  const handleClose = () => {
    if (isSubmitting) return;
    onClose?.();
  };

  const renderKeypad = () => {
    const rows = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace'],
    ];
    return (
      <View className="mt-2">
        {rows.map((row, ri) => (
          <View key={ri} className="mb-4 flex-row justify-between">
            {row.map((key, ki) => {
              if (key === '') return <View key={ki} className="h-16 w-16" />;
              if (key === 'backspace')
                return (
                  <TouchableOpacity
                    key={ki}
                    onPress={() => onKeyPress?.('backspace')}
                    className="h-16 w-16 items-center justify-center rounded-full"
                    activeOpacity={0.5}
                    disabled={isSubmitting}>
                    <Ionicons name="backspace-outline" size={26} color={colors.ink} />
                  </TouchableOpacity>
                );
              return (
                <TouchableOpacity
                  key={ki}
                  onPress={() => onKeyPress?.(key)}
                  className="h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: colors.cardMuted }}
                  activeOpacity={0.5}
                  disabled={isSubmitting}>
                  <Text className="text-2xl font-semibold" style={{ color: colors.ink }}>
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}>
      {/* Tap the dimmed backdrop to close (not while the PIN is submitting). */}
      <TouchableWithoutFeedback onPress={isSubmitting ? undefined : handleClose}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              className="px-6 pt-3"
              style={{
                paddingBottom: 32,
                backgroundColor: colors.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}>
              {/* Drag handle */}
              <View className="mb-4 items-center">
                <View
                  style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line }}
                />
              </View>

              {/* Header */}
              <View className="mb-1 flex-row items-center justify-between">
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
                  {resolvedTitle}
                </Text>
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={isSubmitting}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: colors.cardMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name="close" size={18} color={colors.ink} />
                </TouchableOpacity>
              </View>

              {/* Summary card */}
              {summary && (
                <View
                  className="mb-6 mt-3 rounded-2xl p-4"
                  style={{
                    backgroundColor: colors.cardMuted,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}>
                  <View
                    className={`flex-row items-center ${
                      summary.details?.length > 0 ? 'mb-3' : ''
                    }`}>
                    <View
                      className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: summary.iconBackgroundColor || colors.primaryLight,
                      }}>
                      {summary.icon ? summary.icon() : null}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: colors.ink }}
                        numberOfLines={1}>
                        {summary.title || ''}
                      </Text>
                      <Text className="text-xs" style={{ color: colors.inkMuted }}>
                        {summary.subtitle}
                      </Text>
                    </View>
                    <Text className="text-base font-bold" style={{ color: colors.ink }}>
                      {summary.amountLabel}
                    </Text>
                  </View>

                  {summary.details?.length > 0 && (
                    <View
                      className="pt-3"
                      style={{ borderTopWidth: 1, borderTopColor: colors.line }}>
                      {summary.details.map((detail, index) => (
                        <Text
                          key={index}
                          className={`text-xs ${index === 0 ? '' : 'mt-0.5'}`}
                          style={{ color: colors.inkMuted }}>
                          <Text className="font-semibold" style={{ color: colors.ink }}>
                            {detail.label}:{' '}
                          </Text>
                          {detail.value}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {!isSubmitting ? (
                <>
                  <Text className="mb-6 text-center text-sm" style={{ color: colors.inkMuted }}>
                    {resolvedPrompt}
                  </Text>

                  {/* PIN dots */}
                  <View className="mb-2 flex-row justify-center" style={{ gap: 18 }}>
                    {Array.from({ length: pinLength }).map((_, i) => (
                      <View
                        key={i}
                        className="h-4 w-4 rounded-full"
                        style={
                          pin.length > i
                            ? { backgroundColor: colors.primary }
                            : {
                                borderWidth: 1.5,
                                borderColor: colors.line,
                                backgroundColor: 'transparent',
                              }
                        }
                      />
                    ))}
                  </View>

                  <Text
                    className="mb-4 h-5 text-center text-xs font-medium"
                    style={{ color: colors.danger }}>
                    {pinError}
                  </Text>

                  {renderKeypad()}
                </>
              ) : (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text className="mt-4 text-sm" style={{ color: colors.inkMuted }}>
                    {resolvedProcessing}
                  </Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
