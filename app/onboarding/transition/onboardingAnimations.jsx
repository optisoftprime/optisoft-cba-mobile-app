// animations/onboardingAnimations.js
import { useRef, useEffect, useState } from 'react';
import { Animated } from 'react-native';

// Drives the onboarding slide transition WITHOUT the flash QA reported.
//
// The flicker came from the screen rendering pageData[currentIndex] directly:
// tapping Next bumped currentIndex, so the NEW image + text painted at full
// opacity for one frame, then the effect faded them out and back in.
//
// Fix: the currently-VISIBLE slide is `displayIndex`, which we only advance
// while the content is invisible (opacity 0), in the fade-out completion
// callback. So the old slide fades/slides out, the swap happens off-screen,
// then the new slide fades/slides in from the side. No paint of new content
// at full opacity — no flicker.
export const useOnboardingAnimation = (currentIndex) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // The slide actually shown on screen. The screen renders pageData[displayIndex].
  const [displayIndex, setDisplayIndex] = useState(currentIndex);
  const displayRef = useRef(currentIndex);

  useEffect(() => {
    if (displayRef.current === currentIndex) return;

    const direction = currentIndex > displayRef.current ? 1 : -1;

    // Phase 1 — fade + slide the OLD slide out (short, so it feels responsive).
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction * -36,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      // Interrupted by a newer tap — let the newer effect run own the swap.
      if (!finished) return;

      // Swap content while fully invisible, and pre-position the new slide
      // just off the opposite edge so it can glide into place.
      displayRef.current = currentIndex;
      setDisplayIndex(currentIndex);
      slideAnim.setValue(direction * 36);

      // Phase 2 — fade + spring the NEW slide in (a touch longer + spring for
      // a smooth, professional settle instead of a hard stop).
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [currentIndex, slideAnim, fadeAnim]);

  return {
    slideAnim,
    fadeAnim,
    displayIndex,
  };
};
