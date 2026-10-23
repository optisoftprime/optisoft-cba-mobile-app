// config/nativewind-interop.js
//
// NativeWind only turns `className` into styles for React Native's own
// components. A third-party component like expo-linear-gradient's
// LinearGradient silently IGNORES className unless it is registered here —
// which is how the onboarding gradient lost its `absolute bottom-0` and
// rendered as a band across the top of the photo, and how the rewards /
// savings-summary / open-account cards lost their padding and rounded corners.
//
// Imported once from app/_layout.jsx. Register any other third-party view that
// should accept className here.
import { cssInterop } from 'nativewind';
import { LinearGradient } from 'expo-linear-gradient';

cssInterop(LinearGradient, { className: 'style' });
