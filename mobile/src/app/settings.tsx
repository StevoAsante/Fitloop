// ------------------------------------------------------
// settings.tsx — Settings Screen
// ------------------------------------------------------
// Change your prestige colour, change how direct the coach
// is, or sign out. Both the colour and coaching style save
// straight away when tapped, there's no separate save
// button to forget to press
// ------------------------------------------------------

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { ThemeSwatchPicker } from '@/components/ThemeSwatchPicker';
import { Colors, Radius, Spacing, Type, type PrestigeKey } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

const COACHING_STYLES: { key: string; label: string; blurb: string }[] = [
  { key: 'gentle', label: 'Gentle', blurb: 'Soft nudges, no pressure.' },
  { key: 'direct', label: 'Direct', blurb: 'Short and to the point.' },
];

export default function SettingsScreen() {
  const { user, updateSettings, logout } = useAuth();
  const { accentKey, accent, previewAccent } = useTheme();
  const [savingError, setSavingError] = useState<string | null>(null);

  const handlePickColor = async (key: PrestigeKey) => {
    previewAccent(key); // instant, so the screen doesn't wait on the network to feel responsive
    setSavingError(null);
    const succeeded = await updateSettings({ theme_color: key });
    if (!succeeded) {
      setSavingError("Couldn't save that, but it'll look right until you leave this screen.");
    }
  };

  const handlePickCoachingStyle = async (key: string) => {
    setSavingError(null);
    const succeeded = await updateSettings({ coaching_style: key });
    if (!succeeded) {
      setSavingError("Couldn't save that just now, try again in a moment.");
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Feather name="chevron-left" size={24} color={Colors.ink} onPress={() => router.back()} />
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionLabel}>Prestige colour</Text>
        <ThemeSwatchPicker selected={accentKey} onSelect={handlePickColor} />
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionLabel}>Coaching style</Text>
        <View style={styles.styleRow}>
          {COACHING_STYLES.map((style) => {
            const isSelected = (user?.coaching_style ?? 'gentle') === style.key;
            return (
              <Pressable
                key={style.key}
                onPress={() => handlePickCoachingStyle(style.key)}
                style={[
                  styles.styleOption,
                  isSelected && { borderColor: accent.base, backgroundColor: accent.soft },
                ]}
              >
                <Text style={[styles.styleLabel, isSelected && { color: accent.deep }]}>{style.label}</Text>
                <Text style={styles.styleBlurb}>{style.blurb}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {savingError ? <Text style={styles.error}>{savingError}</Text> : null}

      <Button label="Log out" variant="secondary" onPress={handleLogout} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerSpacer: {
    width: 24, // balances the back chevron so the title stays visually centred
  },
  title: {
    ...Type.title,
    color: Colors.ink,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...Type.label,
    color: Colors.inkSoft,
    marginBottom: Spacing.md,
  },
  styleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  styleOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.mist,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 2,
  },
  styleLabel: {
    ...Type.body,
    fontWeight: '600',
    color: Colors.ink,
  },
  styleBlurb: {
    ...Type.caption,
  },
  error: {
    ...Type.caption,
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
