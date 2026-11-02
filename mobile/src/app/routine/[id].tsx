// ------------------------------------------------------
// routine/[id].tsx — Routine Editor
// ------------------------------------------------------
// Creates a routine (when the id is "new") or edits an
// existing one. Each exercise gets its own targets: sets,
// a rep range, rest, and which progression rule drives its
// weight suggestions. The number boxes hold text while you
// type and only become numbers on save, otherwise clearing
// a box to retype it would instantly snap back to 0
// ------------------------------------------------------

import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Chip } from '@/components/Chip';
import { ExercisePicker } from '@/components/ExercisePicker';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { capitalise, parseNumber } from '@/lib/format';
import { confirmAction } from '@/lib/platform';
import { useTheme } from '@/lib/theme-context';

type EditorItem = {
  exercise: api.Exercise;
  sets: string;
  repMin: string;
  repMax: string;
  rest: string;
  progression: api.ProgressionRule;
  increment: string;
  superset: number | null;
};

// Cardio and timed exercises don't have a rep range or a weight to
// progress, so those boxes are hidden for them.
const usesReps = (exercise: api.Exercise) => exercise.kind === 'strength' || exercise.kind === 'bodyweight';

function newItem(exercise: api.Exercise): EditorItem {
  return {
    exercise,
    sets: usesReps(exercise) ? '3' : '1',
    repMin: '8',
    repMax: '12',
    rest: usesReps(exercise) ? '90' : '60',
    progression: usesReps(exercise) ? 'double' : 'none',
    increment: '2.5',
    superset: null,
  };
}

function fromRoutineItem(item: api.RoutineItem): EditorItem {
  return {
    exercise: item.exercise,
    sets: String(item.target_sets),
    repMin: String(item.rep_min),
    repMax: String(item.rep_max),
    rest: String(item.rest_seconds),
    progression: item.progression,
    increment: String(item.increment_kg),
    superset: item.superset_group,
  };
}

export default function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routineId = id === 'new' ? null : Number(id);
  const { user } = useAuth();
  const { accent } = useTheme();

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<EditorItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (routineId === null) return;
    api
      .getRoutine(routineId)
      .then((routine) => {
        setName(routine.name);
        setNotes(routine.notes ?? '');
        setItems(routine.items.map(fromRoutineItem));
      })
      .catch(() => setError('Could not load this routine.'));
  }, [routineId]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/plan');
  };

  const patchItem = (index: number, patch: Partial<EditorItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Linking with the previous exercise puts both in the same superset
  // group, using that group's number if it has one or a fresh one if
  // not. Unlinking clears this item only, so a three-way superset
  // loses its last member rather than collapsing entirely.
  const toggleSuperset = (index: number) => {
    if (index === 0) return;
    const previous = items[index - 1];
    if (items[index].superset !== null) {
      patchItem(index, { superset: null });
      return;
    }
    const used = items.map((i) => i.superset ?? 0);
    const group = previous.superset ?? Math.max(0, ...used) + 1;
    setItems((current) =>
      current.map((item, i) => (i === index || i === index - 1 ? { ...item, superset: group } : item)),
    );
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) {
      setError('Give the routine a name.');
      return;
    }

    const payloadItems: api.RoutineItemPayload[] = [];
    for (const item of items) {
      const repMin = parseNumber(item.repMin) ?? 8;
      const repMax = parseNumber(item.repMax) ?? repMin;
      if (repMax < repMin) {
        setError(`${item.exercise.name}: the top of the rep range can't be below the bottom.`);
        return;
      }
      payloadItems.push({
        exercise_id: item.exercise.id,
        target_sets: Math.round(parseNumber(item.sets) ?? 3),
        rep_min: Math.round(repMin),
        rep_max: Math.round(repMax),
        rest_seconds: Math.round(parseNumber(item.rest) ?? 90),
        progression: item.progression,
        increment_kg: parseNumber(item.increment) ?? 2.5,
        superset_group: item.superset,
      });
    }

    setIsSaving(true);
    setError(null);
    try {
      await api.saveRoutine(user.id, routineId, { name: name.trim(), notes: notes.trim(), items: payloadItems });
      goBack();
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not save the routine.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (routineId === null) return;
    const ok = await confirmAction(
      'Delete routine?',
      'It comes out of your plan too. Workouts you already logged from it stay in your history.',
      'Delete',
    );
    if (!ok) return;
    try {
      await api.deleteRoutine(routineId);
      goBack();
    } catch {
      setError('Could not delete the routine.');
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} accessibilityLabel="Back" style={styles.back}>
          <Feather name="chevron-left" size={26} color={Colors.ink} />
        </Pressable>
        <Text style={styles.title}>{routineId === null ? 'New routine' : 'Edit routine'}</Text>
      </View>

      <View style={styles.form}>
        <TextField label="Name" value={name} onChangeText={setName} placeholder="e.g. Push A" autoCapitalize="words" />
        <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline autoCapitalize="sentences" />
      </View>

      <Text style={styles.sectionLabel}>Exercises</Text>
      {items.map((item, index) => (
        <Card key={`${item.exercise.id}-${index}`} style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.flex}>
              {item.superset !== null ? (
                <Text style={[styles.superset, { color: accent.base }]}>
                  Superset {String.fromCharCode(64 + item.superset)}
                </Text>
              ) : null}
              <Text style={styles.itemName}>{item.exercise.name}</Text>
              <Text style={styles.caption}>{capitalise(item.exercise.muscle_group)}</Text>
            </View>
            <Pressable onPress={() => move(index, -1)} hitSlop={8} accessibilityLabel="Move up">
              <Feather name="arrow-up" size={18} color={Colors.inkSoft} />
            </Pressable>
            <Pressable onPress={() => move(index, 1)} hitSlop={8} accessibilityLabel="Move down">
              <Feather name="arrow-down" size={18} color={Colors.inkSoft} />
            </Pressable>
            <Pressable
              onPress={() => setItems((current) => current.filter((_, i) => i !== index))}
              hitSlop={8}
              accessibilityLabel="Remove exercise"
            >
              <Feather name="x" size={18} color={Colors.inkSoft} />
            </Pressable>
          </View>

          <View style={styles.numberRow}>
            <NumberBox label="sets" value={item.sets} onChange={(v) => patchItem(index, { sets: v })} />
            {usesReps(item.exercise) ? (
              <>
                <NumberBox label="reps from" value={item.repMin} onChange={(v) => patchItem(index, { repMin: v })} />
                <NumberBox label="to" value={item.repMax} onChange={(v) => patchItem(index, { repMax: v })} />
              </>
            ) : null}
            <NumberBox label="rest (s)" value={item.rest} onChange={(v) => patchItem(index, { rest: v })} />
          </View>

          {usesReps(item.exercise) ? (
            <>
              <Text style={styles.caption}>How the weight moves up</Text>
              <View style={styles.chipRow}>
                <Chip label="Double" selected={item.progression === 'double'} onPress={() => patchItem(index, { progression: 'double' })} />
                <Chip label="Linear" selected={item.progression === 'linear'} onPress={() => patchItem(index, { progression: 'linear' })} />
                <Chip label="Manual" selected={item.progression === 'none'} onPress={() => patchItem(index, { progression: 'none' })} />
              </View>
              {item.progression !== 'none' ? (
                <View style={styles.numberRow}>
                  <NumberBox label="add (kg)" value={item.increment} onChange={(v) => patchItem(index, { increment: v })} decimal />
                </View>
              ) : null}
              <Text style={styles.caption}>
                {item.progression === 'double'
                  ? 'Climb the reps first, add weight once every set hits the top of the range.'
                  : item.progression === 'linear'
                    ? 'Add weight whenever every set hits the top rep, with a deload if you stall.'
                    : "No suggestions, you'll pick the weight yourself each time."}
              </Text>
            </>
          ) : null}

          {index > 0 ? (
            <Chip
              label={item.superset !== null ? 'Unlink superset' : 'Superset with the one above'}
              selected={item.superset !== null}
              onPress={() => toggleSuperset(index)}
            />
          ) : null}
        </Card>
      ))}

      <View style={styles.actions}>
        <Button label="Add exercise" variant="secondary" onPress={() => setPickerOpen(true)} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Save routine" onPress={handleSave} loading={isSaving} />
        {routineId !== null ? <Button label="Delete routine" variant="secondary" onPress={handleDelete} /> : null}
      </View>

      <ExercisePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(exercise) => setItems((current) => [...current, newItem(exercise)])}
      />
    </ScreenContainer>
  );
}

type NumberBoxProps = { label: string; value: string; onChange: (value: string) => void; decimal?: boolean };

// Same compact label-over-input idea as the workout logger's, kept as
// its own small copy here since the two screens may well drift apart
// in styling and sharing it would couple them.
function NumberBox({ label, value, onChange, decimal }: NumberBoxProps) {
  return (
    <View style={styles.numberBox}>
      <Text style={styles.caption}>{label}</Text>
      <TextInput
        style={styles.numberInput}
        value={value}
        onChangeText={onChange}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm, marginBottom: Spacing.md },
  back: { paddingVertical: Spacing.sm, paddingRight: Spacing.sm },
  title: { ...Type.display, color: Colors.ink },
  form: { gap: Spacing.md, marginBottom: Spacing.lg },
  sectionLabel: { ...Type.label, color: Colors.inkSoft, marginBottom: Spacing.sm },
  itemCard: { gap: Spacing.md, marginBottom: Spacing.md },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  itemName: { ...Type.title, color: Colors.ink, fontSize: 17 },
  superset: { ...Type.label, textTransform: 'uppercase', fontSize: 11 },
  caption: { ...Type.caption },
  numberRow: { flexDirection: 'row', gap: Spacing.sm },
  numberBox: { flex: 1, gap: 2 },
  numberInput: {
    ...Type.statSmall,
    color: Colors.ink,
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    textAlign: 'center',
    minWidth: 0,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  actions: { gap: Spacing.md, marginTop: Spacing.sm },
  error: { ...Type.caption, color: Colors.danger },
});
