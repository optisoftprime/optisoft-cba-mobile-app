// components/ConfirmDangerModal.jsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';

export default function ConfirmDangerModal({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  subtitle,
  confirmLabel,
  cancelLabel,
  icon = 'warning-outline',
}) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // Resolve user-facing defaults from i18n (callers may still override each).
  const resolvedTitle = title ?? t('components.confirm.title');
  const resolvedSubtitle = subtitle ?? t('components.confirm.subtitle');
  const resolvedConfirmLabel = confirmLabel ?? t('components.confirm.confirmLabel');
  const resolvedCancelLabel = cancelLabel ?? t('components.confirm.cancelLabel');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isLoading ? undefined : onClose}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={isLoading ? undefined : onClose}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          />

          {/* Sheet */}
          <View
            style={{
              backgroundColor: colors.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 24,
              paddingBottom: 40,
              paddingTop: 12,
            }}>
            {/* Handle + close row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 32 }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View
                  style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line }}
                />
              </View>
              {!isLoading ? (
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.7}
                  style={{ width: 32, alignItems: 'flex-end' }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: colors.cardMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name="close" size={18} color={colors.ink} />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 32 }} />
              )}
            </View>

            {/* Danger icon */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: colors.dangerSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name={icon} size={30} color={colors.danger} />
              </View>
            </View>

            {/* Title */}
            <Text
              style={{
                textAlign: 'center',
                fontSize: 17,
                fontWeight: '700',
                color: colors.ink,
                marginBottom: 8,
              }}>
              {resolvedTitle}
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 13,
                color: colors.inkMuted,
                marginBottom: 28,
                lineHeight: 20,
              }}>
              {resolvedSubtitle}
            </Text>

            {/* Confirm button — red danger */}
            <TouchBtn
              onPress={onConfirm}
              label={resolvedConfirmLabel}
              isLoading={isLoading}
              loadingText={t('components.confirm.processing')}
              textClassName="text-base font-semibold"
              buttonClassName="items-center rounded-lg py-4 mb-3"
              activeOpacity={0.8}
              containerClassName=""
              backgroundColor={colors.danger}
              borderColor={colors.danger}
              textColor={colors.onDanger}
              loadingColor={colors.onDanger}
            />

            {/* Cancel button — outline */}
            <TouchBtn
              onPress={onClose}
              label={resolvedCancelLabel}
              disabled={isLoading}
              textClassName="text-base font-semibold"
              buttonClassName="items-center rounded-lg py-4"
              activeOpacity={0.8}
              backgroundColor={colors.card}
              borderColor={colors.line}
              borderWidth={1}
              textColor={colors.ink}
              containerClassName=""
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
