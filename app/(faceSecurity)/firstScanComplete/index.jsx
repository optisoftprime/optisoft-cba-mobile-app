// screens/FirstScanCompleted.jsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { withFeature } from 'components/layout/coming-soon';

function FirstScanCompleted() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleContinue = () => {
    // Navigate to second scan
    console.log('Continue to second scan');
  };

  return (
    <View className="flex-1 bg-background px-6">
      <View className="flex-1 items-center justify-center">
        {/* Success Icon */}
        <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-success-soft">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-success">
            <Ionicons name="checkmark" size={36} color={colors.card} strokeWidth={3} />
          </View>
        </View>

        {/* Title */}
        <Text className="mb-3 text-center text-[22px] font-bold text-ink">
          {t('face.firstScanTitle')}
        </Text>

        {/* Description */}
        <Text className="text-center text-sm leading-6 text-ink-muted">
          {t('face.firstScanMessage')}
        </Text>
      </View>

      {/* Continue Button */}
      <View className="pb-8">
        <TouchableOpacity
          onPress={handleContinue}
          className="w-full rounded-xl bg-primary py-4"
          activeOpacity={0.8}>
          <Text className="text-center text-[15px] font-semibold text-on-primary">
            {t('face.continue')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('scanToPay', FirstScanCompleted);
