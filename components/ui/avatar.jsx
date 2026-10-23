import { Image, Text, View } from 'react-native';

/** "Adebayo Musa" → "AM"; "Grace" → "G". */
export function initialsOf(name = '') {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

const TONES = {
  /** On a light surface — the list rows. */
  brand: { box: 'bg-primary-light', text: 'text-primary-dark' },
  /** On the brand banner, where the background is already the primary colour. */
  inverse: { box: 'bg-on-primary/25', text: 'text-on-primary' },
};

export function Avatar({ name = '', uri, tone = 'brand', size = 44, className = '' }) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dimensions} className={className} />;
  }

  const { box, text } = TONES[tone] ?? TONES.brand;

  return (
    <View style={dimensions} className={`items-center justify-center ${box} ${className}`}>
      <Text className={`text-[15px] font-semibold ${text}`}>{initialsOf(name)}</Text>
    </View>
  );
}
