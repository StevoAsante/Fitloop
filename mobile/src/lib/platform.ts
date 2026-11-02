// ------------------------------------------------------
// platform.ts — Cross-Platform Helpers
// ------------------------------------------------------
// The handful of things that work differently on iOS,
// Android and web: buzzing the phone, asking "are you
// sure", and stopping the screen from sleeping mid-set.
// Everything here is safe to call anywhere, on a platform
// that can't do the thing it quietly does nothing instead
// of throwing
// ------------------------------------------------------

import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// Light tap for ordinary presses. The browser has no haptics API worth
// relying on (navigator.vibrate is missing on iOS Safari), so web just
// skips it rather than half-working on some browsers.
export function tap() {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

// Stronger, two-beat feedback for the moments that deserve it, a new
// record or the rest timer finishing.
export function celebrate() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

// Alert.alert does nothing on react-native-web, the button callbacks
// never fire, so a "delete workout?" prompt would silently be dead in
// the browser. window.confirm is crude but it works everywhere a
// browser does, and native gets the proper two-button alert.
export function confirmAction(title: string, message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

// Keeps the screen on while `active` is true. Nobody wants the phone to
// lock between sets, then log in again with chalky hands. On web this
// uses the Wake Lock API where the browser has it, and the promise just
// rejects where it doesn't, which the catch swallows.
export function useScreenAwake(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const tag = 'fitloop-workout';
    activateKeepAwakeAsync(tag).catch(() => {});
    return () => {
      deactivateKeepAwake(tag).catch(() => {});
    };
  }, [active]);
}
