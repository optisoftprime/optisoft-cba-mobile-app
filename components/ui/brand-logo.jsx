import { Image, Text, View } from 'react-native';

import { brand } from 'config/brand';
import { useTheme } from 'config/ThemeContext';

/**
 * The app's logo, driven by `config/brand.js` (ported from cba-agent-app's
 * ui/brand-logo). Every screen that shows the logo uses this, so a rebrand is
 * a change to brand.js and nothing else.
 *
 * `size` is the logo's HEIGHT. The width comes from the asset's own aspect
 * ratio, read at runtime — a square mark and a wide lockup both render
 * correctly. Squeezing a wide lockup into a fixed box is how a logo ends up
 * looking shrunken and off-centre.
 *
 * `on` says what the logo sits on, which decides the file:
 *   'surface' — a normal screen background: dark wordmark in light mode,
 *               white wordmark in dark mode (the default)
 *   'brand'   — the brand colour or a photo (login, welcome back): always the
 *               white wordmark, in both themes
 *   'light'   — something that stays white in both themes (a printed receipt,
 *               a white badge): always the dark wordmark
 *
 * With no `logo` set in brand.js it falls back to a monogram of `appName`, so
 * the logo slot is never blank.
 */
const MONOGRAM_TONES = {
  surface: { mark: 'bg-primary', letter: 'text-on-primary', name: 'text-ink' },
  brand: { mark: 'bg-on-primary', letter: 'text-primary', name: 'text-on-primary' },
  light: { mark: 'bg-primary', letter: 'text-on-primary', name: 'text-ink' },
};

export function BrandLogo({ size = 48, on = 'surface', showName = true, style }) {
  const { isDark } = useTheme();

  const useWhiteWordmark = on === 'brand' || (on === 'surface' && isDark);
  const source = brand.logo ? (useWhiteWordmark ? brand.logo.dark : brand.logo.light) : null;

  // resolveAssetSource gives the asset's real pixel dimensions, so the aspect
  // ratio follows whatever file brand.js points at.
  const asset = source ? Image.resolveAssetSource(source) : null;
  const aspect = asset?.width && asset?.height ? asset.width / asset.height : 1;

  if (source) {
    return (
      <Image
        source={source}
        // maxWidth so a wide lockup shrinks to fit a narrow space rather than
        // running off the edge; `contain` keeps the aspect while it does.
        style={[{ width: size * aspect, height: size, maxWidth: '100%' }, style]}
        resizeMode="contain"
        accessibilityLabel={brand.appName}
      />
    );
  }

  const { mark, letter, name } = MONOGRAM_TONES[on] ?? MONOGRAM_TONES.surface;

  return (
    <View className="items-center" style={style}>
      <View
        style={{ width: size, height: size, borderRadius: size / 2 }}
        className={`items-center justify-center ${mark}`}>
        <Text style={{ fontSize: size * 0.44 }} className={`font-bold ${letter}`}>
          {brand.appName.charAt(0).toUpperCase()}
        </Text>
      </View>

      {showName ? (
        <Text className={`mt-4 text-[15px] font-bold tracking-[3px] ${name}`}>
          {brand.appName.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}
