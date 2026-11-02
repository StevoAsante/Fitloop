// ------------------------------------------------------
// train.tsx — Train Tab
// ------------------------------------------------------
// The "what am I doing today" screen. Shows a workout
// that's still open (so closing the app mid-session never
// loses it), otherwise whatever the plan says is on today,
// plus an empty-workout option and the last few sessions.
// Reloads every time the tab regains focus, so finishing a
// workout and coming back shows it straight away
// ------------------------------------------------------

import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Colors, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatDay, formatDuration, formatVolume, localDateKey } from '@/lib/format';
import { useTheme } from '@/lib/theme-context';

export default function TrainScreen() {
  const { user } = useAuth();
  const { accent } = useTheme();
  const [today, setToday] = useState<api.TodayState | null>(null);
  const [recent, setRecent] = useState<api.WorkoutSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [todayState, history] = await Promise.all([
        api.getToday(user.id, localDateKey()),
        api.getWorkoutHistory(user.id, 5),
      ]);
      setToday(todayState);
      setRecent(history);
      setError(null);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the server.');
    }
  }, [user]);

  // useFocusEffect rather than useEffect, tabs stay mounted when you
  // switch away, so a plain effect would only ever run once.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const start = async (routineId?: number) => {
    if (!user) return;
    setIsStarting(true);
    setError(null);
    try {
      // If one's already open the server hands that back instead of
      // making a second, so this is safe to tap twice.
      const workout = await api.startWorkout(user.id, routineId ? { routine_id: routineId } : {});
      router.push(`/workout/${workout.id}`);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not start the workout.');
    } finally {
      setIsStarting(false);
    }
  };

  const routine = today?.routine ?? null;

  return (
    <ScreenContainer
      scroll
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.title}>Train</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {today?.active_workout_id ? (
        <Card tone="accent" style={styles.block}>
          <Text style={styles.cardTitle}>Workout in progress</Text>
          <Text style={styles.cardBody}>You've got a session open. Pick up where you left off.</Text>
          <Button label="Resume workout" onPress={() => router.push(`/workout/${today.active_workout_id}`)} />
        </Card>
      ) : (
        <Card style={styles.block}>
          <Text style={styles.sectionLabel}>
            {today?.mode === 'rotation' ? 'Up next in your rotation' : "Today's plan"}
          </Text>
          {routine ? (
            <>
              <Text style={styles.cardTitle}>{routine.name}</Text>
              {routine.items.map((item, index) => (
                <Text key={index} style={styles.exerciseLine}>
                  {item.exercise.name}
                  <Text style={styles.exerciseTarget}>
                    {'  '}
                    {item.target_sets} x {item.rep_min === item.rep_max ? item.rep_min : `${item.rep_min}-${item.rep_max}`}
                  </Text>
                </Text>
              ))}
              <Button label="Start workout" onPress={() => start(routine.id)} loading={isStarting} />
            </>
          ) : (
            <>
              <Text style={styles.cardBody}>
                {today?.mode === 'rotation'
                  ? 'No rotation set up yet. Add routines to it in the Plan tab.'
                  : 'Nothing planned for today. Rest day, or set a routine for it in the Plan tab.'}
              </Text>
            </>
          )}
        </Card>
      )}

      {!today?.active_workout_id ? (
        <View style={styles.block}>
          <Button label="Start an empty workout" variant="secondary" onPress={() => start()} loading={isStarting} />
        </View>
      ) : null}

      <Text style={[styles.sectionLabel, styles.historyLabel]}>Recent sessions</Text>
      {recent.length === 0 ? (
        <Text style={styles.cardBody}>Nothing logged yet. Your first session will show up here.</Text>
      ) : (
        recent.map((workout) => (
          <Pressable key={workout.id} onPress={() => router.push(`/workout/${workout.id}`)}>
            <Card style={styles.historyCard}>
              <View style={styles.historyRow}>
                <Text style={styles.historyName}>{workout.name}</Text>
                {workout.pr_count > 0 ? (
                  <Text style={[styles.prBadge, { backgroundColor: accent.soft, color: accent.deep }]}>
                    {workout.pr_count} PR{workout.pr_count === 1 ? '' : 's'}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.cardBody}>
                {formatDay(workout.started_at)} · {formatDuration(workout.duration_secs)} · {workout.set_count} sets ·{' '}
                {formatVolume(workout.volume_kg)}
              </Text>
            </Card>
          </Pressable>
        ))
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display, color: Colors.ink, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  block: { gap: Spacing.md, marginBottom: Spacing.md },
  sectionLabel: { ...Type.label, color: Colors.inkSoft },
  historyLabel: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  cardTitle: { ...Type.title, color: Colors.ink },
  cardBody: { ...Type.body, color: Colors.inkSoft, fontSize: 14 },
  exerciseLine: { ...Type.body, color: Colors.ink },
  exerciseTarget: { ...Type.caption },
  error: { ...Type.caption, color: Colors.danger, marginBottom: Spacing.sm },
  historyCard: { marginBottom: Spacing.sm, gap: Spacing.xs },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyName: { ...Type.title, color: Colors.ink, fontSize: 16 },
  prBadge: {
    ...Type.label,
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
