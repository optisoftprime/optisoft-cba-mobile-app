// screens/AppSettings.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Modal } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { LANGUAGES, setAppLanguage } from 'config/i18n';

export default function AppSettings() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [languageModal, setLanguageModal] = useState(false);

  const currentLanguage =
    LANGUAGES.find((l) => l.code === i18n.language)?.label ?? i18n.language?.toUpperCase();

  // Navigate rows (Language opens the picker instead of navigating).
  const navRows = [
    {
      id: 'notifications',
      icon: 'notifications-outline',
      title: t('settings.notificationsTitle'),
      subtitle: t('settings.notificationsSub'),
      onPress: () => navigateTo('notificationPreference'),
    },
    {
      id: 'biometrics',
      icon: 'finger-print-outline',
      title: t('settings.biometricsTitle'),
      subtitle: t('settings.biometricsSub'),
      onPress: () => navigateTo('setUpFace'),
    },
    {
      id: 'language',
      icon: 'globe-outline',
      title: t('settings.languageTitle'),
      subtitle: t('settings.languageSub'),
      onPress: () => setLanguageModal(true),
      rightLabel: currentLanguage,
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('settings.title')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.ink}
        leftIconColor={colors.ink}
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        <View className="gap-y-3">
          {navRows.map((option) => (
            <TouchableOpacity
              key={option.id}
              onPress={option.onPress}
              className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5"
              activeOpacity={0.7}>
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                <Ionicons name={option.icon} size={20} color={colors.primary} />
              </View>

              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">{option.title}</Text>
                <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                  {option.subtitle}
                </Text>
              </View>

              {option.rightLabel ? (
                <Text className="mr-1 text-[13px] font-semibold text-primary">
                  {option.rightLabel}
                </Text>
              ) : null}
              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </TouchableOpacity>
          ))}

          {/* Dark Mode — a switch row (no navigation). */}
          <View className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
              <Ionicons name={isDark ? 'moon' : 'moon-outline'} size={20} color={colors.primary} />
            </View>

            <View className="flex-1">
              <Text className="text-[15px] font-semibold text-ink">
                {t('settings.darkModeTitle')}
              </Text>
              <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                {t('settings.darkModeSub')}
              </Text>
            </View>

            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.line, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>
      </ScrollView>

      {/* Language picker (conditionally mounted — Fabric-safe). */}
      {languageModal && (
        <Modal
          transparent
          visible
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setLanguageModal(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setLanguageModal(false)}
            style={{ flex: 1, backgroundColor: `${colors.black}73`, justifyContent: 'flex-end' }}>
            <TouchableOpacity
              activeOpacity={1}
              style={{
                backgroundColor: colors.card,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 28,
              }}>
              <Text
                style={{ color: colors.ink, fontSize: 17, fontWeight: '700', marginBottom: 16 }}>
                {t('settings.chooseLanguage')}
              </Text>

              {LANGUAGES.map((lang) => {
                const selected = lang.code === i18n.language;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => {
                      setAppLanguage(lang.code);
                      setLanguageModal(false);
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.line,
                    }}
                    activeOpacity={0.7}>
                    <Text
                      style={{
                        fontSize: 16,
                        color: selected ? colors.primary : colors.ink,
                        fontWeight: selected ? '700' : '400',
                      }}>
                      {lang.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
}
