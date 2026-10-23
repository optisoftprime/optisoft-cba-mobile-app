// app/hooks/useIsMounted.js
//
// Returns a stable getter that reports whether the component is still mounted.
// Guard any navigation / Toast / setState that runs AFTER an `await` with it, so
// a request that resolves once the user has already left the screen can't fire a
// "ghost" navigation (e.g. login completing after the user went back, yanking
// them to the home screen):
//
//   const isMounted = useIsMounted();
//   const res = await someApi();
//   if (!isMounted()) return;   // user navigated away — do nothing
//   navigateTo('somewhere');
//
import { useRef, useEffect, useCallback } from 'react';

export function useIsMounted() {
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  return useCallback(() => mountedRef.current, []);
}
