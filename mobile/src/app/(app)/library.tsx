// ------------------------------------------------------
// library.tsx — Exercise Library Tab
// ------------------------------------------------------
// Browse and search every exercise, and add your own
// custom ones. Same idea as the original library.js
// (search plus muscle and equipment filters), but the
// filtering runs on the device against one fetched list,
// so typing feels instant instead of waiting on the server
// for every keystroke
// ------------------------------------------------------

import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Chip } from '@/components/Chip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Colors, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { capitalise } from '@/lib/format';

const KINDS: { key: api.ExerciseKind; label: string }[] = [
  { key: 'strength', label: 'Weights' },
  { key: 'bodyweight', label: 'Bodyweight' },
  { key: 'timed', label: 'Timed hold' },
  { key: 'cardio', label: 'Cardio' },
];

export default function LibraryScreen() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<api.Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newMuscle, setNewMuscle] = useState('');
  const [newEquipment, setNewEquipment] = useState('');
  const [newKind, setNewKind] = useState<api.ExerciseKind>('strength');
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setExercises(await api.getExercises(user.id));
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

  const muscles = useMemo(() => Array.from(new Set(exercises.map((e) => e.muscle_group))).sort(), [exercises]);
  const equipmentList = useMemo(() => Array.from(new Set(exercises.map((e) => e.equipment))).sort(), [exercises]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exercises.filter(
      (e) =>
        (!muscle || e.muscle_group === muscle) &&
        (!equipment || e.equipment === equipment) &&
        (!needle || e.name.toLowerCase().includes(needle)),
    );
  }, [exercises, search, muscle, equipment]);

  const handleCreate = async () => {
    if (!user) return;
    setCreateError(null);
    try {
      await api.createExercise(user.id, {
        name: newName.trim(),
        muscle_group: newMuscle.trim() || 'other',
        equipment: newEquipment.trim() || 'other',
        kind: newKind,
      });
      setNewName('');
      setNewMuscle('');
      setNewEquipment('');
      setCreating(false);
      await load();
    } catch (err) {
      setCreateError(err instanceof api.ApiError ? err.message : 'Could not create the exercise.');
    }
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.title}>Library</Text>
        <Pressable onPress={() => setCreating((v) => !v)} accessibilityLabel="Add custom exercise" hitSlop={10}>
          <Feather name={creating ? 'x' : 'plus'} size={24} color={Colors.ink} />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {creating ? (
        <Card style={styles.createCard}>
          <Text style={styles.sectionLabel}>Custom exercise</Text>
          <TextField label="Name" value={newName} onChangeText={setNewName} autoCapitalize="words" />
          <TextField label="Muscle group" value={newMuscle} onChangeText={setNewMuscle} placeholder="e.g. chest" />
          <TextField label="Equipment" value={newEquipment} onChangeText={setNewEquipment} placeholder="e.g. dumbbell" />
          <Text style={styles.sectionLabel}>How is it logged?</Text>
          <View style={styles.chipRow}>
            {KINDS.map((kind) => (
              <Chip key={kind.key} label={kind.label} selected={newKind === kind.key} onPress={() => setNewKind(kind.key)} />
            ))}
          </View>
          {createError ? <Text style={styles.error}>{createError}</Text> : null}
          <Button label="Create exercise" onPress={handleCreate} disabled={!newName.trim()} />
        </Card>
      ) : null}

      <TextField label="Search" value={search} onChangeText={setSearch} placeholder="Search exercises" />

      <Text style={[styles.sectionLabel, styles.filterLabel]}>Muscle</Text>
      <View style={styles.chipRow}>
        <Chip label="All" selected={muscle === null} onPress={() => setMuscle(null)} />
        {muscles.map((m) => (
          <Chip key={m} label={capitalise(m)} selected={muscle === m} onPress={() => setMuscle(m)} />
        ))}
      </View>

      <Text style={[styles.sectionLabel, styles.filterLabel]}>Equipment</Text>
      <View style={styles.chipRow}>
        <Chip label="Any" selected={equipment === null} onPress={() => setEquipment(null)} />
        {equipmentList.map((e) => (
          <Chip key={e} label={capitalise(e)} selected={equipment === e} onPress={() => setEquipment(e)} />
        ))}
      </View>

      <View style={styles.list}>
        {filtered.length === 0 ? <Text style={styles.body}>Nothing matches those filters.</Text> : null}
        {filtered.map((exercise) => (
          <Pressable key={exercise.id} onPress={() => router.push(`/exercise/${exercise.id}`)}>
            <Card style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.name}>{exercise.name}</Text>
                <Text style={styles.body}>
                  {capitalise(exercise.muscle_group)} · {capitalise(exercise.equipment)}
                  {exercise.is_custom ? ' · yours' : ''}
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={Colors.inkSoft} />
            </Card>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: { ...Type.display, color: Colors.ink },
  sectionLabel: { ...Type.label, color: Colors.inkSoft },
  filterLabel: { marginTop: Spacing.md, marginBottom: Spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  createCard: { gap: Spacing.md, marginBottom: Spacing.lg },
  list: { marginTop: Spacing.lg, gap: Spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { ...Type.title, color: Colors.ink, fontSize: 16 },
  body: { ...Type.body, color: Colors.inkSoft, fontSize: 14 },
  error: { ...Type.caption, color: Colors.danger, marginBottom: Spacing.sm },
});
