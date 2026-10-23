// screens/TwoFactorAuthentication.jsx
import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { withFeature } from 'components/layout/coming-soon';

function TwoFactorAuthentication() {
  const { colors, shadows } = useTheme();
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);

  const handleToggleTwoFactor = (value) => {
    navigateTo('selecttwoFa');
    setIsTwoFactorEnabled(value);
    console.log('Two Factor Authentication enabled:', value);
    // Implement 2FA setup here
  };

  return (
    <View className="flex-1 bg-background">
      <Header
        title="Two Factor Authentication"
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
      />

      <View className="mx-4 mt-2 rounded-2xl border border-line bg-card p-4" style={shadows.sm}>
        <View className="flex-row items-center justify-between">
          {/* Left Side - Icon and Text */}
          <View className="flex-1 flex-row items-center">
            <View className="mr-4 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
              <Ionicons name="mail-outline" size={22} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="mb-1 text-[15px] font-semibold text-ink">
                Enable Two Factor Authenti...
              </Text>
              <Text className="text-xs text-ink-muted">Set your 2 factor authentication</Text>
            </View>
          </View>

          {/* Right Side - Toggle Switch */}
          <Switch
            value={isTwoFactorEnabled}
            onValueChange={handleToggleTwoFactor}
            trackColor={{ false: colors.line, true: colors.primary }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.line}
          />
        </View>
      </View>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('twoFactor', TwoFactorAuthentication);
