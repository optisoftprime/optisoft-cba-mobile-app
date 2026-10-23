import { Image } from 'react-native';

import { useTheme } from 'config/ThemeContext';

/**
 * A line-art illustration (the OTP phone, the password lady, …).
 *
 * The art is drawn for a light background: its outlines are near-black and
 * vanish on a dark screen. So each illustration ships a `darkSource` — the same
 * art with its outlines lightened (assets/illus-*-dark.png) — shown in dark
 * mode. Both are transparent, so neither ever draws a box behind the art.
 * Picked from the live theme, so switching it in Settings swaps them at once.
 */
export function Illustration({ source, darkSource, style, className, resizeMode = 'contain' }) {
  const { isDark } = useTheme();

  return (
    <Image
      source={isDark && darkSource ? darkSource : source}
      style={style}
      className={className}
      resizeMode={resizeMode}
    />
  );
}
