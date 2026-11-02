// ------------------------------------------------------
// workout/[id].tsx — Workout Logger
// ------------------------------------------------------
// The screen people actually use mid-session, and also the
// read-only view of a finished one (same layout, inputs
// hidden), so history never needs a second screen to keep
// in step. Every set is saved to the server the moment it's
// logged rather than on "finish", which is what makes a
// dead battery or a closed browser tab survivable. The
// rest timer, elapsed clock and screen wake lock all live
// here too
// ------------------------------------------------------

import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { ExerciseLogCard } from '@/components/ExerciseLogCard';
import { ExercisePicker } from '@/components/ExercisePicker';
import { RestTimer } from '@/components/RestTimer';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatClock, formatDay, formatDuration, formatKg, formatVolume } from '@/lib/format';
import { celebrate, confirmAction, useScreenAwake } from '@/lib/platform';
import { useTheme } from '@/lib/theme-context';

type RestState = { endsAt: number; total: number };

// Friendly names for the record kinds the server reports.
const RECORD_LABELS: Record<string, string> = {
  weight: 'heaviest weight',
  e1rm: 'estimated 1RM',
  reps: 'most reps',
  time: 'longest hold',
};

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);
  const { user } = useAuth();
  const { accent } = useTheme();

  const [workout, setWorkout] = useState<api.Workout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);
  const [now, setNow] = useState(Date.now());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [summary, setSummary] = useState<api.WorkoutSummary | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const bannerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLive = workout !== null && workout.finished_at === null && summary === null;
  useScreenAwake(isLive);

  const load = useCallback(async () => {
    try {
      setWorkout(await api.getWorkout(workoutId));
      setError(null);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not load this workout.');
    }
  }, [workoutId]);

  useEffect(() => {
    load();
  }, [load]);

  // One-second tick just for the elapsed clock in the header.
  useEffect(() => {
    if (!isLive) return;
    const idTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(idTimer);
  }, [isLive]);

  useEffect(() => {
    return () => {
      if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    };
  }, []);

  const showBanner = (message: string) => {
    setBanner(message);
    if (bannerTimeout.current) clearTimeout(bannerTimeout.current);
    bannerTimeout.current = setTimeout(() => setBanner(null), 4000);
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/train');
  };

  // Whether to start the rest countdown after a set. In a superset you
  // move straight to the partner exercise, so the rest only starts once
  // the last exercise of the group has caught up on its sets.
  const shouldRest = (item: api.WorkoutExercise, index: number, setsAfter: number) => {
    if (!workout || item.superset_group == null) return true;
    const next = workout.exercises[index + 1];
    if (next && next.superset_group === item.superset_group && next.sets.length < setsAfter) return false;
    return true;
  };

  const handleLog = async (item: api.WorkoutExercise, index: number, payload: api.SetPayload) => {
    const saved = await api.logSet(workoutId, payload);
    await load();

    // Warm-ups get no rest timer, resting 2 minutes after an empty bar
    // would be silly.
    if (payload.set_type !== 'warmup' && item.rest_seconds > 0 && shouldRest(item, index, item.sets.length + 1)) {
      setRest({ endsAt: Date.now() + item.rest_seconds * 1000, total: item.rest_seconds });
    }

    if (saved.records && saved.records.length > 0) {
      celebrate();
      const names = saved.records.map((r) => RECORD_LABELS[r] ?? r).join(' and ');
      showBanner(`New record on ${item.exercise.name}: ${names}`);
    }
  };

  const handleEditSet = async (setId: number, payload: Partial<api.SetPayload>) => {
    await api.editSet(setId, payload);
    await load();
  };

  const handleDeleteSet = async (setId: number) => {
    const ok = await confirmAction('Delete this set?', 'It will be removed from your history.', 'Delete');
    if (!ok) return;
    try {
      await api.deleteSet(setId);
      await load();
    } catch {
      setError('Could not delete that set.');
    }
  };

  const handleRemoveExercise = async (item: api.WorkoutExercise) => {
    const message =
      item.sets.length > 0
        ? `This also removes the ${item.sets.length} set${item.sets.length === 1 ? '' : 's'} you logged for it.`
        : 'It will be taken out of this workout.';
    const ok = await confirmAction(`Remove ${item.exercise.name}?`, message, 'Remove');
    if (!ok) return;
    try {
      setWorkout(await api.removeWorkoutExercise(workoutId, item.id));
    } catch {
      setError('Could not remove that exercise.');
    }
  };

  const handleAddExercise = async (exercise: api.Exercise) => {
    try {
      setWorkout(await api.addWorkoutExercise(workoutId, exercise.id));
    } catch {
      setError('Could not add that exercise.');
    }
  };

  const handleFinish = async () => {
    if (!workout) return;
    const totalSets = workout.exercises.reduce((sum, e) => sum + e.sets.length, 0);

    // An empty workout is almost always a mis-tap on Start. Offer to bin
    // it instead of saving a blank session into history.
    if (totalSets === 0) {
      const discard = await confirmAction('Nothing logged', 'Discard this workout?', 'Discard');
      if (discard) {
        await api.deleteWorkout(workoutId).catch(() => {});
        goBack();
      }
      return;
    }

    const ok = await confirmAction('Finish workout?', `${totalSets} set${totalSets === 1 ? '' : 's'} logged.`, 'Finish');
    if (!ok) return;

    setIsFinishing(true);
    try {
      setSummary(await api.finishWorkout(workoutId));
      setRest(null);
    } catch {
      setError('Could not finish the workout, try again.');
    } finally {
      setIsFinishing(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmAction('Delete workout?', 'This removes the whole session and any records it set.', 'Delete');
    if (!ok) return;
    try {
      await api.deleteWorkout(workoutId);
      goBack();
    } catch {
      setError('Could not delete the workout.');
    }
  };

  if (!workout) {
    return (
      <ScreenContainer>
        <Pressable onPress={goBack} style={styles.back}>
          <Feather name="chevron-left" size={26} color={Colors.ink} />
        </Pressable>
        <Text style={error ? styles.error : styles.muted}>{error ?? 'Loading...'}</Text>
      </ScreenContainer>
    );
  }

  // After finishing, swap the logger for a short results screen.
  if (summary) {
    return (
      <ScreenContainer scroll>
        <Text style={styles.summaryTitle}>Workout done</Text>
        <Card tone="accent" style={styles.summaryCard}>
          <Text style={styles.summaryName}>{summary.name}</Text>
          <View style={styles.statRow}>
            <Stat label="Time" value={formatDuration(summary.duration_secs)} />
            <Stat label="Sets" value={String(summary.set_count)} />
            <Stat label="Volume" value={formatVolume(summary.volume_kg)} />
          </View>
        </Card>
        {summary.prs && summary.prs.length > 0 ? (
          <Card style={styles.summaryCard}>
            <Text style={styles.sectionLabel}>New records</Text>
            {summary.prs.map((pr, index) => (
              <Text key={index} style={styles.prLine}>
                {pr.exercise}
                {pr.weight_kg != null && pr.reps != null ? `: ${formatKg(pr.weight_kg)} kg x ${pr.reps}` : ''}
                {pr.duration_secs && !pr.reps ? `: ${pr.duration_secs} sec` : ''}
              </Text>
            ))}
          </Card>
        ) : null}
        <Button label="Done" onPress={() => router.replace('/train')} />
      </ScreenContainer>
    );
  }

  const elapsed = Math.max(0, Math.floor((now - new Date(workout.started_at).getTime()) / 1000));

  return (
    <ScreenContainer>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} style={styles.back} accessibilityLabel="Back">
          <Feather name="chevron-left" size={26} color={Colors.ink} />
        </Pressable>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>
            {workout.name}
          </Text>
          <Text style={styles.muted}>
            {isLive ? `${formatClock(elapsed)} elapsed` : formatDay(workout.started_at)}
          </Text>
        </View>
        {isLive ? (
          <Pressable
            onPress={handleFinish}
            disabled={isFinishing}
            style={[styles.finish, { backgroundColor: accent.base }, isFinishing && { opacity: 0.5 }]}
          >
            <Text style={styles.finishLabel}>Finish</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleDelete} hitSlop={12} accessibilityLabel="Delete workout">
            <Feather name="trash-2" size={20} color={Colors.inkSoft} />
          </Pressable>
        )}
      </View>

      {banner ? (
        <View style={[styles.banner, { backgroundColor: accent.base }]}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {workout.exercises.length === 0 ? (
          <Text style={[styles.muted, styles.emptyText]}>
            Nothing in this workout yet. Add an exercise to get going.
          </Text>
        ) : null}

        {workout.exercises.map((item, index) => (
          // Keyed by the exercise's own id so each card keeps its draft
          // inputs and "plates" toggle between sets. Keying on the set
          // count would remount it after every log and wipe both.
          <ExerciseLogCard
            key={item.id}
            item={item}
            readOnly={!isLive}
            onLog={(payload) => handleLog(item, index, payload)}
            onEditSet={handleEditSet}
            onDeleteSet={handleDeleteSet}
            onRemove={() => handleRemoveExercise(item)}
          />
        ))}

        {isLive ? <Button label="Add exercise" variant="secondary" onPress={() => setPickerOpen(true)} /> : null}
      </ScrollView>

      {rest && isLive ? (
        <RestTimer
          endsAt={rest.endsAt}
          totalSeconds={rest.total}
          onAdjust={(delta) => setRest({ endsAt: rest.endsAt + delta * 1000, total: Math.max(1, rest.total + delta) })}
          onDismiss={() => setRest(null)}
        />
      ) : null}

      <ExercisePicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onPick={handleAddExercise} />
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.muted}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.md },
  back: { paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
  title: { ...Type.display, fontSize: 22, color: Colors.ink },
  muted: { ...Type.caption },
  finish: { borderRadius: Radius.pill, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  finishLabel: { ...Type.label, color: '#FFFFFF', fontSize: 14 },
  scroll: { paddingBottom: Spacing.lg },
  emptyText: { marginVertical: Spacing.lg, textAlign: 'center', fontSize: 14 },
  banner: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  bannerText: { ...Type.label, color: '#FFFFFF', fontSize: 14 },
  error: { ...Type.caption, color: Colors.danger, marginBottom: Spacing.sm },
  summaryTitle: { ...Type.display, color: Colors.ink, marginTop: Spacing.xl, marginBottom: Spacing.lg },
  summaryCard: { gap: Spacing.md, marginBottom: Spacing.md },
  summaryName: { ...Type.title, color: Colors.ink },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { ...Type.statSmall, fontSize: 28, color: Colors.ink },
  sectionLabel: { ...Type.label, color: Colors.inkSoft },
  prLine: { ...Type.body, color: Colors.ink },
});
