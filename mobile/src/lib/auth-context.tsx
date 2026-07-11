import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import * as api from './api';

type AuthContextValue = {
  user: api.User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
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

  // Both login and register return a plain boolean rather than throwing,
  // so the screen that calls them can just check the result instead of
  // needing its own try/catch around every call, the error message
  // itself is already sitting in context for the screen to display.
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

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await api.register(username, email, password);
      setUser(newUser);
      return true;
    } catch (err) {
      setError(err instanceof api.ApiError ? err.message : 'Could not reach the server.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => setUser(null);

  const value = useMemo(
    () => ({ user, isLoading, error, login, register, logout }),
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
