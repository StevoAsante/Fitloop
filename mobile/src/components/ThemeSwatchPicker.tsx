// ------------------------------------------------------
// ThemeSwatchPicker.tsx — Prestige Colour Picker
// ------------------------------------------------------
// A row of tappable swatches for choosing a prestige
// colour. Used in the register flow (before an account
// exists, so it just calls onSelect) and again in
// Settings (same component, different screen)
// ------------------------------------------------------

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Colors, PRESTIGE_TONES, Spacing, Type, type PrestigeKey } from '@/constants/theme';

type ThemeSwatchPickerProps = {
  selected: PrestigeKey;
  onSelect: (key: PrestigeKey) => void;
};

export function ThemeSwatchPicker({ selected, onSelect }: ThemeSwatchPickerProps) {
  const activeTone = PRESTIGE_TONES.find((tone) => tone.key === selected) ?? PRESTIGE_TONES[0];

  return (
    <View>
      <View style={styles.row}>
        {PRESTIGE_TONES.map((tone) => {
          const isSelected = tone.key === selected;
          return (
            <Pressable
              key={tone.key}
              onPress={() => onSelect(tone.key)}
              // Bigger than the visible circle, a 44px swatch on its
              // own is a bit mean to tap accurately on a real phone.
              hitSlop={8}
              style={styles.swatchWrapper}
            >
              <View style={[styles.swatch, { backgroundColor: tone.base }, isSelected && styles.swatchSelected]}>
                {isSelected && <Feather name="check" size={18} color="#FFFFFF" />}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.activeLabel}>{activeTone.label}</Text>
    </View>
  );
}

const SWATCH_SIZE = 44;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  swatchWrapper: {
    alignItems: 'center',
  },
  swatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: Colors.ink,
  },
  activeLabel: {
    ...Type.label,
    color: Colors.inkSoft,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
