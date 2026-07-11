import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Colors, Spacing, Type } from '@/constants/theme';
import type { CoachMessage } from '@/lib/api';

type CoachMessageCardProps = {
  message: CoachMessage;
};

// Deliberately no icon, no exclamation mark, no red or amber. The whole
// point from the brief is that this shouldn't read as an alert, a coach
// message is closer in tone to a friend mentioning something than a
// system warning, so it gets the warm "dawn" tone rather than anything
// that reads as urgent.
export function CoachMessageCard({ message }: CoachMessageCardProps) {
  return (
    <Card tone="dawn" style={styles.card}>
      <Text style={styles.eyebrow}>From your coach</Text>
      <Text style={styles.headline}>{message.headline}</Text>
      <Text style={styles.detail}>{message.detail}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.xs,
  },
  eyebrow: {
    ...Type.label,
    color: Colors.ink,
  },
  headline: {
    ...Type.body,
    color: Colors.ink,
    fontWeight: '600',
  },
  detail: {
    ...Type.caption,
  },
});
