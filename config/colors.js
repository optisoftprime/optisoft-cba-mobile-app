// config/colors.js
//
// The palette itself now lives in config/brand.js (the same swap file the
// cba-agent-app uses). This file only maps it onto the token names the older
// screens were written against, so they follow the new theme without being
// rewritten:
//
//   textPrimary → ink          textSecondary → inkMuted   textMuted → inkSoft
//   border      → line         cardBackground → card      error     → danger
//
// New code should use the brand.js names (colors.ink, colors.line, …) or the
// Tailwind classes (text-ink, border-line, …) instead of these aliases.
//
// Never write a hex value here — change config/brand.js.
const { light, dark } = require('./brand');

function withLegacyAliases(palette, { isDark = false } = {}) {
  return {
    ...palette,

    // Surfaces
    surface: palette.card,
    cardBackground: palette.card,
    splashBackground: palette.background,

    // Text
    textPrimary: palette.ink,
    textSecondary: palette.inkMuted,
    textMuted: palette.inkSoft,

    // Lines / brand
    border: palette.line,
    secondary: palette.primaryDark,
    // A see-through primaryDark (B3 ≈ 70%), as before the port: it rings the
    // primary icon circles and is the middle stop of the onboarding gradient.
    accent: `${palette.primaryDark}B3`,

    // Status
    error: palette.danger,

    // Scrim over the landing hero photo. Heavier in dark mode so the bright
    // room photo doesn't glare out of a dark screen. Not a palette colour:
    // it is black at an opacity, not a hex token.
    heroOverlay: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.45)',
  };
}

export const lightColors = withLegacyAliases(light);
export const darkColors = withLegacyAliases(dark, { isDark: true });

// Identical across themes.
export const constantColors = {
  white: '#FFFFFF',
  black: '#000000',
};
