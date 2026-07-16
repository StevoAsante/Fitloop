// ------------------------------------------------------
// Button.tsx — Primary / Secondary Button
// ------------------------------------------------------
// Pill-shaped, coloured with whichever prestige tone the
// signed-in person picked, rather than one fixed brand
// colour. Reads useTheme() itself so no screen has to
// remember to pass the current accent down by hand
// ------------------------------------------------------

import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
};

// Two variants only, on purpose. A third "tertiary" style always ends up
// getting reached for out of habit rather than because the screen
// actually needed another visual weight, add one later if a real screen
// asks for it.
export function Button({ label, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const { accent } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? { backgroundColor: accent.base } : styles.secondary,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && (isPrimary ? { backgroundColor: accent.deep } : styles.pressedSecondary),
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : accent.base} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : { color: accent.base }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.mist,
  },
  pressedSecondary: {
    backgroundColor: Colors.mist,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...Type.label,
    fontSize: 15,
  },
  labelPrimary: {
    color: '#FFFFFF',
  },
});
