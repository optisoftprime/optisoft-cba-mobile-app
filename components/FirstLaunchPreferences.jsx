// components/FirstLaunchPreferences.jsx
//
// One-time popup shown the FIRST time the app is ever opened, so the user can
// pick their language and light/dark appearance before anything else. Choices
// apply live (the popup itself re-themes / re-translates as you tap) and are
// persisted; "Continue" closes it. It's mounted CONDITIONALLY (not a
// visible={false} Modal) and rendered as an absolute overlay rather than a
// React Native <Modal>, to stay safe on the New Architecture / Fabric.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { LANGUAGES, setAppLanguage } from 'config/i18n';

export default function FirstLaunchPreferences({ onDone }) {
  const { colors, shadows, isDark, setTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const themeOptions = [
    { mode: 'light', icon: 'sunny-outline', label: t('theme.light') },
    { mode: 'dark', icon: 'moon-outline', label: t('theme.dark') },
  ];
  const activeMode = isDark ? 'dark' : 'light';

  return (
    <View
      className="absolute inset-0 z-50 items-center justify-center px-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <View
        className="w-full px-6 pb-6 pt-7"
        style={[{ backgroundColor: colors.card, borderRadius: 24 }, shadows.md]}>
        {/* Heading */}
        <Text className="text-xl font-bold" style={{ color: colors.ink }}>
          {t('preferences.title')}
        </Text>
        <Text className="mt-2 text-sm leading-5" style={{ color: colors.inkMuted }}>
          {t('preferences.subtitle')}
        </Text>

        {/* Language */}
        <Text
          className="mb-2 mt-6 text-xs font-semibold uppercase"
          style={{ color: colors.inkSoft, letterSpacing: 0.5 }}>
          {t('preferences.languageSection')}
        </Text>
        <View className="flex-row flex-wrap" style={{ gap: 10 }}>
          {LANGUAGES.map((lang) => {
            const selected = i18n.language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                onPress={() => setAppLanguage(lang.code)}
                activeOpacity={0.8}
                className="rounded-full px-5 py-2.5"
                style={{
                  backgroundColor: selected ? colors.primaryLight : colors.cardMuted,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.line,
                }}>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: selected ? colors.primary : colors.ink }}>
                  {lang.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Appearance */}
        <Text
          className="mb-2 mt-6 text-xs font-semibold uppercase"
          style={{ color: colors.inkSoft, letterSpacing: 0.5 }}>
          {t('preferences.themeSection')}
        </Text>
        <View className="flex-row" style={{ gap: 12 }}>
          {themeOptions.map((opt) => {
            const selected = activeMode === opt.mode;
            return (
              <TouchableOpacity
                key={opt.mode}
                onPress={() => setTheme(opt.mode)}
                activeOpacity={0.8}
                className="flex-1 items-center rounded-2xl py-4"
                style={{
                  backgroundColor: selected ? colors.primaryLight : colors.cardMuted,
                  borderWidth: 1,
                  borderColor: selected ? colors.primary : colors.line,
                }}>
                <Ionicons
                  name={opt.icon}
                  size={24}
                  color={selected ? colors.primary : colors.inkMuted}
                />
                <Text
                  className="mt-2 text-sm font-semibold"
                  style={{ color: selected ? colors.primary : colors.ink }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue */}
        <TouchableOpacity
          onPress={onDone}
          activeOpacity={0.85}
          className="mt-7 items-center rounded-2xl py-4"
          style={{ backgroundColor: colors.primary }}>
          <Text className="text-base font-semibold" style={{ color: colors.onPrimary }}>
            {t('preferences.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
