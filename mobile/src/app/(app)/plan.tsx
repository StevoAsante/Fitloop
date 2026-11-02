// ------------------------------------------------------
// plan.tsx — Plan Tab
// ------------------------------------------------------
// Where routines get managed and scheduled. Two ways to
// schedule: weekly (Monday is Push, Wednesday is Pull) for
// people with fixed days, or rotation (A, B, C, then back
// to A) for people whose week keeps changing. Each change
// saves the moment it's made, same as the settings screen,
// so there's no Save button to forget
// ------------------------------------------------------

import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Chip } from '@/components/Chip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Colors, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { WEEKDAYS } from '@/lib/format';

export default function PlanScreen() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<api.Routine[]>([]);
  const [plan, setPlan] = useState<api.PlanState | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [routineList, planState] = await Promise.all([api.getRoutines(user.id), api.getPlan(user.id)]);
      setRoutines(routineList);
      setPlan(planState);
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

  const save = async (payload: Partial<api.PlanState>) => {
    if (!user) return;
    try {
      setPlan(await api.updatePlan(user.id, payload));
      setError(null);
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not save the plan.');
    }
  };

  const routineName = (routineId: number | null) =>
    routineId === null ? 'Rest day' : (routines.find((r) => r.id === routineId)?.name ?? 'Missing routine');

  const assignDay = (day: number, routineId: number | null) => {
    if (!plan) return;
    const weekly = [...plan.weekly];
    weekly[day] = routineId;
    setOpenDay(null);
    save({ weekly });
  };

  // Rotation order is just an array, so moving things around is array
  // surgery on a copy followed by one save.
  const moveRotation = (index: number, direction: -1 | 1) => {
    if (!plan) return;
    const target = index + direction;
    if (target < 0 || target >= plan.rotation.length) return;
    const rotation = [...plan.rotation];
    [rotation[index], rotation[target]] = [rotation[target], rotation[index]];
    save({ rotation });
  };

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Plan</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.sectionLabel}>Your routines</Text>
      {routines.length === 0 ? (
        <Text style={styles.body}>No routines yet. Make one, then schedule it below.</Text>
      ) : (
        routines.map((routine) => (
          <Pressable key={routine.id} onPress={() => router.push(`/routine/${routine.id}`)}>
            <Card style={styles.routineCard}>
              <View style={styles.flex}>
                <Text style={styles.routineName}>{routine.name}</Text>
                <Text style={styles.body}>
                  {routine.items.length} exercise{routine.items.length === 1 ? '' : 's'}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.inkSoft} />
            </Card>
          </Pressable>
        ))
      )}
      <View style={styles.spaced}>
        <Button label="New routine" variant="secondary" onPress={() => router.push('/routine/new')} />
      </View>

      <Text style={[styles.sectionLabel, styles.scheduleLabel]}>Schedule</Text>
      <View style={styles.chipRow}>
        <Chip label="Weekly" selected={plan?.mode === 'weekly'} onPress={() => save({ mode: 'weekly' })} />
        <Chip label="Rotation" selected={plan?.mode === 'rotation'} onPress={() => save({ mode: 'rotation' })} />
      </View>

      {plan?.mode === 'weekly' ? (
        <View style={styles.spaced}>
          <Text style={styles.body}>Pick a routine for each day. Days left on rest don't count as missed.</Text>
          {WEEKDAYS.map((dayName, day) => (
            <Card key={dayName} style={styles.dayCard}>
              <Pressable style={styles.dayRow} onPress={() => setOpenDay(openDay === day ? null : day)}>
                <Text style={styles.dayName}>{dayName}</Text>
                <Text style={[styles.body, plan.weekly[day] === null && styles.restText]}>
                  {routineName(plan.weekly[day])}
                </Text>
              </Pressable>
              {openDay === day ? (
                <View style={styles.chipRow}>
                  <Chip label="Rest" selected={plan.weekly[day] === null} onPress={() => assignDay(day, null)} />
                  {routines.map((routine) => (
                    <Chip
                      key={routine.id}
                      label={routine.name}
                      selected={plan.weekly[day] === routine.id}
                      onPress={() => assignDay(day, routine.id)}
                    />
                  ))}
                </View>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}

      {plan?.mode === 'rotation' ? (
        <View style={styles.spaced}>
          <Text style={styles.body}>
            Train whenever you like, the next session is always the one after your last. Missing a week doesn't
            put you out of sync.
          </Text>
          {plan.rotation.map((routineId, index) => (
            <Card key={`${routineId}-${index}`} style={styles.rotationRow}>
              <Text style={styles.rotationIndex}>{index + 1}</Text>
              <Text style={[styles.dayName, styles.flex]}>{routineName(routineId)}</Text>
              <Pressable onPress={() => moveRotation(index, -1)} hitSlop={8} accessibilityLabel="Move up">
                <Feather name="arrow-up" size={18} color={Colors.inkSoft} />
              </Pressable>
              <Pressable onPress={() => moveRotation(index, 1)} hitSlop={8} accessibilityLabel="Move down">
                <Feather name="arrow-down" size={18} color={Colors.inkSoft} />
              </Pressable>
              <Pressable
                onPress={() => save({ rotation: plan.rotation.filter((_, i) => i !== index) })}
                hitSlop={8}
                accessibilityLabel="Remove from rotation"
              >
                <Feather name="x" size={18} color={Colors.inkSoft} />
              </Pressable>
            </Card>
          ))}
          <Text style={styles.sectionLabel}>Add to rotation</Text>
          <View style={styles.chipRow}>
            {routines.map((routine) => (
              <Chip
                key={routine.id}
                label={`+ ${routine.name}`}
                onPress={() => save({ rotation: [...plan.rotation, routine.id] })}
              />
            ))}
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { ...Type.display, color: Colors.ink, marginTop: Spacing.lg, marginBottom: Spacing.lg },
  sectionLabel: { ...Type.label, color: Colors.inkSoft, marginBottom: Spacing.sm },
  scheduleLabel: { marginTop: Spacing.xl },
  body: { ...Type.body, color: Colors.inkSoft, fontSize: 14 },
  error: { ...Type.caption, color: Colors.danger, marginBottom: Spacing.sm },
  spaced: { marginTop: Spacing.md, gap: Spacing.sm },
  routineCard: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  routineName: { ...Type.title, color: Colors.ink, fontSize: 17 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  dayCard: { gap: Spacing.md },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { ...Type.body, color: Colors.ink, fontWeight: '600' },
  restText: { fontStyle: 'italic' },
  rotationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rotationIndex: { ...Type.statSmall, color: Colors.inkSoft, width: 22 },
});
