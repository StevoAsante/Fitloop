// ------------------------------------------------------
// TextField.tsx — Labelled Text Input
// ------------------------------------------------------
// Label on top, optional error underneath. Border picks
// up the active prestige colour on focus so it's obvious
// which field has focus without relying on the cursor
// blink alone, keyboard users need that too, not just a
// nice-to-have for mouse/touch
// ------------------------------------------------------

import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, style, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const { accent } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error ? Colors.danger : isFocused ? accent.base : Colors.mist;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, { borderColor, borderWidth: isFocused ? 2 : 1 }, style]}
        placeholderTextColor={Colors.inkSoft}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
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
    paddingHorizontal: Spacing.md,
    // One less vertical pixel than the unfocused state gets a 2px
    // border, so the field doesn't visibly grow by a pixel each way
    // when it gains focus.
    paddingVertical: Spacing.sm + 3,
  },
  error: {
    ...Type.caption,
    color: Colors.danger,
  },
});
