// ------------------------------------------------------
// ExerciseLogCard.tsx — One Exercise in a Workout
// ------------------------------------------------------
// Everything for a single exercise during a session: the
// target, what the progression rule suggests, what you did
// last time, the sets already logged, and the inputs for
// the next one. Which inputs appear depends on the
// exercise's kind, because a plank has no weight and a run
// has no reps. Owns its own draft values so typing in one
// card never redraws the rest of the workout
// ------------------------------------------------------

import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { Chip } from '@/components/Chip';
import { Card } from '@/components/ui/Card';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import type { LoggedSet, SetPayload, SetType, WorkoutExercise } from '@/lib/api';
import { capitalise, formatClock, formatKg, parseNumber } from '@/lib/format';
import { plateBreakdown } from '@/lib/plates';
import { tap } from '@/lib/platform';
import { useTheme } from '@/lib/theme-context';

type Draft = {
  weight: string;
  reps: string;
  seconds: string;
  minutes: string;
  km: string;
  effort: string;
  setType: SetType;
};

type ExerciseLogCardProps = {
  item: WorkoutExercise;
  readOnly: boolean;
  onLog: (payload: SetPayload) => Promise<void>;
  onEditSet: (setId: number, payload: Partial<SetPayload>) => Promise<void>;
  onDeleteSet: (setId: number) => void;
  onRemove: () => void;
};

// What the inputs should start on. Order of preference: whatever you
// logged a moment ago in this session (so a second set repeats the
// first without retyping), then the progression suggestion, then last
// time's first working set. Blank if there's genuinely nothing.
function initialDraft(item: WorkoutExercise): Draft {
  const lastHere = [...item.sets].reverse().find((s) => s.set_type !== 'warmup');
  const lastTime = item.last_sets.find((s) => s.set_type !== 'warmup');
  const source = lastHere ?? lastTime;

  const draft: Draft = {
    weight: '',
    reps: '',
    seconds: '',
    minutes: '',
    km: '',
    effort: '',
    setType: 'normal',
  };

  if (lastHere || !item.suggestion) {
    if (source) {
      draft.weight = source.weight_kg != null ? formatKg(source.weight_kg) : '';
      draft.reps = source.reps != null ? String(source.reps) : '';
      draft.seconds = source.duration_secs != null ? String(source.duration_secs) : '';
      draft.minutes = source.duration_secs != null ? String(Math.round(source.duration_secs / 60)) : '';
      draft.km = source.distance_km != null ? String(source.distance_km) : '';
    }
  } else {
    draft.weight = item.suggestion.weight_kg != null ? formatKg(item.suggestion.weight_kg) : '';
    draft.reps = String(item.suggestion.reps);
  }

  return draft;
}

// "60 x 8", "45 sec", "5 km in 28 min", depending on the kind.
export function describeSet(kind: WorkoutExercise['exercise']['kind'], set: LoggedSet) {
  if (kind === 'timed') return `${set.duration_secs ?? 0} sec`;
  if (kind === 'cardio') {
    const minutes = Math.round((set.duration_secs ?? 0) / 60);
    return set.distance_km ? `${set.distance_km} km in ${minutes} min` : `${minutes} min`;
  }
  if (kind === 'bodyweight' && !set.weight_kg) return `${set.reps} reps`;
  return `${formatKg(set.weight_kg)} kg x ${set.reps}`;
}

export function ExerciseLogCard({ item, readOnly, onLog, onEditSet, onDeleteSet, onRemove }: ExerciseLogCardProps) {
  const { accent } = useTheme();
  const kind = item.exercise.kind;
  const [draft, setDraft] = useState<Draft>(() => initialDraft(item));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPlates, setShowPlates] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const buildPayload = (): SetPayload | string => {
    const effort = parseNumber(draft.effort);
    const base: SetPayload = { exercise_id: item.exercise.id, set_type: draft.setType, effort };

    if (kind === 'timed') {
      const seconds = parseNumber(draft.seconds);
      if (!seconds) return 'Enter how many seconds.';
      return { ...base, duration_secs: Math.round(seconds) };
    }
    if (kind === 'cardio') {
      const minutes = parseNumber(draft.minutes);
      if (!minutes) return 'Enter how many minutes.';
      return { ...base, duration_secs: Math.round(minutes * 60), distance_km: parseNumber(draft.km) };
    }
    const reps = parseNumber(draft.reps);
    if (!reps) return 'Enter the reps.';
    const weight = parseNumber(draft.weight);
    if (kind === 'strength' && weight == null) return 'Enter the weight, 0 if there was none.';
    return { ...base, reps: Math.round(reps), weight_kg: weight };
  };

  const handleSubmit = async () => {
    const payload = buildPayload();
    if (typeof payload === 'string') {
      setError(payload);
      return;
    }
    setError(null);
    setIsSaving(true);
    tap();
    try {
      if (editingId !== null) {
        await onEditSet(editingId, payload);
        setEditingId(null);
      } else {
        await onLog(payload);
      }
    } catch {
      setError('Could not save that set, check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Tapping a logged set loads its numbers back into the inputs so it
  // can be corrected, rather than making people delete and retype.
  const startEditing = (set: LoggedSet) => {
    if (readOnly) return;
    setEditingId(set.id);
    setDraft({
      weight: set.weight_kg != null ? formatKg(set.weight_kg) : '',
      reps: set.reps != null ? String(set.reps) : '',
      seconds: set.duration_secs != null ? String(set.duration_secs) : '',
      minutes: set.duration_secs != null ? String(Math.round(set.duration_secs / 60)) : '',
      km: set.distance_km != null ? String(set.distance_km) : '',
      effort: set.effort != null ? String(set.effort) : '',
      setType: set.set_type,
    });
  };

  const useSuggestion = () => {
    if (!item.suggestion) return;
    update({
      weight: item.suggestion.weight_kg != null ? formatKg(item.suggestion.weight_kg) : draft.weight,
      reps: String(item.suggestion.reps),
    });
  };

  const targetWeight = parseNumber(draft.weight);
  const plates = showPlates && targetWeight ? plateBreakdown(targetWeight) : null;
  const canShowPlates = kind === 'strength' && item.exercise.equipment === 'barbell';

  const rangeText = item.rep_min === item.rep_max ? `${item.rep_min}` : `${item.rep_min}-${item.rep_max}`;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          {item.superset_group != null ? (
            <Text style={[styles.superset, { color: accent.base }]}>
              Superset {String.fromCharCode(64 + item.superset_group)}
            </Text>
          ) : null}
          <Text style={styles.name}>{item.exercise.name}</Text>
          <Text style={styles.meta}>
            {capitalise(item.exercise.muscle_group)}
            {kind === 'strength' || kind === 'bodyweight' ? ` · ${item.target_sets} x ${rangeText}` : ''}
            {item.rest_seconds ? ` · rest ${formatClock(item.rest_seconds)}` : ''}
          </Text>
        </View>
        {!readOnly ? (
          <Pressable onPress={onRemove} hitSlop={12} accessibilityLabel={`Remove ${item.exercise.name}`}>
            <Feather name="trash-2" size={18} color={Colors.inkSoft} />
          </Pressable>
        ) : null}
      </View>

      {!readOnly && item.suggestion ? (
        <Pressable onPress={useSuggestion} style={[styles.suggestion, { backgroundColor: accent.soft }]}>
          <Text style={[styles.suggestionTitle, { color: accent.deep }]}>
            {item.suggestion.weight_kg != null
              ? `Aim for ${formatKg(item.suggestion.weight_kg)} kg x ${item.suggestion.reps}`
              : `Aim for ${item.suggestion.reps} reps`}
          </Text>
          <Text style={[styles.suggestionReason, { color: accent.deep }]}>{item.suggestion.reason}</Text>
        </Pressable>
      ) : null}

      {item.last_sets.length > 0 ? (
        <Text style={styles.meta}>
          Last time: {item.last_sets.map((s) => describeSet(kind, s)).join(', ')}
        </Text>
      ) : null}

      {item.sets.map((set) => (
        <View key={set.id} style={[styles.setRow, editingId === set.id && { borderColor: accent.base, borderWidth: 1.5 }]}>
          <Pressable style={styles.setMain} onPress={() => startEditing(set)} disabled={readOnly}>
            <Text style={styles.setNumber}>{set.set_type === 'warmup' ? 'W' : set.set_number}</Text>
            <Text style={styles.setText}>{describeSet(kind, set)}</Text>
            {set.effort != null ? <Text style={styles.meta}>RPE {formatKg(set.effort)}</Text> : null}
            {set.set_type === 'drop' ? <Text style={styles.meta}>drop</Text> : null}
            {set.is_pr ? (
              <Text style={[styles.pr, { backgroundColor: accent.base }]}>PR</Text>
            ) : null}
          </Pressable>
          {!readOnly ? (
            <Pressable onPress={() => onDeleteSet(set.id)} hitSlop={10} accessibilityLabel="Delete set">
              <Feather name="x" size={18} color={Colors.inkSoft} />
            </Pressable>
          ) : null}
        </View>
      ))}

      {!readOnly ? (
        <View style={styles.inputs}>
          <View style={styles.inputRow}>
            {kind === 'strength' || kind === 'bodyweight' ? (
              <>
                <NumberBox label={kind === 'bodyweight' ? '+ kg' : 'kg'} value={draft.weight} onChange={(v) => update({ weight: v })} decimal />
                <NumberBox label="reps" value={draft.reps} onChange={(v) => update({ reps: v })} />
              </>
            ) : null}
            {kind === 'timed' ? (
              <NumberBox label="seconds" value={draft.seconds} onChange={(v) => update({ seconds: v })} />
            ) : null}
            {kind === 'cardio' ? (
              <>
                <NumberBox label="minutes" value={draft.minutes} onChange={(v) => update({ minutes: v })} decimal />
                <NumberBox label="km" value={draft.km} onChange={(v) => update({ km: v })} decimal />
              </>
            ) : null}
            <NumberBox label="RPE" value={draft.effort} onChange={(v) => update({ effort: v })} decimal />
          </View>

          {kind === 'strength' || kind === 'bodyweight' ? (
            <View style={styles.chipRow}>
              <Chip label="Working" selected={draft.setType === 'normal'} onPress={() => update({ setType: 'normal' })} />
              <Chip label="Warm-up" selected={draft.setType === 'warmup'} onPress={() => update({ setType: 'warmup' })} />
              <Chip label="Drop" selected={draft.setType === 'drop'} onPress={() => update({ setType: 'drop' })} />
              {canShowPlates ? (
                <Chip label="Plates" selected={showPlates} onPress={() => setShowPlates((v) => !v)} />
              ) : null}
            </View>
          ) : null}

          {plates ? (
            <Text style={styles.meta}>
              Per side: {plates.perSide.length ? plates.perSide.map((p) => formatKg(p)).join(' + ') : 'just the bar'}
              {plates.leftover > 0 ? ` (${plates.leftover} kg can't be made)` : ''}. Bar assumed 20 kg.
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isSaving}
            style={[styles.logButton, { backgroundColor: accent.base }, isSaving && { opacity: 0.5 }]}
          >
            <Text style={styles.logLabel}>
              {editingId !== null ? 'Update set' : `Log set ${item.sets.length + 1}`}
            </Text>
          </Pressable>
          {editingId !== null ? (
            <Pressable onPress={() => setEditingId(null)}>
              <Text style={[styles.meta, styles.cancelEdit]}>Cancel edit</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

type NumberBoxProps = { label: string; value: string; onChange: (value: string) => void; decimal?: boolean };

// A compact label-over-input pair. Not the shared TextField on purpose,
// that one carries a full-width label and error line, which would make
// a row of three or four inputs far too tall for a phone.
function NumberBox({ label, value, onChange, decimal }: NumberBoxProps) {
  return (
    <View style={styles.numberBox}>
      <Text style={styles.numberLabel}>{label}</Text>
      <TextInput
        style={styles.numberInput}
        value={value}
        onChangeText={onChange}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        placeholder="0"
        placeholderTextColor={Colors.inkSoft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, marginBottom: Spacing.md },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  name: { ...Type.title, color: Colors.ink },
  meta: { ...Type.caption },
  superset: { ...Type.label, textTransform: 'uppercase', fontSize: 11 },
  suggestion: { borderRadius: Radius.md, padding: Spacing.sm + 2, gap: 2 },
  suggestionTitle: { ...Type.label, fontSize: 14 },
  suggestionReason: { ...Type.caption, color: Colors.ink },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  setMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  setNumber: { ...Type.statSmall, color: Colors.inkSoft, width: 22 },
  setText: { ...Type.body, color: Colors.ink, fontWeight: '600' },
  pr: {
    ...Type.label,
    color: '#FFFFFF',
    fontSize: 11,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  inputs: { gap: Spacing.sm, marginTop: Spacing.xs },
  inputRow: { flexDirection: 'row', gap: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  numberBox: { flex: 1, gap: 2 },
  numberLabel: { ...Type.caption },
  numberInput: {
    ...Type.statSmall,
    color: Colors.ink,
    backgroundColor: Colors.paper,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    textAlign: 'center',
    minWidth: 0,
  },
  logButton: { borderRadius: Radius.pill, paddingVertical: Spacing.md, alignItems: 'center' },
  logLabel: { ...Type.label, color: '#FFFFFF', fontSize: 15 },
  cancelEdit: { textAlign: 'center' },
  error: { ...Type.caption, color: Colors.danger },
});
