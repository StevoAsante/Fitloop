// ------------------------------------------------------
// _layout.tsx — Root Layout
// ------------------------------------------------------
// Loads the two custom typefaces, wraps the whole app in
// AuthProvider then ThemeProvider (theme depends on auth,
// see theme-context.tsx, so it has to sit inside it), and
// sets up the router shell everything else renders into
// ------------------------------------------------------

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  BigShouldersDisplay_600SemiBold,
  BigShouldersDisplay_800ExtraBold,
} from '@expo-google-fonts/big-shoulders-display';

import '@/global.css';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth-context';
import { ThemeProvider } from '@/lib/theme-context';

// Keeps the native splash screen up until the fonts below are ready,
// otherwise there's a flash of system-font text for a frame before
// Fraunces and Big Shoulders Display swap in, which looks like a bug
// even though it's just normal async loading.
SplashScreen.preventAutoHideAsync();

// No tab bar. Right now there's a linear flow (login or register, then
// home, with settings a step off home), tabs are worth adding once
// there's a second top-level destination, the social feed, to switch
// between.
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Fraunces_700Bold,
    BigShouldersDisplay_600SemiBold,
    BigShouldersDisplay_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Nothing renders until the fonts are in, rather than rendering with
  // a system-font fallback first. A screen that pops from one typeface
  // to another a moment later feels broken, a blank frame for a few
  // hundred ms doesn't.
  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.paper },
          }}
        />
      </ThemeProvider>
    </AuthProvider>
  );
}
