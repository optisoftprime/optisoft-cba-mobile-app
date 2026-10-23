// screens/FaceIDPosition.jsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { withFeature } from 'components/layout/coming-soon';

function FaceIDPosition() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();

  const handleContinue = () => {
    // Handle continue action
    navigateTo('firstScanComplete');
  };

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('face.faceIdTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
      />

      <View className="flex-1 items-center justify-between px-6 pb-8 pt-12">
        {/* Face ID Icon */}
        <View className="flex-1 items-center justify-center">
          {/* Outer Circle */}
          <View className="mb-8 h-48 w-48 items-center justify-center rounded-full border-4 border-line bg-card">
            {/* Inner Rounded Square */}
            <View className="h-32 w-32 items-center justify-center rounded-3xl border-4 border-primary bg-primary-light">
              {/* Checkmark Circle */}
              <View className="h-16 w-16 items-center justify-center rounded-full bg-success">
                <Ionicons name="checkmark" size={32} color={colors.card} />
              </View>
            </View>
          </View>

          {/* Title */}
          <Text className="mb-2 text-center text-[22px] font-bold text-ink">
            {t('face.positionFaceTitle')}
          </Text>

          {/* Description */}
          <Text className="mb-4 text-center text-sm text-ink-muted">{t('face.positionLine1')}</Text>
          <Text className="mb-4 text-center text-sm text-ink-muted">{t('face.positionLine2')}</Text>

          {/* Tips Section */}
          <View
            className="mt-2 w-full rounded-2xl border border-line bg-card p-4"
            style={[{ width: 320 }, shadows.sm]}>
            <Text className="mb-2 text-sm font-semibold text-primary">{t('face.tipsLabel')}</Text>
            <View className="space-y-1">
              <View className="flex-row">
                <Text className="mr-2 text-sm text-ink-muted">•</Text>
                <Text className="flex-1 text-sm text-ink-muted">{t('face.tip1')}</Text>
              </View>
              <View className="flex-row">
                <Text className="mr-2 text-sm text-ink-muted">•</Text>
                <Text className="flex-1 text-sm text-ink-muted">{t('face.tip2')}</Text>
              </View>
              <View className="flex-row">
                <Text className="mr-2 text-sm text-ink-muted">•</Text>
                <Text className="flex-1 text-sm text-ink-muted">{t('face.tip3')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          onPress={handleContinue}
          className="w-full rounded-xl bg-primary py-4"
          activeOpacity={0.8}>
          <Text className="text-center text-[15px] font-semibold text-on-primary">
            {t('face.continue')}
          </Text>
        </TouchableOpacity>

        {/* Bottom Indicator */}
        <View className="mt-4 h-1 w-20 rounded-full bg-line" />
      </View>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('scanToPay', FaceIDPosition);
