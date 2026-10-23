// components/statementFormatModal.jsx
import React from 'react';
import { View, Text, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';

export default function StatementFormatModal({
  visible,
  onClose,
  onSelect,
  isDownloading = false,
}) {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={isDownloading ? undefined : onClose}>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}>
          {/* Backdrop */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={isDownloading ? undefined : onClose}
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
              {!isDownloading ? (
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

            {/* Title */}
            <Text
              style={{
                textAlign: 'center',
                fontSize: 17,
                fontWeight: '700',
                color: colors.ink,
                marginBottom: 6,
              }}>
              Download Statement
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 13,
                color: colors.inkMuted,
                marginBottom: 28,
              }}>
              Choose the format for your statement
            </Text>

            {/* PDF Option */}
            <TouchableOpacity
              onPress={() => onSelect('pdf')}
              disabled={isDownloading}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 16,
                backgroundColor: colors.card,
                marginBottom: 12,
                opacity: isDownloading ? 0.5 : 1,
              }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.dangerSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}>
                <Ionicons name="document-text-outline" size={24} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>
                  PDF Document
                </Text>
                <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 3 }}>
                  Best for printing and sharing
                </Text>
              </View>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.cardMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
              </View>
            </TouchableOpacity>

            {/* Excel Option */}
            <TouchableOpacity
              onPress={() => onSelect('excel')}
              disabled={isDownloading}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 16,
                backgroundColor: colors.card,
                marginBottom: 32,
                opacity: isDownloading ? 0.5 : 1,
              }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.successSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 16,
                }}>
                <Ionicons name="grid-outline" size={24} color={colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>
                  Excel Spreadsheet
                </Text>
                <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 3 }}>
                  Best for data and analysis
                </Text>
              </View>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.cardMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
              </View>
            </TouchableOpacity>

            {/* Cancel */}
            <TouchableOpacity
              onPress={onClose}
              disabled={isDownloading}
              activeOpacity={0.7}
              style={{
                alignItems: 'center',
                paddingVertical: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.line,
                backgroundColor: colors.card,
                opacity: isDownloading ? 0.5 : 1,
              }}>
              <Text style={{ fontSize: 15, color: colors.ink, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
