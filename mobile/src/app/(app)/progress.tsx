// ------------------------------------------------------
// progress.tsx — Progress Tab
// ------------------------------------------------------
// The "am I actually getting anywhere" screen: a twelve
// week calendar of sessions, this week's sets per muscle
// group, recent records and a scrollable history. The
// stats come from a single endpoint so the tab makes one
// request to draw, the history list pages separately
// because it's the part that grows
// ------------------------------------------------------

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Heatmap } from '@/components/Heatmap';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { capitalise, formatDay, formatDuration, formatKg, formatVolume } from '@/lib/format';
import { useTheme } from '@/lib/theme-context';

const PAGE_SIZE = 10;

export default function ProgressScreen() {
  const { user } = useAuth();
  const { accent } = useTheme();
  const [stats, setStats] = useState<api.TrainingStats | null>(null);
  const [history, setHistory] = useState<api.WorkoutSummary[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [statsResult, firstPage] = await Promise.all([
        api.getTrainingStats(user.id),
        api.getWorkoutHistory(user.id, PAGE_SIZE, 0),
      ]);
      setStats(statsResult);
      setHistory(firstPage);
      // A full page means there might be another one. An exactly-full
      // last page costs one empty fetch, which is cheaper than adding a
      // count query to the API just to avoid it.
      setHasMore(firstPage.length === PAGE_SIZE);
      setError(null);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the server.');
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (!user) return;
    try {
      const next = await api.getWorkoutHistory(user.id, PAGE_SIZE, history.length);
      setHistory((current) => [...current, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch {
      setError('Could not load more sessions.');
    }
  };

  const maxSets = Math.max(1, ...(stats?.muscles_this_week.map((m) => m.sets) ?? [1]));

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Progress</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card style={styles.card}>
        <Text style={styles.label}>Last 12 weeks</Text>
        <Heatmap counts={stats?.heatmap ?? {}} />
        <Text style={styles.body}>
          {stats?.workouts_this_week ?? 0} session{stats?.workouts_this_week === 1 ? '' : 's'} in the last 7 days
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>Sets per muscle, last 7 days</Text>
        {stats && stats.muscles_this_week.length === 0 ? (
          <Text style={styles.body}>Nothing logged this week yet.</Text>
        ) : null}
        {stats?.muscles_this_week.map((muscle) => (
          <View key={muscle.muscle} style={styles.muscleRow}>
            <Text style={styles.muscleName}>{capitalise(muscle.muscle)}</Text>
            <View style={styles.track}>
              <View style={[styles.fill, { backgroundColor: accent.base, width: `${(muscle.sets / maxSets) * 100}%` }]} />
            </View>
            <Text style={styles.muscleCount}>{muscle.sets}</Text>
          </View>
        ))}
      </Card>

      {stats && stats.recent_prs.length > 0 ? (
        <Card tone="accent" style={styles.card}>
          <Text style={styles.label}>Recent records</Text>
          {stats.recent_prs.map((pr, index) => (
            <Pressable key={index} onPress={() => router.push(`/exercise/${pr.exercise_id}`)} style={styles.prRow}>
              <Text style={styles.prName}>{pr.exercise}</Text>
              <Text style={styles.body}>
                {pr.weight_kg != null && pr.reps != null
                  ? `${formatKg(pr.weight_kg)} kg x ${pr.reps}`
                  : pr.duration_secs
                    ? `${pr.duration_secs} sec`
                    : `${pr.reps} reps`}{' '}
                · {formatDay(pr.date)}
              </Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Text style={[styles.label, styles.historyLabel]}>History</Text>
      {history.length === 0 ? <Text style={styles.body}>Finished workouts will appear here.</Text> : null}
      {history.map((workout) => (
        <Pressable key={workout.id} onPress={() => router.push(`/workout/${workout.id}`)}>
          <Card style={styles.historyCard}>
            <Text style={styles.prName}>{workout.name}</Text>
            <Text style={styles.body}>
              {formatDay(workout.started_at)} · {formatDuration(workout.duration_secs)} · {workout.set_count} sets ·{' '}
              {formatVolume(workout.volume_kg)}
              {workout.pr_count > 0 ? ` · ${workout.pr_count} PR${workout.pr_count === 1 ? '' : 's'}` : ''}
            </Text>
          </Card>
        </Pressable>
      ))}
      {hasMore ? <Button label="Load more" variant="secondary" onPress={loadMore} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...Type.display, color: Colors.ink, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  card: { gap: Spacing.md, marginBottom: Spacing.md },
  label: { ...Type.label, color: Colors.inkSoft },
  historyLabel: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  body: { ...Type.body, color: Colors.inkSoft, fontSize: 14 },
  error: { ...Type.caption, color: Colors.danger, marginBottom: Spacing.sm },
  muscleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  muscleName: { ...Type.body, color: Colors.ink, fontSize: 14, width: 90 },
  track: { flex: 1, height: 10, borderRadius: Radius.pill, backgroundColor: Colors.mist, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
  muscleCount: { ...Type.statSmall, color: Colors.ink, width: 28, textAlign: 'right' },
  prRow: { gap: 2 },
  prName: { ...Type.title, color: Colors.ink, fontSize: 16 },
  historyCard: { marginBottom: Spacing.sm, gap: Spacing.xs },
});
