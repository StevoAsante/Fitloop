// ------------------------------------------------------
// format.ts — Display Formatting
// ------------------------------------------------------
// Small pure helpers for turning raw numbers and ISO dates
// into what people read. Kept apart from the screens so the
// same weight or duration always looks identical wherever
// it shows up
// ------------------------------------------------------

// "1:05" style clock for timers and short holds.
export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// "52 min" or "1h 05m", for how long a session took.
export function formatDuration(totalSeconds: number | null | undefined) {
  if (!totalSeconds) return '0 min';
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

// Drops trailing zeros so 60 shows as "60" and 62.5 as "62.5".
export function formatKg(value: number | null | undefined) {
  if (value == null) return '-';
  return `${Number(value.toFixed(2))}`;
}

// Big totals read better as "12.4 t" than "12400 kg".
export function formatVolume(kg: number) {
  return kg >= 10000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;
}

// The user's own calendar day as YYYY-MM-DD. Built from local parts on
// purpose, toISOString() converts to UTC first, which flips the date for
// anyone training late in the evening east or west of Greenwich.
export function localDateKey(date: Date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Reads a number out of a text box. Accepts a comma as the decimal
// mark since plenty of phone keyboards (and plenty of people) use it,
// and returns null for empty or nonsense rather than NaN.
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function capitalise(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
