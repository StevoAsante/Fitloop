// ------------------------------------------------------
// Card.tsx — Surface Container
// ------------------------------------------------------
// The base surface almost everything else sits on top of.
// tone="accent" pulls whichever prestige colour is active
// rather than a fixed one, so a coach message card always
// matches the rest of that person's app
// ------------------------------------------------------

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

type CardProps = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'accent' | 'attention';
};

export function Card({ children, style, tone = 'default' }: CardProps) {
  const { accent } = useTheme();

  const backgroundColor =
    tone === 'accent' ? accent.soft : tone === 'attention' ? Colors.attentionSoft : Colors.card;

  return <View style={[styles.base, { backgroundColor }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    padding: Spacing.md,
    // A soft lift rather than a hard drop shadow, cards should feel
    // like they're resting on the background, not cut out of it.
    shadowColor: Colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
});
