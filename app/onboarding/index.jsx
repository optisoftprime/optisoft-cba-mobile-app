import React, { useState, useEffect } from 'react';
import { View, Text, ImageBackground, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { pageData } from 'config/onboarding';
import { useOnboardingAnimation } from './transition/onboardingAnimations';
import { navigateBack, navigateTo } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { GlobalStatusBar } from 'config/statusBar';
import { save, load } from 'config/storage';
import FirstLaunchPreferences from 'components/FirstLaunchPreferences';
import { BrandLogo } from 'components/ui/brand-logo';

// Persisted once the first-launch language/theme popup has been dismissed.
const PREFS_CHOSEN_KEY = 'preferencesChosen';

export default function OnboardingWelcome() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showPrefs, setShowPrefs] = useState(false);
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // First time the app is EVER opened, prompt for language + appearance before
  // the user starts onboarding. Runs only until they dismiss it once.
  useEffect(() => {
    (async () => {
      const chosen = await load(PREFS_CHOSEN_KEY);
      if (!chosen) setShowPrefs(true);
    })();
  }, []);

  const dismissPrefs = async () => {
    setShowPrefs(false);
    try {
      await save(PREFS_CHOSEN_KEY, true);
    } catch {
      // non-fatal: worst case the popup shows again next cold start
    }
  };

  const { slideAnim, fadeAnim, displayIndex } = useOnboardingAnimation(currentIndex);

  const handleNext = () => {
    if (currentIndex < pageData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigateTo('landingScreen');
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) {
      navigateBack();
    } else {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Render the slide that's actually visible (displayIndex only advances once
  // the outgoing slide has faded out), so the content never flashes on tap.
  const currentData = pageData[displayIndex];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <GlobalStatusBar style={isDark ? 'white-content' : 'dark-content'} />

      {/* Back Button and logo sit straight on the background — no badge.
          They take the theme's colours (dark in light mode, white in dark
          mode), and what is behind them always matches: in light mode the
          photo's light top, in dark mode the background-removed photo on the
          dark screen, with the top edge faded into it. */}
      <TouchableOpacity
        className="absolute left-4 top-12 z-10 h-10 w-10 items-center justify-center"
        onPress={handleBack}
        disabled={currentIndex === 0}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}>
        <Ionicons
          name="arrow-back"
          size={26}
          color={currentIndex === 0 ? colors.textMuted : colors.textPrimary}
        />
      </TouchableOpacity>

      {/* Floating App Logo — transparent file, picked for the theme. */}
      <View className="absolute left-4 top-24 z-10">
        <BrandLogo size={30} />
      </View>

      {/* Animated Content */}
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }}>
        <ImageBackground source={currentData.image} className="flex-1" resizeMode="cover">
          {/* Gradient Overlay — pinned to the photo's bottom edge and ending in
              exactly the content block's colour, so the photo fades into the
              blue panel below with no seam. Positioned via style, not
              className: it must never fall back into normal flow, where it
              renders as a separate band across the top of the photo. */}
          <LinearGradient
            colors={['transparent', colors.accent, colors.secondary]}
            locations={[0, 0.6, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' }}
          />
        </ImageBackground>

        {/* Content Section with brand background */}
        <View className="px-6 pb-8 pt-6" style={{ backgroundColor: colors.secondary }}>
          <Text className="mb-3 text-3xl font-bold text-white">
            {t(`onboarding.${currentData.key}.title`)}
          </Text>

          <Text className="mb-6 text-base text-white">
            {t(`onboarding.${currentData.key}.text`)}
          </Text>

          {/* Pagination Dots and Next Button Row */}
          <View className="flex-row items-center justify-end px-4">
            {/* Pagination Dots (Centered) */}
            <View
              className={`absolute left-0 right-0 flex-row justify-center ${
                displayIndex === pageData.length - 1 ? 'mr-20' : 'mr-15'
              }`}>
              {pageData.map((_, index) => (
                <Animated.View
                  key={index}
                  style={{
                    width: index === displayIndex ? 32 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'white',
                    opacity: index === displayIndex ? 1 : 0.5,
                    marginHorizontal: 4,
                  }}
                />
              ))}
            </View>

            {/* Next Button (Right) */}
            <TouchableOpacity className="rounded-lg bg-white px-6 py-3" onPress={handleNext}>
              <Text className="text-base font-semibold" style={{ color: colors.primary }}>
                {displayIndex === pageData.length - 1
                  ? t('common.getStarted')
                  : `${t('common.next')} >`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* First-launch language + appearance chooser (one-time). */}
      {showPrefs && <FirstLaunchPreferences onDone={dismissPrefs} />}
    </View>
  );
}
