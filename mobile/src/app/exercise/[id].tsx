// ------------------------------------------------------
// exercise/[id].tsx — Exercise Detail
// ------------------------------------------------------
// One exercise's how-to cue, your all-time bests, and how
// your numbers have moved over time. The bests and chart
// come from the progress endpoint, which only counts
// finished sessions and ignores warm-ups, so a light
// warm-up set never shows up as your "best"
// ------------------------------------------------------

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { MiniChart } from '@/components/MiniChart';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Colors, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { capitalise, formatDay, formatKg } from '@/lib/format';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [progress, setProgress] = useState<api.ExerciseProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api
      .getExerciseProgress(user.id, Number(id))
      .then(setProgress)
      .catch(() => setError('Could not load this exercise.'));
  }, [user, id]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/library');
  };

  const exercise = progress?.exercise;
  const kind = exercise?.kind;
  const lifts = kind === 'strength' || kind === 'bodyweight';

  // The chart plots whichever number matters for the exercise type:
  // estimated 1RM for lifts, seconds for holds, volume for the rest.
  const series = progress?.history.map((h) => (lifts ? h.best_e1rm : kind === 'timed' ? h.best_seconds : h.volume_kg)) ?? [];
  const labels = progress?.history.map((h) => formatDay(h.date));
  const chartTitle = lifts ? 'Estimated 1RM' : kind === 'timed' ? 'Longest hold (sec)' : 'Session volume';

  return (
    <ScreenContainer scroll>
      <Pressable onPress={goBack} accessibilityLabel="Back" style={styles.back}>
        <Feather name="chevron-left" size={26} color={Colors.ink} />
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {exercise ? (
        <>
          <Text style={styles.title}>{exercise.name}</Text>
          <Text style={styles.body}>
            {capitalise(exercise.muscle_group)} · {capitalise(exercise.equipment)}
          </Text>

          {exercise.instructions ? (
            <Card style={styles.card}>
              <Text style={styles.label}>How to</Text>
              <Text style={styles.bodyDark}>{exercise.instructions}</Text>
            </Card>
          ) : null}

          <Card tone="accent" style={styles.card}>
            <Text style={styles.label}>Personal bests</Text>
            <View style={styles.statRow}>
              {lifts ? (
                <>
                  <Stat label="Heaviest" value={`${formatKg(progress.bests.weight_kg)} kg`} />
                  <Stat label="Est. 1RM" value={`${formatKg(progress.bests.e1rm)} kg`} />
                </>
              ) : null}
              {kind === 'bodyweight' ? <Stat label="Most reps" value={String(progress.bests.reps)} /> : null}
              {kind === 'timed' ? <Stat label="Longest" value={`${progress.bests.seconds} s`} /> : null}
              {kind === 'cardio' ? <Text style={styles.body}>Cardio doesn't have lifting records yet.</Text> : null}
            </View>
          </Card>

          <Card style={styles.card}>
            <Text style={styles.label}>{chartTitle}</Text>
            <MiniChart values={series.slice(-12)} labels={labels?.slice(-12)} />
          </Card>

          <Text style={[styles.label, styles.historyLabel]}>History</Text>
          {progress.history.length === 0 ? (
            <Text style={styles.body}>No finished sessions with this exercise yet.</Text>
          ) : (
            [...progress.history].reverse().map((row) => (
              <Pressable key={row.workout_id} onPress={() => router.push(`/workout/${row.workout_id}`)}>
                <Card style={styles.historyRow}>
                  <Text style={styles.bodyDark}>{formatDay(row.date)}</Text>
                  <Text style={styles.body}>
                    {lifts
                      ? `top ${formatKg(row.top_weight_kg)} kg · 1RM ~${formatKg(row.best_e1rm)}`
                      : kind === 'timed'
                        ? `${row.best_seconds} sec`
                        : `${Math.round(row.volume_kg)} kg volume`}
                  </Text>
                </Card>
              </Pressable>
            ))
          )}
        </>
      ) : null}
    </ScreenContainer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignSelf: 'flex-start' },
  title: { ...Type.display, color: Colors.ink, marginTop: Spacing.sm },
  body: { ...Type.body, color: Colors.inkSoft, fontSize: 14 },
  bodyDark: { ...Type.body, color: Colors.ink },
  label: { ...Type.label, color: Colors.inkSoft },
  historyLabel: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  card: { marginTop: Spacing.md, gap: Spacing.sm },
  statRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { ...Type.statSmall, fontSize: 28, color: Colors.ink },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  error: { ...Type.caption, color: Colors.danger },
});
