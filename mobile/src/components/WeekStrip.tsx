// ------------------------------------------------------
// WeekStrip.tsx — This Week At A Glance
// ------------------------------------------------------
// Seven cells, one per day, coloured against the person's
// own sleep data. Built against the real calendar dates
// rather than whatever the API happened to return, see the
// comment further down for why that distinction matters
// ------------------------------------------------------

import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';
import type { DailyLogEntry } from '@/lib/api';

type WeekStripProps = {
  logs: DailyLogEntry[]; // whatever the API returned, gaps and all
};

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; // indexed by Date#getDay()

// A row of 7 cells rather than a line chart. A week is the unit the
// coach actually reasons in, three-night streaks, not raw numbers, so
// this maps directly onto that logic instead of asking the person to
// read a trend line to notice the same pattern the backend already found.
//
// Built against the real last 7 calendar dates rather than just
// right-aligning whatever array the API returned. A day someone forgot
// to log needs to show up as an empty cell in its actual place, not get
// quietly skipped so the row compresses to "the last 7 times they
// happened to log something", which would also throw off the day
// letters underneath each cell.
//
// Only sleep decides the colour here for now. Once the home screen has
// a way to switch which metric you're looking at, this should take the
// active metric as a prop instead of hardcoding sleep_hours.
export function WeekStrip({ logs }: WeekStripProps) {
  const { accent } = useTheme();
  const byDate = new Map(logs.map((log) => [log.date, log]));

  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  return (
    <View style={styles.row}>
      {days.map((d) => {
        const key = toDateKey(d);
        const log = byDate.get(key) ?? null;
        const isToday = key === toDateKey(today);
        return (
          <View key={key} style={styles.cellWrapper}>
            <View style={[styles.cell, cellStyle(log, accent.base), isToday && styles.cellToday]} />
            <Text style={[styles.dayLabel, isToday && { color: accent.base }]}>{DAY_LETTERS[d.getDay()]}</Text>
          </View>
        );
      })}
    </View>
  );
}

// Local YYYY-MM-DD to match the format the backend sends dates in.
// d.toISOString() shifts by the timezone offset first and can land on
// the wrong calendar day for anyone not at UTC, so this builds the
// string from local date fields instead of trusting that shortcut.
function toDateKey(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cellStyle(log: DailyLogEntry | null, accentColor: string) {
  if (!log || log.sleep_hours == null) {
    return styles.cellEmpty;
  }
  return log.sleep_hours < 6 ? styles.cellFlagged : { backgroundColor: accentColor };
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cellWrapper: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  cell: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
  },
  cellToday: {
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  cellEmpty: {
    backgroundColor: Colors.mist,
  },
  cellFlagged: {
    backgroundColor: Colors.attention,
  },
  dayLabel: {
    ...Type.label,
    color: Colors.inkSoft,
  },
});
