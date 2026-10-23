// config/ThemeContext.jsx
//
// App-wide theme provider, ported from cba-agent-app's theme-provider. Owns the
// active palette and publishes it three ways:
//   1. as CSS variables on a root <View>, so every `bg-*`/`text-*`/`border-*`
//      class generated from config/brand.js resolves to the current theme;
//   2. as raw hex through `useTheme().colors`, for props that take a real
//      colour (Ionicons `color`, placeholderTextColor, navigator options);
//   3. as `useTheme().shadows` — ready-made RN boxShadow styles: style={shadows.md}.
//
//   const { colors, shadows, isDark, mode, setMode, toggleTheme } = useTheme();
//
// The palette lives in config/brand.js; config/colors.js adds the older token
// names (textPrimary, border, …) so screens written before the port still work.
//
// Caveat: the variables travel down the React tree, so anything rendered into a
// separate host tree (a bare RN <Modal>) loses them — style that subtree from
// `colors`, not classes.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, View } from 'react-native';
import { vars } from 'nativewind';

import { brand, hexToRgbChannels, shadows, toKebab, toShadowStyle } from 'config/brand';
import { lightColors, darkColors, constantColors } from 'config/colors';
import { save, load } from 'config/storage';

const ThemeContext = createContext(undefined);

// Persisted under this key via config/storage (AsyncStorage).
const THEME_KEY = 'themeMode';
const MODES = ['light', 'dark', 'system'];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Turn a palette into the `--color-*` variables Tailwind reads. */
function paletteToVars(colors) {
  return vars(
    Object.fromEntries(
      Object.entries(colors)
        // The legacy aliases include a non-hex scrim; only hex tokens become variables.
        .filter(([, value]) => HEX.test(value))
        .map(([token, hex]) => [`--color-${toKebab(token)}`, hexToRgbChannels(hex)])
    )
  );
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(brand.defaultThemeMode);
  const [systemScheme, setSystemScheme] = useState(() => Appearance.getColorScheme() ?? 'light');
  // Optional forced palette (partial or full) — e.g. a branded takeover screen.
  const [override, setOverride] = useState(null);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme ?? 'light');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await load(THEME_KEY);
      if (saved && MODES.includes(saved)) setModeState(saved);
    })();
  }, []);

  const scheme = mode === 'system' ? systemScheme : mode;
  const isDark = scheme === 'dark';

  const colors = useMemo(
    () => ({ ...(isDark ? darkColors : lightColors), ...constantColors, ...override }),
    [isDark, override]
  );

  const themeVars = useMemo(() => paletteToVars(colors), [colors]);

  const themeShadows = useMemo(() => {
    const spec = isDark ? shadows.dark : shadows.light;
    return Object.fromEntries(
      Object.entries(spec).map(([level, value]) => [level, toShadowStyle(value)])
    );
  }, [isDark]);

  const setMode = useCallback(async (next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    await save(THEME_KEY, next);
  }, []);

  const toggleTheme = useCallback(() => setMode(isDark ? 'light' : 'dark'), [isDark, setMode]);

  // Kept for the existing settings screens, which call setTheme('dark' | 'light').
  const setTheme = setMode;

  const applyOverride = useCallback((colorObj) => setOverride(colorObj), []);
  const clearOverride = useCallback(() => setOverride(null), []);

  const value = useMemo(
    () => ({
      colors,
      shadows: themeShadows,
      isDark,
      scheme,
      mode,
      setMode,
      setTheme,
      toggleTheme,
      applyOverride,
      clearOverride,
    }),
    [
      colors,
      themeShadows,
      isDark,
      scheme,
      mode,
      setMode,
      setTheme,
      toggleTheme,
      applyOverride,
      clearOverride,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>
      {/* An explicit background: anything NOT covered by a screen (a navigator's
          gap during a transition) would otherwise be bare white, which flashes
          on every push in dark mode. */}
      <View style={[themeVars, { flex: 1, backgroundColor: colors.background }]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
