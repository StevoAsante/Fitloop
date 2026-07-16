// ------------------------------------------------------
// ScreenContainer.tsx — Screen Wrapper
// ------------------------------------------------------
// Safe area, keyboard avoidance, and the background colour
// every screen needs, handled once here rather than copied
// into each screen file
// ------------------------------------------------------

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  type RefreshControlProps,
} from 'react-native';
import type { ReactElement } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';

type ScreenContainerProps = {
  children: React.ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
};

// Every screen with a form needs keyboard avoidance, and every screen
// needs the same background and side padding, so that's handled once
// here instead of re-added to each screen file. `scroll` is opt-in
// rather than default-on since not every screen (the login form, for
// instance) has content that can overflow the viewport.
export function ScreenContainer({ children, scroll = false, refreshControl }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={refreshControl}>
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.paper,
  },
  flex: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
});
