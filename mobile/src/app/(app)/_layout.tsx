// ------------------------------------------------------
// (app)/_layout.tsx — Main Tab Bar
// ------------------------------------------------------
// The five top-level destinations once someone's signed
// in: Home, Train, Plan, Library, Progress. The folder name
// in brackets is an Expo Router "group", it organises the
// files without adding "/app" to any URL, so /home still
// works exactly as login and register already expect.
// Settings, the workout logger and the editors sit outside
// the group on purpose, they're full screens you step into
// and back out of, not places you switch between
// ------------------------------------------------------

import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

// Pulled out so the five tabs below stay a readable list rather than
// five copies of the same icon render function.
function tabIcon(name: FeatherName) {
  return ({ color, size }: { color: ColorValue; size: number }) => <Feather name={name} size={size} color={color} />;
}

export default function AppTabs() {
  const { accent } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent.base,
        tabBarInactiveTintColor: Colors.inkSoft,
        tabBarStyle: { backgroundColor: Colors.card, borderTopColor: Colors.mist },
        tabBarLabelStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="train" options={{ title: 'Train', tabBarIcon: tabIcon('activity') }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: tabIcon('book-open') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: tabIcon('trending-up') }} />
    </Tabs>
  );
}
