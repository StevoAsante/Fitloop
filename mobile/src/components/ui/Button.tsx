import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';

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
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? Colors.card : Colors.dusk} />
      ) : (
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.dusk,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.mist,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...Type.label,
    fontSize: 15,
  },
  labelPrimary: {
    color: Colors.card,
  },
  labelSecondary: {
    color: Colors.ink,
  },
});
