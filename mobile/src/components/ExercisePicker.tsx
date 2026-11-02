// ------------------------------------------------------
// ExercisePicker.tsx — Pick an Exercise From the Library
// ------------------------------------------------------
// A full-screen modal with search and muscle chips, used
// by the routine editor and by the workout screen's "add
// exercise". Loads the whole visible library once and
// filters on the device, at a few hundred rows that's
// instant and it means typing never waits on the network
// ------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { Chip } from '@/components/Chip';
import { TextField } from '@/components/ui/TextField';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { capitalise } from '@/lib/format';
import { useAuth } from '@/lib/auth-context';

type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  onPick: (exercise: api.Exercise) => void;
};

export function ExercisePicker({ visible, onClose, onPick }: ExercisePickerProps) {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<api.Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetches when the modal opens rather than on mount, so a freshly
  // created custom exercise is there next time without a manual refresh.
  useEffect(() => {
    if (!visible || !user) return;
    api
      .getExercises(user.id)
      .then((rows) => {
        setExercises(rows);
        setError(null);
      })
      .catch(() => setError('Could not load the exercise library.'));
  }, [visible, user]);

  const muscles = useMemo(() => Array.from(new Set(exercises.map((e) => e.muscle_group))).sort(), [exercises]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return exercises.filter(
      (e) => (!muscle || e.muscle_group === muscle) && (!needle || e.name.toLowerCase().includes(needle)),
    );
  }, [exercises, search, muscle]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Add exercise</Text>
          <Pressable onPress={onClose} accessibilityLabel="Close" hitSlop={12}>
            <Feather name="x" size={24} color={Colors.ink} />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <TextField label="Search" value={search} onChangeText={setSearch} placeholder="e.g. squat" />
        </View>

        <View style={styles.chipRow}>
          <Chip label="All" selected={muscle === null} onPress={() => setMuscle(null)} />
          {muscles.map((m) => (
            <Chip key={m} label={capitalise(m)} selected={muscle === m} onPress={() => setMuscle(m)} />
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Nothing matches that search.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => {
                onPick(item);
                onClose();
              }}
            >
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <Text style={styles.rowMeta}>
                  {capitalise(item.muscle_group)} · {capitalise(item.equipment)}
                </Text>
              </View>
              <Feather name="plus" size={20} color={Colors.inkSoft} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.paper },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { ...Type.display, color: Colors.ink },
  searchBox: { paddingHorizontal: Spacing.lg },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowTitle: { ...Type.body, color: Colors.ink, fontWeight: '600' },
  rowMeta: { ...Type.caption },
  empty: { ...Type.body, color: Colors.inkSoft, textAlign: 'center', marginTop: Spacing.lg },
  error: { ...Type.caption, color: Colors.danger, paddingHorizontal: Spacing.lg },
});
