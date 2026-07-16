// ------------------------------------------------------
// auth-context.tsx — Session State
// ------------------------------------------------------
// Holds whoever's currently signed in and the three calls
// that change that: login, register, logout. Also carries
// settings updates, since a settings change really just
// means "the signed-in user object changed"
// ------------------------------------------------------

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import * as api from './api';

type AuthContextValue = {
  user: api.User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string, themeColor: string) => Promise<boolean>;
  updateSettings: (payload: api.SettingsPayload) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Session lives in memory only, on purpose, it matches the backend's own
// placeholder auth (see the comment on /login in the backend's app.py):
// there's no real token yet, just a user id. Persisting that with
// SecureStore would give a false sense of "staying logged in" that the
// backend doesn't actually back up with anything secure. Add real
// persistence once there's a token worth keeping across app restarts.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<api.User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // login, register, and updateSettings all return a plain boolean
  // rather than throwing, so the screen calling them can just check
  // the result instead of needing its own try/catch, the error
  // message itself is already sitting in context ready to display.
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const loggedInUser = await api.login(username, password);
      setUser(loggedInUser);
      return true;
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the server.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    username: string,
    email: string,
    password: string,
    themeColor: string
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await api.register(username, email, password, themeColor);
      setUser(newUser);
      return true;
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the server.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Settings screen calls this after someone taps a new colour or
  // flips their coaching style. It updates the account on the server
  // and then replaces the local user object with whatever came back,
  // which is what tells ThemeProvider (it watches user.theme_color) to
  // pick up the change everywhere else in the app, no separate wiring
  // needed between this file and theme-context.tsx.
  const updateSettings = async (payload: api.SettingsPayload): Promise<boolean> => {
    if (!user) return false;
    setError(null);
    try {
      const updatedUser = await api.updateSettings(user.id, payload);
      setUser(updatedUser);
      return true;
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the server.');
      return false;
    }
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({ user, isLoading, error, login, register, updateSettings, logout }),
    [user, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
