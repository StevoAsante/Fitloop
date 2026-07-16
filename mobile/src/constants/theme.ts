// ------------------------------------------------------
// theme.ts — Design Tokens
// ------------------------------------------------------
// Colours, spacing, radius, and type scale for the whole
// app. Nothing here is a screen-specific style, if a
// value only gets used once it probably belongs in that
// screen's own StyleSheet instead of in here
// ------------------------------------------------------

import { Platform } from 'react-native';

// Base neutrals. Everything that ISN'T the user's chosen prestige
// colour lives here, background, text, card surfaces, and the two
// fixed semantic colours (attention and danger) that stay the same no
// matter which accent someone picks, so a flagged day always reads as
// "needs a look" and never gets mistaken for "this is going well".
export const Colors = {
  ink: '#211F2C',
  inkSoft: '#6B6976',
  paper: '#F7F5F0',
  card: '#FFFFFF',
  surface: '#1C1A24', // the dark card the streak seal sits on
  mist: '#E4E1E8', // empty / not logged yet
  attention: '#B8562E', // flagged day, e.g. a short night of sleep
  attentionSoft: '#F5E2D6',
  danger: '#9C3B3B',
} as const;

// The prestige accent set. This is the one bit of the palette a person
// actually chooses for themselves, at registration and again any time
// in Settings. Five jewel tones rather than a single house colour,
// each with a deep variant for pressed states and a soft tint for
// backgrounds, same shape as Colors.attention/attentionSoft above.
export type PrestigeKey = 'royal_purple' | 'emerald' | 'sapphire' | 'burgundy' | 'gold';

export type PrestigeTone = {
  key: PrestigeKey;
  label: string;
  base: string;
  deep: string;
  soft: string;
};

export const PRESTIGE_TONES: PrestigeTone[] = [
  { key: 'royal_purple', label: 'Royal Purple', base: '#5B2A86', deep: '#452069', soft: '#EEE3F6' },
  { key: 'emerald', label: 'Emerald', base: '#0F6B4C', deep: '#0B4F38', soft: '#DCF0E6' },
  { key: 'sapphire', label: 'Sapphire', base: '#1E4C8A', deep: '#163A69', soft: '#DDE8F6' },
  { key: 'burgundy', label: 'Burgundy', base: '#7A1F3D', deep: '#5C172E', soft: '#F4DEE6' },
  { key: 'gold', label: 'Gold', base: '#8A6D1E', deep: '#6B5417', soft: '#F6EED9' },
];

export const DEFAULT_PRESTIGE: PrestigeKey = 'royal_purple';

// Looks up a tone by key, falling back to the default rather than
// throwing, so a bad or missing value from the server never crashes
// the screen, worst case someone just sees royal purple until they
// pick again.
export function getPrestigeTone(key: string | null | undefined): PrestigeTone {
  return PRESTIGE_TONES.find((tone) => tone.key === key) ?? PRESTIGE_TONES[0];
}

// A small fixed scale rather than picking pixel values per screen, so
// spacing stays consistent without everyone having to remember "was it
// 12 or 14 here".
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// Three type families doing three different jobs rather than one
// font stretched to cover everything:
//  - Fraunces (a serif with a bit of swagger) carries the prestige
//    side of things, titles, the wordmark, the coach's own voice
//  - Big Shoulders Display, bold and condensed, is for the numbers
//    someone should read at a glance, streaks, weekly totals, the
//    kind of stat Strava would put in giant type on a results screen
//  - the system font stays on body copy and anything meant to be read
//    in paragraphs, it's tuned for legibility on each OS and there's
//    no reason to fight that for running text
// Both custom families get loaded in _layout.tsx via useFonts, screens
// don't render until that resolves, see the comment there for why.
export const FontFamily = {
  body: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
  display: 'Fraunces_600SemiBold',
  displayItalic: 'Fraunces_600SemiBold_Italic',
  displayBold: 'Fraunces_700Bold',
  stat: 'BigShouldersDisplay_800ExtraBold',
  statMedium: 'BigShouldersDisplay_600SemiBold',
};

export const Type = {
  wordmark: { fontFamily: FontFamily.displayItalic, fontSize: 32, letterSpacing: -0.5 },
  display: { fontFamily: FontFamily.display, fontSize: 26, letterSpacing: -0.2 },
  title: { fontFamily: FontFamily.display, fontSize: 19, letterSpacing: -0.1 },
  statHero: { fontFamily: FontFamily.stat, fontSize: 72, letterSpacing: -1.5, lineHeight: 72 },
  statSmall: { fontFamily: FontFamily.statMedium, fontSize: 22, letterSpacing: -0.3 },
  body: { fontFamily: FontFamily.body, fontSize: 16, fontWeight: '400' as const },
  label: { fontFamily: FontFamily.body, fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.3 },
  caption: { fontFamily: FontFamily.body, fontSize: 12, fontWeight: '400' as const, color: Colors.inkSoft },
};
