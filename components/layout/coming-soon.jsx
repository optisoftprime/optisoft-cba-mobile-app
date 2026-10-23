import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import Header from 'components/header';
import TouchBtn from 'components/touchBtn';
import { navigateBack } from 'app/navigate';
import { isEnabled } from 'config/features';
import { useTheme } from 'config/ThemeContext';

/**
 * What a switched-off feature's screen shows instead of itself (see
 * config/features.js). The screen's own code stays as it is, ready for when the
 * backend is live; it just never renders while the feature is off.
 */
export function ComingSoon({ title }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="flex-1 bg-background">
      <Header title={title ?? ''} onLeftPress={() => navigateBack('appLayout')} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-light">
          <Ionicons name="time-outline" size={36} color={colors.primary} />
        </View>
        <Text className="mt-5 text-center text-[18px] font-bold text-ink">
          {t('common.comingSoonTitle')}
        </Text>
        <Text className="mt-2 text-center text-[14px] leading-5 text-ink-muted">
          {t('common.comingSoonMessage')}
        </Text>
      </View>
      <TouchBtn
        label={t('common.back')}
        onPress={() => navigateBack('appLayout')}
        containerClassName="px-4 pb-8"
      />
    </View>
  );
}

/**
 * Wrap a screen's default export so it renders <ComingSoon /> while `feature` is
 * off:   export default withFeature('liveChat', LiveChat);
 */
export function withFeature(feature, Screen) {
  function FeatureScreen(props) {
    return isEnabled(feature) ? <Screen {...props} /> : <ComingSoon />;
  }
  FeatureScreen.displayName = `withFeature(${feature})`;
  return FeatureScreen;
}
