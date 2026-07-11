import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.inkSoft}
        autoCapitalize="none"
        autoCorrect={false}
        {...inputProps}
      />
      {/* Reserving space for the error message even when there isn't one
          would keep layout perfectly stable, but for a two or three
          field form that's not worth the extra empty space it costs on
          a small screen, so it's conditional and the form just shifts
          slightly when a field goes invalid. */}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    ...Type.label,
    color: Colors.inkSoft,
  },
  input: {
    ...Type.body,
    color: Colors.ink,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.mist,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  error: {
    ...Type.caption,
    color: Colors.danger,
  },
});
