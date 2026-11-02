// ------------------------------------------------------
// Heatmap.tsx — Training Calendar
// ------------------------------------------------------
// A grid of little squares, one per day, shaded by how
// many sessions happened. Plain Views rather than an SVG
// or chart library, so it renders identically on iOS,
// Android and web with nothing extra to install. Weeks run
// down the columns, Monday at the top, like the GitHub one
// ------------------------------------------------------

import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { localDateKey } from '@/lib/format';
import { useTheme } from '@/lib/theme-context';

type HeatmapProps = {
  counts: Record<string, number>;
  weeks?: number;
};

export function Heatmap({ counts, weeks = 12 }: HeatmapProps) {
  const { accent } = useTheme();

  // Start from the Monday `weeks - 1` weeks back so the final column is
  // always this week, even when it's only partly over.
  const today = new Date();
  const mondayOffset = (today.getDay() + 6) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - mondayOffset - (weeks - 1) * 7);

  const columns = [];
  for (let week = 0; week < weeks; week += 1) {
    const cells = [];
    for (let day = 0; day < 7; day += 1) {
      const cellDate = new Date(start);
      cellDate.setDate(start.getDate() + week * 7 + day);
      const key = localDateKey(cellDate);
      const isFuture = cellDate > today;
      const count = counts[key] ?? 0;

      cells.push(
        <View
          key={key}
          style={[
            styles.cell,
            {
              backgroundColor: isFuture ? 'transparent' : count === 0 ? Colors.mist : accent.base,
              opacity: count > 1 ? 1 : count === 1 ? 0.7 : 1,
            },
          ]}
        />,
      );
    }
    columns.push(
      <View key={week} style={styles.column}>
        {cells}
      </View>,
    );
  }

  return <View style={styles.grid}>{columns}</View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  column: { gap: 4 },
  cell: { width: 18, height: 18, borderRadius: 4 },
});
