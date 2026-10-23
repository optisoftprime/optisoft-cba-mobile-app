import { useState, useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Measured on-screen keyboard height, in px. Returns 0 on iOS and whenever the
 * keyboard is closed; the live height on Android while it's open.
 *
 * Why this exists: an RN <Modal> on Android renders into its OWN window. With
 * this app's root <KeyboardProvider> (react-native-keyboard-controller) that
 * modal window does NOT get resized when the keyboard opens — nothing moves and
 * a <KeyboardAvoidingView> inside it has nothing to react to, so the input sits
 * UNDER the keyboard. We therefore measure the keyboard ourselves and the sheet
 * lifts by this amount.
 *
 * Usage — bottom sheets lift by it:
 *   const keyboardHeight = useKeyboardHeight();
 *   <View style={{ ...sheet, marginBottom: keyboardHeight }}>
 *
 * Centred dialogs pad the centring container instead, so the card re-centres in
 * the space that's left rather than sliding half-way up:
 *   <View style={{ flex: 1, justifyContent: 'center', paddingBottom: keyboardHeight }}>
 *
 * iOS is untouched — KeyboardAvoidingView with behavior="padding" works there,
 * so keep it enabled on iOS and let this return 0.
 *
 * NOTE: we used to skip measuring in Expo Go on the theory the OS resizes the
 * modal there — but in this app it does not (confirmed on-device: the sheet
 * stayed under the keyboard), so we always measure on Android.
 */
export default function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e?.endCoordinates?.height ?? 0)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return keyboardHeight;
}
