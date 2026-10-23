// screens/FaceID.jsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { withFeature } from 'components/layout/coming-soon';

function ScanCode() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleVerify = () => {
    // Handle face ID verification
    navigateTo('positionFace');
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={t('scan.title')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
        leftIconColor={colors.textPrimary}
      />

      <View className="flex-1 items-center justify-between px-6 pb-8 pt-12">
        {/* Face ID Frame */}
        <View className="flex-1 items-center justify-center">
          <View className="relative h-64 w-64 items-center justify-center">
            {/* Top Left Corner */}
            <View className="absolute left-0 top-0">
              <Svg width="60" height="60" viewBox="0 0 60 60">
                <Path
                  d="M 10 0 Q 0 0 0 10 L 0 50"
                  stroke={colors.primary}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            {/* Top Right Corner */}
            <View className="absolute right-0 top-0">
              <Svg width="60" height="60" viewBox="0 0 60 60">
                <Path
                  d="M 50 0 Q 60 0 60 10 L 60 50"
                  stroke={colors.primary}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            {/* Bottom Left Corner */}
            <View className="absolute bottom-0 left-0">
              <Svg width="60" height="60" viewBox="0 0 60 60">
                <Path
                  d="M 0 10 L 0 50 Q 0 60 10 60"
                  stroke={colors.primary}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>

            {/* Bottom Right Corner */}
            <View className="absolute bottom-0 right-0">
              <Svg width="60" height="60" viewBox="0 0 60 60">
                <Path
                  d="M 60 10 L 60 50 Q 60 60 50 60"
                  stroke={colors.primary}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
              </Svg>
            </View>
          </View>

          {/* Text Content */}
          <View className="mt-8 items-center">
            <Text className="mb-3 text-xl font-bold" style={{ color: colors.primary }}>
              {t('scan.qrTitle')}
            </Text>

            <Text className="text-center text-sm" style={{ color: colors.textSecondary }}>
              {t('scan.line1')}
            </Text>

            <Text className="text-center text-sm" style={{ color: colors.textSecondary }}>
              {t('scan.line2')}
            </Text>
          </View>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          onPress={handleVerify}
          className="w-full rounded-lg py-4"
          style={{ backgroundColor: colors.border }}
          disabled={true}
          activeOpacity={0.8}>
          <Text
            className="text-center text-base font-semibold italic"
            style={{ color: colors.textMuted }}>
            {t('scan.comingSoon')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('scanToPay', ScanCode);
