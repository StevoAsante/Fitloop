// ------------------------------------------------------
// CoachMessageCard.tsx — A Note From The Coach
// ------------------------------------------------------
// Renders one message from the rule-based coach. Styled
// to feel like a note from someone who's on your side,
// not a system warning, see the comment below on why
// there's still no red, amber, or exclamation mark here
// ------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';
import type { CoachMessage } from '@/lib/api';

type CoachMessageCardProps = {
  message: CoachMessage;
};

// Deliberately no red, no amber, no exclamation mark. The brief is
// explicit that this shouldn't read as an alert, a coach message is
// closer in tone to a friend mentioning something than a system
// warning, so it takes the person's own prestige colour, the same
// tone their streak seal uses, rather than a separate "warning" look.
// The icon is a speech bubble, not a triangle, for the same reason.
export function CoachMessageCard({ message }: CoachMessageCardProps) {
  const { accent } = useTheme();

  return (
    <Card tone="accent" style={styles.card}>
      <View style={styles.eyebrowRow}>
        <View style={[styles.iconChip, { backgroundColor: accent.base }]}>
          <Feather name="message-circle" size={13} color="#FFFFFF" />
        </View>
        <Text style={[styles.eyebrow, { color: accent.deep }]}>From your coach</Text>
      </View>
      <Text style={styles.headline}>{message.headline}</Text>
      <Text style={styles.detail}>{message.detail}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  iconChip: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    ...Type.label,
  },
  headline: {
    ...Type.display,
    fontSize: 18,
    color: Colors.ink,
  },
  detail: {
    ...Type.caption,
  },
});
