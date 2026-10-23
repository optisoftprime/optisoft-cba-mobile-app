// components/Dropdown.jsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import useKeyboardHeight from 'app/hooks/useKeyboardHeight';

export default function Dropdown({
  label,
  placeholder,
  value,
  options,
  onSelect,
  isOpen,
  onToggle,
  search = false,
  isLoading = false,
  triggerStyle = {},
  triggerTextStyle = {},
  triggerIconColor,
  triggerIconSize = 20,
  hideTrigger = false,
  style = {},
}) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const keyboardHeight = useKeyboardHeight();

  const defaultTriggerStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 14,
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Internal mirror of the `isOpen` prop. This is what actually drives the
  // Modal's `visible`. We sync it from the prop on every change, but we also
  // let selection close it directly (see handleSelect below) instead of
  // relying solely on the parent's `onToggle` call. Some parent screens also
  // set their own "isOpen" state to false inside `onSelect` before calling
  // `onToggle` — if `onToggle` is a naive `setIsOpen(p => !p)`, that produces
  // a double-flip in the same batch (false -> toggled back to true), and the
  // dropdown would appear to "not close". Driving the Modal off local state
  // that we set directly on select sidesteps that race entirely, regardless
  // of how any given parent wires onSelect/onToggle.
  const [internalOpen, setInternalOpen] = useState(isOpen);

  useEffect(() => {
    setInternalOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (!internalOpen) {
      setSearchQuery('');
      setSearchFocused(false);
    }
  }, [internalOpen]);

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions =
    search && searchQuery.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(searchQuery.toLowerCase()))
      : options;

  const chevronColor = triggerIconColor ?? (isLoading ? colors.border : colors.textMuted);

  const handleSelect = (optionValue) => {
    // Close immediately and locally — don't wait on/trust the parent's
    // isOpen/onToggle round trip.
    setInternalOpen(false);
    onSelect(optionValue);
    onToggle?.();
  };

  const handleRequestClose = () => {
    setInternalOpen(false);
    onToggle?.();
  };

  return (
    <View style={style}>
      {!!label && !hideTrigger && (
        <Text
          style={{
            marginBottom: 8,
            fontSize: 13,
            fontWeight: '600',
            color: isLoading ? colors.textMuted : colors.textPrimary,
          }}>
          {label}
        </Text>
      )}

      {!hideTrigger && (
        <TouchableOpacity
          onPress={isLoading ? undefined : onToggle}
          activeOpacity={isLoading ? 1 : 0.8}
          style={[
            defaultTriggerStyle,
            triggerStyle,
            isLoading && { backgroundColor: colors.border, opacity: 0.7 },
          ]}>
          <Text
            numberOfLines={1}
            style={[
              {
                flex: 1,
                fontSize: 16,
                color: value && !isLoading ? colors.textPrimary : colors.textMuted,
              },
              triggerTextStyle,
            ]}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
          <Ionicons
            name="chevron-down"
            size={triggerIconSize}
            color={chevronColor}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      )}

      {/* Only MOUNT the Modal while the dropdown is actually open.
          On the New Architecture (Fabric), a React Native <Modal> renders into
          a separate native host view. Keeping it mounted-but-hidden means that
          host view is still parented when the SCREEN is torn down during a
          navigation transition (router.replace / push) — and react-native-screens
          then throws `IllegalStateException: The specified child already has a
          parent` while reparenting it. Screens like stageOne carry several of
          these (Title / Marital Status / Gender), so the transition off the
          screen reliably crashed. Conditionally mounting the Modal means there's
          NO modal host view to reparent whenever the dropdown is closed — which
          is always the case during navigation — eliminating the crash class. */}
      {internalOpen && (
        <Modal
          visible
          transparent={true}
          statusBarTranslucent
          navigationBarTranslucent
          animationType="fade"
          onRequestClose={handleRequestClose}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleRequestClose}
            style={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              paddingHorizontal: 16,
              // When this is a searchable dropdown, pad the centring container by
              // the keyboard height so the card (and its search field) re-centres
              // in the space left above the keyboard instead of being covered.
              paddingBottom: keyboardHeight,
            }}>
            <TouchableOpacity
              activeOpacity={1}
              style={[
                {
                  maxHeight: 420,
                  overflow: 'hidden',
                  borderRadius: 24,
                  backgroundColor: colors.card,
                },
                shadows.md,
              ]}>
              {!!label && (
                <View
                  style={{
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                    paddingHorizontal: 20,
                    paddingTop: 18,
                    paddingBottom: 14,
                  }}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
                    {label}
                  </Text>
                </View>
              )}

              {search && (
                <View
                  style={{
                    borderBottomWidth: 1,
                    borderColor: colors.line,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: searchFocused ? colors.primary : colors.line,
                      borderRadius: 12,
                      backgroundColor: colors.cardMuted,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                    }}>
                    <Ionicons name="search" size={16} color={colors.inkSoft} />
                    <TextInput
                      style={{ marginLeft: 8, flex: 1, fontSize: 14, color: colors.ink }}
                      placeholder={t('components.searchPlaceholder')}
                      placeholderTextColor={colors.inkSoft}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus={false}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color={colors.inkSoft} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              <ScrollView keyboardShouldPersistTaps="handled">
                {filteredOptions.length === 0 ? (
                  <View
                    style={{ alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 }}>
                    <Text style={{ fontSize: 14, color: colors.inkMuted }}>
                      {t('components.noResults')}
                    </Text>
                  </View>
                ) : (
                  filteredOptions.map((option, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleSelect(option.value)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                        borderBottomWidth: index !== filteredOptions.length - 1 ? 1 : 0,
                        borderBottomColor: colors.line,
                        backgroundColor: value === option.value ? colors.primaryLight : colors.card,
                      }}>
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          color: value === option.value ? colors.primary : colors.ink,
                          fontWeight: value === option.value ? '600' : '400',
                        }}>
                        {option.label}
                      </Text>
                      {value === option.value && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}
