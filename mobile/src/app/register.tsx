import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { TextField } from '@/components/ui/TextField';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

export default function RegisterScreen() {
  const { register, isLoading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    const succeeded = await register(username.trim(), email.trim(), password);
    if (succeeded) {
      router.replace('/home');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <View>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Takes about a minute, that's it.</Text>
        </View>

        <View style={styles.form}>
          <TextField label="Username" value={username} onChangeText={setUsername} />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Create account" onPress={handleSubmit} loading={isLoading} />
        </View>

        <Link href="/login" style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Log in</Text>
        </Link>
      </View>
    </ScreenContainer>
  );
}

// Styles deliberately match login.tsx's shape field for field. They're
// the two halves of one flow, a person bouncing between them via the
// links below shouldn't see anything shift.
const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.xl,
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
    color: Colors.dusk,
  },
});
