// app/hooks/useBlockBackWhileBusy.js
//
// While `busy` is true, swallow the Android hardware back press so an in-flight,
// UN-CANCELLABLE backend operation (pay / transfer / booking / device remove)
// can't be interrupted — the backend can't cancel it, so letting the user leave
// just desyncs the UI from a request that still completes.
//
// Returning `false` when not busy lets the default back behaviour (or any other
// registered handler) run normally. Pair this with disabling the on-screen
// back/cancel button while busy (a blocked hardware-back alone still leaves the
// header arrow tappable).
//
//   useBlockBackWhileBusy(isSubmitting);
//
import { useCallback } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function useBlockBackWhileBusy(busy) {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => !!busy);
      return () => sub.remove();
    }, [busy])
  );
}
