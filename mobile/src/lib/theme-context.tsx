// ------------------------------------------------------
// theme-context.tsx — Prestige Accent State
// ------------------------------------------------------
// Holds whichever prestige colour is currently active and
// keeps it lined up with the signed-in account. Register
// and Settings both read and write through this rather
// than keeping their own copies of the choice
// ------------------------------------------------------

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { DEFAULT_PRESTIGE, getPrestigeTone, type PrestigeKey, type PrestigeTone } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';

type ThemeContextValue = {
  accentKey: PrestigeKey;
  accent: PrestigeTone;
  // Changes what's on screen straight away, doesn't touch the server.
  // Register uses this alone, for a live preview before the account
  // even exists yet. Settings calls this AND api.updateSettings, see
  // the comment on that function for why it's two calls and not one.
  previewAccent: (key: PrestigeKey) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accentKey, setAccentKey] = useState<PrestigeKey>(DEFAULT_PRESTIGE);

  // Whenever the signed-in user changes, whether that's logging in,
  // logging out, or a settings update coming back from the server,
  // fall in line with whatever that account actually has saved. This
  // is what stops a stale preview from register.tsx following someone
  // into their real account if the two happen to differ.
  useEffect(() => {
    if (user?.theme_color) {
      setAccentKey(user.theme_color as PrestigeKey);
    } else {
      setAccentKey(DEFAULT_PRESTIGE);
    }
  }, [user?.theme_color]);

  const value: ThemeContextValue = {
    accentKey,
    accent: getPrestigeTone(accentKey),
    previewAccent: setAccentKey,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
