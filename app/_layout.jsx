// app/_layout.jsx
import 'config/nativewind-interop';
import { useEffect, useMemo } from 'react';
import { Platform, AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { ThemeProvider, useTheme } from 'config/ThemeContext';
import { initAppLanguage } from 'config/i18n';
import { RouteTracker } from 'app/navigate';

export const queryClient = new QueryClient();

// BaseToast/ErrorToast default to a FIXED ~60px height, which clips the 2nd/3rd
// line even when text2NumberOfLines lets the text wrap. Overriding height to
// auto (undefined) + a minHeight + vertical padding lets the toast grow so a
// full 3-line message (e.g. a KYC upgrade failure reason) is actually visible.
//
// Toasts are themed: the library's default is a white card in BOTH themes,
// which flashed as a white box on dark-mode screens. The surface, text and the
// accent stripe all come from the active palette, so they follow the theme —
// including a switch made in Settings while the app is open.
const toastContentStyle = { paddingHorizontal: 14, paddingVertical: 2 };

function buildToastConfig(colors) {
  const rowStyle = (borderLeftColor) => ({
    borderLeftColor,
    backgroundColor: colors.card,
    height: undefined,
    minHeight: 60,
    paddingVertical: 10,
  });
  const text1Style = { color: colors.ink, fontSize: 14, fontWeight: '700' };
  const text2Style = { color: colors.inkMuted, fontSize: 13 };
  const common = {
    text1NumberOfLines: 2,
    text2NumberOfLines: 3,
    contentContainerStyle: toastContentStyle,
    text1Style,
    text2Style,
  };

  return {
    success: (props) => <BaseToast {...props} {...common} style={rowStyle(colors.success)} />,
    error: (props) => <ErrorToast {...props} {...common} style={rowStyle(colors.danger)} />,
    info: (props) => <BaseToast {...props} {...common} style={rowStyle(colors.info)} />,
  };
}

/** The toast host, inside ThemeProvider so it can read the live palette. */
function ThemedToast() {
  const { colors } = useTheme();
  const config = useMemo(() => buildToastConfig(colors), [colors]);
  return <Toast config={config} />;
}

// Hide the Android system navigation bar (the on-screen back / home / recent
// buttons at the bottom of the phone). It clashes with the app's own design,
// so we push the app into immersive mode.
//
// This only applies to Android — iOS has no such software nav bar, so the
// calls are skipped there.
function useHideNavigationBar() {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const hide = () => {
      try {
        // SDK 57 API (as cba-agent-app uses). setBehaviorAsync no longer exists
        // and setVisibilityAsync is deprecated — the old calls threw here, so
        // the bar was never re-hidden after the app came back to the
        // foreground. A swipe from the edge still reveals it temporarily.
        NavigationBar.setHidden(true);
      } catch (e) {
        // Non-fatal: on some Android versions / edge-to-edge configs these
        // APIs are no-ops. We don't want to crash the app over cosmetics.
        console.warn('Failed to hide navigation bar:', e);
      }
    };

    hide();

    // Android restores the nav bar when the app is backgrounded (or after
    // certain system interactions), so re-hide it every time we come back to
    // the foreground.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') hide();
    });

    return () => subscription.remove();
  }, []);
}

export default function Layout() {
  useHideNavigationBar();

  // Resolve the saved / device language once at startup (i18n is initialised on
  // import with an English default, so the UI already renders before this runs).
  useEffect(() => {
    initAppLanguage();
  }, []);

  return (
    <KeyboardProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          {/* SDK 54 kept the Android status bar hidden+immersive via app.json
              ("statusBar": { "hidden": true, ... }). The SDK 57 upgrade dropped
              that (edge-to-edge), which made the bar visible and let content draw
              under it (the "blue band" on onboarding, modals pinned to the top).
              Restore the hidden/immersive behavior globally at runtime. */}
          <ExpoStatusBar style="light" hidden />
          <RouteTracker />
          <Stack screenOptions={{ headerShown: false }} />
          <ThemedToast />
        </QueryClientProvider>
      </ThemeProvider>
    </KeyboardProvider>
  );
}

export const unstable_settings = {
  initialRouteName: 'index',
};
