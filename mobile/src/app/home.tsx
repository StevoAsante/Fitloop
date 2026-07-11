import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { CoachMessageCard } from '@/components/CoachMessageCard';
import { WeekStrip } from '@/components/WeekStrip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Colors, Spacing, Type } from '@/constants/theme';
import * as api from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [logs, setLogs] = useState<api.DailyLogEntry[]>([]);
  const [messages, setMessages] = useState<api.CoachMessage[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [sleepHours, setSleepHours] = useState('');
  const [steps, setSteps] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [weekLogs, coachCheck] = await Promise.all([
        api.getLogs(user.id),
        api.getCoachCheck(user.id),
      ]);
      setLogs(weekLogs);
      setMessages(coachCheck.messages);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof api.ApiError ? err.message : 'Could not reach the server.');
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  // Sleep and steps only, matching the two metrics the backend's
  // METRIC_RULES actually coaches on right now. Mood and study hours
  // are real fields in the API already, they're just not wired into a
  // form yet, add them here once there's a coach template that uses them
  // rather than collecting numbers nobody reads back.
  const handleQuickLog = async () => {
    if (!user) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await api.createLog({
        user_id: user.id,
        sleep_hours: sleepHours ? Number(sleepHours) : undefined,
        steps: steps ? Number(steps) : undefined,
      });
      setSleepHours('');
      setSteps('');
      await load();
    } catch (err) {
      setSaveError(err instanceof api.ApiError ? err.message : 'Could not reach the server.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenContainer
      scroll
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Hey {user?.username}</Text>
        <Text onPress={handleLogout} style={styles.logout}>
          Log out
        </Text>
      </View>

      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      <Text style={styles.sectionLabel}>This week</Text>
      <WeekStrip logs={logs} />

      {messages.map((message) => (
        <View key={message.metric} style={styles.messageSpacing}>
          <CoachMessageCard message={message} />
        </View>
      ))}

      <Card style={styles.logCard}>
        <Text style={styles.sectionLabel}>Log today</Text>
        <TextField
          label="Sleep (hours)"
          value={sleepHours}
          onChangeText={setSleepHours}
          keyboardType="decimal-pad"
        />
        <TextField label="Steps" value={steps} onChangeText={setSteps} keyboardType="number-pad" />
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        <Button label="Save" onPress={handleQuickLog} loading={isSaving} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Type.display,
    color: Colors.ink,
  },
  logout: {
    ...Type.label,
    color: Colors.inkSoft,
  },
  sectionLabel: {
    ...Type.label,
    color: Colors.inkSoft,
    marginBottom: Spacing.sm,
  },
  error: {
    ...Type.caption,
    color: Colors.danger,
    marginBottom: Spacing.sm,
  },
  messageSpacing: {
    marginTop: Spacing.md,
  },
  logCard: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
});
