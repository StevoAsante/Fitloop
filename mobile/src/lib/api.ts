// ------------------------------------------------------
// api.ts — FitLoop Backend Client
// ------------------------------------------------------
// Every fetch call the app makes to the Flask backend
// goes through here, so there's exactly one place that
// knows the base URL, the request shape, and how errors
// come back
// ------------------------------------------------------

// The base URL comes from an env var rather than being hardcoded,
// because "localhost" means a different thing depending on where this
// is actually running:
//   - web: localhost works, browser and server are the same machine
//   - iOS simulator: localhost also works, same reason
//   - Android emulator: needs 10.0.2.2, which the emulator maps to the
//     host's localhost
//   - a physical phone in Expo Go: needs the host machine's real LAN
//     IP (e.g. 192.168.1.23), the phone isn't the host machine
// Set EXPO_PUBLIC_API_URL in a .env file per environment, see the
// mobile README for the exact value for each case above. The fallback
// below only covers the web/simulator case, a phone on Expo Go still
// needs its own .env value or it'll hit this same "could not reach
// the server" message every login screen shows for a network failure.
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export type User = {
  id: number;
  username: string;
  theme_color: string;
  coaching_style: string;
};

export type DailyLogPayload = {
  user_id: number;
  log_date?: string; // YYYY-MM-DD, omit to let the server default to today
  sleep_hours?: number;
  steps?: number;
  mood?: number;
  study_hours?: number;
};

export type DailyLogEntry = {
  date: string;
  sleep_hours: number | null;
  steps: number | null;
  mood: number | null;
  study_hours: number | null;
};

export type CoachMessage = {
  headline: string;
  detail: string;
  metric: string;
};

export type SettingsPayload = {
  theme_color?: string;
  coaching_style?: string;
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  // The backend returns JSON on both success and failure (e.g.
  // {"error": "invalid credentials"}), so parse the body first and
  // decide what to do based on status, rather than branching on
  // response.ok before looking at what actually came back.
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.error ?? `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export function login(username: string, password: string) {
  return request<User>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export function register(username: string, email: string, password: string, themeColor: string) {
  return request<User>('/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password, theme_color: themeColor }),
  });
}

export function updateSettings(userId: number, payload: SettingsPayload) {
  return request<User>(`/users/${userId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createLog(payload: DailyLogPayload) {
  return request<{ id: number }>('/logs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getLogs(userId: number, days = 7) {
  return request<DailyLogEntry[]>(`/users/${userId}/logs?days=${days}`);
}

export function getCoachCheck(userId: number) {
  return request<{ messages: CoachMessage[] }>(`/users/${userId}/coach-check`);
}
