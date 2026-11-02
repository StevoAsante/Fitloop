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

// ------------------------------------------------------
// Training: library, routines, plan, workouts, stats
// ------------------------------------------------------
// Types mirror what training.py sends back. Weights are
// always kilograms on the wire, any lb display later
// should convert at the edge, never in here
// ------------------------------------------------------

export type ExerciseKind = 'strength' | 'bodyweight' | 'timed' | 'cardio';
export type SetType = 'normal' | 'warmup' | 'drop';
export type ProgressionRule = 'none' | 'linear' | 'double';

export type Exercise = {
  id: number;
  name: string;
  muscle_group: string;
  equipment: string;
  kind: ExerciseKind;
  instructions: string | null;
  is_custom: boolean;
};

export type RoutineItem = {
  exercise: Exercise;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  progression: ProgressionRule;
  increment_kg: number;
  superset_group: number | null;
};

export type Routine = {
  id: number;
  name: string;
  notes: string | null;
  items: RoutineItem[];
};

// What the editor sends back. Only the exercise id is needed, the
// server looks the rest of it up.
export type RoutineItemPayload = Omit<RoutineItem, 'exercise'> & { exercise_id: number };

export type PlanState = {
  mode: 'weekly' | 'rotation';
  weekly: (number | null)[]; // Monday first
  rotation: number[];
};

export type TodayState = {
  mode: 'weekly' | 'rotation';
  routine: Routine | null;
  active_workout_id: number | null;
};

export type LoggedSet = {
  id: number;
  exercise_id: number;
  set_number: number;
  weight_kg: number | null;
  reps: number | null;
  duration_secs: number | null;
  distance_km: number | null;
  effort: number | null;
  set_type: SetType;
  is_pr: boolean;
  records?: string[]; // only present on the response to logging or editing a set
};

export type Suggestion = {
  weight_kg: number | null;
  reps: number;
  reason: string;
};

export type WorkoutExercise = {
  id: number;
  exercise: Exercise;
  target_sets: number;
  rep_min: number;
  rep_max: number;
  rest_seconds: number;
  progression: ProgressionRule;
  superset_group: number | null;
  last_sets: LoggedSet[];
  suggestion: Suggestion | null;
  sets: LoggedSet[];
};

export type Workout = {
  id: number;
  name: string;
  routine_id: number | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  exercises: WorkoutExercise[];
  resumed?: boolean;
};

export type WorkoutSummary = {
  id: number;
  name: string;
  started_at: string;
  finished_at: string | null;
  duration_secs: number | null;
  set_count: number;
  volume_kg: number;
  pr_count: number;
  prs?: { exercise: string; weight_kg: number | null; reps: number | null; duration_secs: number | null }[];
};

export type SetPayload = {
  exercise_id: number;
  weight_kg?: number | null;
  reps?: number | null;
  duration_secs?: number | null;
  distance_km?: number | null;
  effort?: number | null;
  set_type?: SetType;
};

export type ExerciseProgress = {
  exercise: Exercise;
  history: {
    workout_id: number;
    date: string;
    top_weight_kg: number;
    best_e1rm: number;
    volume_kg: number;
    best_seconds: number;
  }[];
  bests: { weight_kg: number; e1rm: number; reps: number; seconds: number };
};

export type TrainingStats = {
  heatmap: Record<string, number>;
  workouts_this_week: number;
  muscles_this_week: { muscle: string; sets: number; volume_kg: number }[];
  recent_prs: {
    exercise: string;
    exercise_id: number;
    weight_kg: number | null;
    reps: number | null;
    duration_secs: number | null;
    date: string;
  }[];
};

export type ExerciseFilters = { q?: string; muscle?: string; equipment?: string };

export function getExercises(userId: number, filters: ExerciseFilters = {}) {
  const params = new URLSearchParams({ user_id: String(userId) });
  if (filters.q) params.set('q', filters.q);
  if (filters.muscle) params.set('muscle', filters.muscle);
  if (filters.equipment) params.set('equipment', filters.equipment);
  return request<Exercise[]>(`/exercises?${params.toString()}`);
}

export function createExercise(
  userId: number,
  payload: { name: string; muscle_group: string; equipment: string; kind: ExerciseKind; instructions?: string },
) {
  return request<Exercise>(`/users/${userId}/exercises`, { method: 'POST', body: JSON.stringify(payload) });
}

export function getRoutines(userId: number) {
  return request<Routine[]>(`/users/${userId}/routines`);
}

export function getRoutine(routineId: number) {
  return request<Routine>(`/routines/${routineId}`);
}

export function saveRoutine(
  userId: number,
  routineId: number | null,
  payload: { name: string; notes?: string; items: RoutineItemPayload[] },
) {
  // One function for create and update, the editor screen doesn't care
  // which it is, it just has a routine it wants stored.
  return routineId === null
    ? request<Routine>(`/users/${userId}/routines`, { method: 'POST', body: JSON.stringify(payload) })
    : request<Routine>(`/routines/${routineId}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function deleteRoutine(routineId: number) {
  return request<null>(`/routines/${routineId}`, { method: 'DELETE' });
}

export function getPlan(userId: number) {
  return request<PlanState>(`/users/${userId}/plan`);
}

export function updatePlan(userId: number, payload: Partial<PlanState>) {
  return request<PlanState>(`/users/${userId}/plan`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function getToday(userId: number, localDate: string) {
  return request<TodayState>(`/users/${userId}/today?date=${localDate}`);
}

export function startWorkout(userId: number, payload: { routine_id?: number; name?: string } = {}) {
  return request<Workout>(`/users/${userId}/workouts`, { method: 'POST', body: JSON.stringify(payload) });
}

export function getWorkout(workoutId: number) {
  return request<Workout>(`/workouts/${workoutId}`);
}

export function getWorkoutHistory(userId: number, limit = 20, offset = 0) {
  return request<WorkoutSummary[]>(`/users/${userId}/workouts?limit=${limit}&offset=${offset}`);
}

export function updateWorkout(workoutId: number, payload: { name?: string; notes?: string; started_at?: string }) {
  return request<Workout>(`/workouts/${workoutId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function finishWorkout(workoutId: number, notes?: string) {
  return request<WorkoutSummary>(`/workouts/${workoutId}/finish`, {
    method: 'POST',
    body: JSON.stringify(notes ? { notes } : {}),
  });
}

export function deleteWorkout(workoutId: number) {
  return request<null>(`/workouts/${workoutId}`, { method: 'DELETE' });
}

export function addWorkoutExercise(workoutId: number, exerciseId: number) {
  return request<Workout>(`/workouts/${workoutId}/exercises`, {
    method: 'POST',
    body: JSON.stringify({ exercise_id: exerciseId }),
  });
}

export function removeWorkoutExercise(workoutId: number, itemId: number) {
  return request<Workout>(`/workouts/${workoutId}/exercises/${itemId}`, { method: 'DELETE' });
}

export function logSet(workoutId: number, payload: SetPayload) {
  return request<LoggedSet>(`/workouts/${workoutId}/sets`, { method: 'POST', body: JSON.stringify(payload) });
}

export function editSet(setId: number, payload: Partial<SetPayload>) {
  return request<LoggedSet>(`/sets/${setId}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteSet(setId: number) {
  return request<null>(`/sets/${setId}`, { method: 'DELETE' });
}

export function getExerciseProgress(userId: number, exerciseId: number) {
  return request<ExerciseProgress>(`/users/${userId}/exercises/${exerciseId}/progress`);
}

export function getTrainingStats(userId: number) {
  return request<TrainingStats>(`/users/${userId}/stats`);
}
