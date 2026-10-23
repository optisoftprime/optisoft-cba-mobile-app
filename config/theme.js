// config/theme.js
//
// LEGACY. A static, light-only copy of the palette for the screens that still
// import `Colors` instead of calling useTheme(). It is derived from
// config/brand.js so those screens match the new theme, but it cannot follow
// dark mode — move a screen to `const { colors } = useTheme()` when you touch it.
const { light } = require('./brand');

export const Colors = {
  primary: light.primary,
  secondary: light.primaryDark,
  accent: light.primaryLight,
  fade: light.primaryLight,
  background: light.background,
  text: light.ink,
  buttonText: light.onPrimary,
  splashScreenBgColor: light.primaryLight,
  gradient: [light.panelFrom, light.panelTo],
  warning: light.warning,
  warningFade: light.warningSoft,
};
