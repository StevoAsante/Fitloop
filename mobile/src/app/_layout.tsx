import { Stack } from 'expo-router';

import '@/global.css';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth-context';

// No tab bar, no animated splash. Right now there's a linear flow
// (login or register, then home), tabs are worth adding once there's a
// second top-level destination, for instance the social feed, to switch
// between.
export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.paper },
        }}
      />
    </AuthProvider>
  );
}
