// screens/AccountSecured.jsx
import React, { useCallback } from 'react';
import { View, Text, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigateReplace } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { GlobalStatusBar } from 'config/statusBar';

export default function AccountSecured() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();

  const handleContinue = () => {
    if (params?.nextScreen) {
      navigateReplace(params.nextScreen);
    } else {
      navigateReplace('landingScreen');
    }
  };

  const handleBack = () => {
    if (params?.backScreen) {
      navigateReplace(params.backScreen);
    } else {
      navigateReplace('landingScreen');
    }
  };

  // add inside component
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleBack();
        return true;
      });
      return () => backHandler.remove();
    }, [])
  );

  return (
    <View className="flex-1 items-center justify-center bg-background px-8">
      <GlobalStatusBar style="dark-content" />

      {/* Success Icon */}
      <View className="mb-8">
        <View className="h-32 w-32 items-center justify-center rounded-full bg-success-soft">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-success">
            <Ionicons name="checkmark" size={44} color={colors.onPrimary} />
          </View>
        </View>
      </View>

      {/* Success Message */}
      <Text className="mb-16 px-4 text-center text-[15px] leading-6 text-ink-muted">
        {params?.message || 'Action completed successfully'}
      </Text>

      {/* Buttons */}
      <View className="absolute bottom-6 left-8 right-8">
        <TouchBtn
          onPress={handleContinue}
          label={params?.nextScreen ? 'Continue' : 'Go to Dashboard'}
          textClassName="text-base font-semibold"
          buttonClassName="items-center rounded-lg py-4"
          activeOpacity={0.8}
          containerClassName=""
        />
      </View>
    </View>
  );
}
