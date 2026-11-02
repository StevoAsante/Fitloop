// ------------------------------------------------------
// MiniChart.tsx — Small Bar Chart
// ------------------------------------------------------
// Bars for a short series, like estimated 1RM over the
// last dozen sessions. Heights are relative to the
// largest value so the shape is what you read, the exact
// numbers sit underneath. Built from Views for the same
// reason as the heatmap, one implementation that behaves
// the same on every platform
// ------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

type MiniChartProps = {
  values: number[];
  labels?: string[];
  height?: number;
};

export function MiniChart({ values, labels, height = 90 }: MiniChartProps) {
  const { accent } = useTheme();

  if (values.length === 0) {
    return <Text style={styles.empty}>Nothing logged yet.</Text>;
  }

  const max = Math.max(...values, 1);

  return (
    <View>
      <View style={[styles.row, { height }]}>
        {values.map((value, index) => (
          <View key={index} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                {
                  height: Math.max(4, (value / max) * height),
                  // Latest bar gets the full colour, older ones fade, so
                  // the eye lands on where you are now.
                  backgroundColor: accent.base,
                  opacity: index === values.length - 1 ? 1 : 0.45,
                },
              ]}
            />
          </View>
        ))}
      </View>
      {labels ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{labels[0]}</Text>
          <Text style={styles.label}>{labels[labels.length - 1]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: Radius.sm / 2, width: '100%' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  label: { ...Type.caption },
  empty: { ...Type.body, color: Colors.inkSoft },
});
