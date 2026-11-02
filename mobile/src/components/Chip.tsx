// ------------------------------------------------------
// Chip.tsx — Selectable Pill
// ------------------------------------------------------
// Used for muscle-group filters, set types and the plan's
// mode switch. Filled with the active prestige colour when
// selected, outlined when not, so state never relies on
// colour alone, the filled/outlined difference reads fine
// for colour-blind users too
// ------------------------------------------------------

import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress: () => void;
};

export function Chip({ label, selected = false, onPress }: ChipProps) {
  const { accent } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.base, selected ? { backgroundColor: accent.base, borderColor: accent.base } : styles.idle]}
    >
      <Text style={[styles.label, { color: selected ? '#FFFFFF' : Colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  idle: {
    backgroundColor: 'transparent',
    borderColor: Colors.mist,
  },
  label: {
    ...Type.label,
  },
});
