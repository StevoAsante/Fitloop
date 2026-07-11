import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'dawn' | 'moss';
};

// tone exists so the coach's own messages (dawn) and streak-positive
// moments (moss) can sit in a card that's visually distinct from a plain
// data card, without every screen re-deriving those colours itself.
const TONE_BACKGROUNDS = {
  default: Colors.card,
  dawn: Colors.dawnSoft,
  moss: Colors.mossSoft,
};

export function Card({ children, style, tone = 'default' }: CardProps) {
  return (
    <View style={[styles.base, { backgroundColor: TONE_BACKGROUNDS[tone] }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
});
