// ------------------------------------------------------
// RestTimer.tsx — Rest Countdown Bar
// ------------------------------------------------------
// Sits at the bottom of the workout screen between sets.
// It stores the moment the rest should END, not a number
// that ticks down, then works out what's left from the
// clock on every redraw. A ticking counter drifts or
// freezes when a phone locks or a browser tab goes to the
// background, a stored end time is right the moment you
// look again
// ------------------------------------------------------

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { formatClock } from '@/lib/format';
import { celebrate } from '@/lib/platform';
import { useTheme } from '@/lib/theme-context';

type RestTimerProps = {
  endsAt: number; // epoch ms
  totalSeconds: number;
  onAdjust: (deltaSeconds: number) => void;
  onDismiss: () => void;
};

export function RestTimer({ endsAt, totalSeconds, onAdjust, onDismiss }: RestTimerProps) {
  const { accent } = useTheme();
  const [now, setNow] = useState(Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    buzzed.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  const remaining = Math.max(0, (endsAt - now) / 1000);
  const progress = totalSeconds > 0 ? Math.min(1, 1 - remaining / totalSeconds) : 1;
  const finished = remaining <= 0;

  // The ref stops this buzzing on every redraw once it's finished, it
  // should fire exactly once per rest.
  useEffect(() => {
    if (finished && !buzzed.current) {
      buzzed.current = true;
      celebrate();
    }
  }, [finished]);

  return (
    <View style={styles.bar}>
      <View style={[styles.fill, { backgroundColor: accent.base, width: `${progress * 100}%` }]} />
      <View style={styles.content}>
        <Text style={styles.time}>{finished ? 'Go' : formatClock(Math.ceil(remaining))}</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => onAdjust(-15)} style={styles.action} accessibilityLabel="Take 15 seconds off">
            <Text style={styles.actionText}>-15s</Text>
          </Pressable>
          <Pressable onPress={() => onAdjust(15)} style={styles.action} accessibilityLabel="Add 15 seconds">
            <Text style={styles.actionText}>+15s</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={styles.action} accessibilityLabel="Skip rest">
            <Text style={styles.actionText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  time: { ...Type.statSmall, fontSize: 30, color: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  action: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  actionText: { ...Type.label, color: '#FFFFFF' },
});
