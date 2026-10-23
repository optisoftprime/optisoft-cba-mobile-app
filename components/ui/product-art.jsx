import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';

import { useTheme } from 'config/ThemeContext';

/**
 * The square tile beside a savings / loan product: the product's own image when
 * the backend sends one (`imageUrl`), otherwise an icon in the brand colour on
 * its soft tint.
 *
 * Drawn, not a bitmap: the old fallback was a dark navy PNG square, which sat as
 * a dark box on the light tile — and was the same for every client. An icon
 * follows the theme (light/dark) and the client's brand colour automatically.
 */
export function ProductArt({ imageUrl, icon = 'lock-closed', size = 112, className = 'mr-4' }) {
  const { colors } = useTheme();

  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-xl bg-primary-light ${className}`}
      style={{ width: size, height: size }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name={icon} size={Math.round(size * 0.4)} color={colors.primary} />
      )}
    </View>
  );
}
