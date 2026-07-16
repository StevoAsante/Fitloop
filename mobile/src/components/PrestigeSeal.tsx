// ------------------------------------------------------
// PrestigeSeal.tsx — Circular Stat Badge
// ------------------------------------------------------
// The big number on the home screen, styled like a medal
// rather than a plain stat card. Built to be reused later
// wherever else a number deserves the same treatment, an
// achievements screen for instance, so it only takes a
// value and a label, nothing home-screen-specific baked in
// ------------------------------------------------------

import { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { Type, type PrestigeTone } from '@/constants/theme';

type PrestigeSealProps = {
  value: string | number;
  label: string;
  tone: PrestigeTone;
};

export function PrestigeSeal({ value, label, tone }: PrestigeSealProps) {
  // A quick scale-in on mount, the kind of small flourish a medal
  // deserves. Just the one animation and nothing looping, a badge
  // that never stops moving reads as a loading spinner, not an
  // achievement.
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 140 });
    opacity.value = withSpring(1, { damping: 20 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.ring, { borderColor: tone.base }, animatedStyle]}>
      <LinearGradient
        colors={[tone.base, tone.deep]}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={styles.gradient}
      >
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const SIZE = 168;

const styles = StyleSheet.create({
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 3,
    padding: 4,
    alignSelf: 'center',
  },
  gradient: {
    flex: 1,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    // A shadow under the seal itself, not the wrapping ring, so it
    // reads as the medal catching light rather than the card floating.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  value: {
    ...Type.statHero,
    color: '#FFFFFF',
  },
  label: {
    ...Type.label,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    marginTop: -4,
  },
});
