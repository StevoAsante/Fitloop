/**
 * Design tokens for FitLoop.
 *
 * The brief is explicit that this app should feel gentle, not clinical
 * and not shouty, so the palette avoids both a sterile medical-app white
 * and an aggressive neon fitness-app look. Dusk (a muted indigo) is the
 * one saturated colour, used only for actions the person takes on
 * purpose. Dawn (a soft warm apricot) is reserved for the coach's own
 * voice, so a nudge always reads as a different kind of thing than a
 * button. Moss marks "on track" without needing a checkmark or a colour
 * as loud as pure green.
 *
 * Single theme for now, no dark mode yet. Adding one properly means
 * designing a second palette that doesn't just invert this one, that's
 * a follow-up once the core flows are working, not a toggle to bolt on
 * at the end.
 */

import { Platform } from 'react-native';

export const Colors = {
  ink: '#2B2A33',
  inkSoft: '#6B6A72',
  paper: '#F2F4EF',
  card: '#FFFFFF',
  dusk: '#5B6EC7',
  duskDeep: '#4655A8',
  dawn: '#E8A87C',
  dawnSoft: '#F6E4D3',
  moss: '#6E8F68',
  mossSoft: '#E1EBDD',
  mist: '#DDE1DC',
  danger: '#B5654F',
} as const;

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
  pill: 999,
} as const;

// Platform.select rather than one named font, since "system-ui" means
// something different, and looks more native, on each OS than forcing
// a single typeface everywhere would. No custom typeface bundled yet,
// see the note in the mobile README on why that's a deliberate cut for
// this pass rather than an oversight.
export const FontFamily = Platform.select({
  ios: { base: 'System' },
  android: { base: 'sans-serif' },
  default: { base: 'system-ui' },
});

export const Type = {
  display: { fontSize: 26, fontWeight: '700' as const, letterSpacing: -0.3 },
  title: { fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.1 },
  body: { fontSize: 16, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.2 },
  caption: { fontSize: 12, fontWeight: '400' as const, color: Colors.inkSoft },
};
