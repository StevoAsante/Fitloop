// ------------------------------------------------------
// login.tsx — Log In Screen
// ------------------------------------------------------
// First thing most people see, so it carries the wordmark
// treatment rather than jumping straight to the form,
// everything else in the app is calmer than this on purpose
// ------------------------------------------------------

import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';

export default function LoginScreen() {
  const { login, isLoading, error } = useAuth();
  const { accent } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    const succeeded = await login(username.trim(), password);
    if (succeeded) {
      router.replace('/home');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View>
          <Text style={[styles.wordmark, { color: accent.base }]}>FitLoop</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Log in to see how your week&apos;s going.</Text>
        </View>

        <View style={styles.form}>
          <TextField label="Username" value={username} onChangeText={setUsername} />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Log in" onPress={handleSubmit} loading={isLoading} />
        </View>

        <Link href="/register" style={styles.link}>
          <Text style={[styles.linkText, { color: accent.base }]}>New here? Create an account</Text>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  wordmark: {
    ...Type.wordmark,
    marginBottom: Spacing.lg,
  },
  title: {
    ...Type.display,
    color: Colors.ink,
  },
  subtitle: {
    ...Type.body,
    color: Colors.inkSoft,
    marginTop: Spacing.xs,
  },
  form: {
    gap: Spacing.md,
  },
  error: {
    ...Type.caption,
    color: Colors.danger,
  },
  link: {
    alignSelf: 'center',
  },
  linkText: {
    ...Type.label,
  },
});
