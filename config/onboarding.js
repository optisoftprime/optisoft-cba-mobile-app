// Onboarding slides. Only the IMAGE and a translation `key` live here now —
// the title/text come from the locale files (locales/*.json → onboarding.<key>)
// so they can be translated. Add a slide by adding an image + key here and the
// matching `onboarding.<key>` entry in each locale file.
//
// The photos are TRANSPARENT cut-outs (no studio backdrop), so each slide sits on
// the screen's own background in both themes.
export const pageData = [
  { image: require('../assets/person-1.png'), key: 'slide1' },
  { image: require('../assets/person-2.png'), key: 'slide2' },
  { image: require('../assets/person-3.png'), key: 'slide3' },
];
