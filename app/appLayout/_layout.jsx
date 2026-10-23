import { Tabs } from 'expo-router';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { navigateTo } from 'app/navigate';
import Toast from 'react-native-toast-message';
import { useTicketReplyWatcher } from 'components/useTicketReplyWatcher';
import { isEnabled } from 'config/features';

// A switched-off feature's tab stays in place, faded, and explains itself on
// tap (config/features.js) — the same treatment as FeatureGate elsewhere.
const explainUnavailable = (t, feature) =>
  Toast.show({
    type: 'info',
    text1: t('dashboard.notAvailableTitle'),
    text2: t('dashboard.featureUnderDevelopment', { feature }),
  });

function ScanTabButton() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const enabled = isEnabled('scanToPay');

  return (
    <TouchableOpacity
      onPress={() => (enabled ? navigateTo('scanCode') : explainUnavailable(t, t('scan.title')))}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: enabled ? 1 : 0.5,
      }}
      activeOpacity={0.7}>
      <View
        style={[
          {
            backgroundColor: colors.primary,
            borderRadius: 999,
            width: 58,
            height: 58,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: Platform.OS === 'ios' ? 30 : 36,
          },
          shadows.md,
        ]}>
        <Ionicons name="scan" size={26} color={colors.onPrimary} />
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // App-wide (logged-in only) support-ticket reply watcher. Mounted here so it
  // spans the whole authenticated session and stops on logout. Gated + backoff +
  // AppState-paused — see components/useTicketReplyWatcher.
  useTicketReplyWatcher();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.cardBackground,
          height: Platform.OS === 'ios' ? 80 : 64,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
          paddingTop: 5,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="card"
        options={{
          title: t('tabs.card'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'card' : 'card-outline'} size={22} color={color} />
          ),
          // Off until config/features.js enables cards: faded, explains itself on tap.
          tabBarButton: ({ style, children, onPress }) => {
            const enabled = isEnabled('cards');
            return (
              <TouchableOpacity
                style={[style, { opacity: enabled ? 1 : 0.5 }]}
                activeOpacity={0.8}
                onPress={enabled ? onPress : () => explainUnavailable(t, t('tabs.card'))}>
                {children}
              </TouchableOpacity>
            );
          },
        }}
      />

      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarButton: (props) => <ScanTabButton {...props} />,
        }}
      />

      <Tabs.Screen
        name="support"
        options={{
          title: t('tabs.support'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'headset' : 'headset-outline'} size={22} color={color} />
          ),
          // no custom tabBarButton override — behaves like a normal active tab now
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
