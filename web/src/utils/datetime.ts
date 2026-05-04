const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(undefined, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function parseValid(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a UTC ISO string as a localized date and time, e.g. "5/4/2026, 8:30 PM". */
export function formatDateTime(
  iso: string | null | undefined,
  fallback = "—",
): string {
  const d = parseValid(iso);
  if (!d) return fallback;
  return getFormatter({ dateStyle: "short", timeStyle: "short" }).format(d);
}

/** Format a UTC ISO string as a localized date, e.g. "5/4/2026". */
export function formatDate(
  iso: string | null | undefined,
  fallback = "—",
): string {
  const d = parseValid(iso);
  if (!d) return fallback;
  return getFormatter({ dateStyle: "short" }).format(d);
}

/** Format a UTC ISO string as a localized time of day, e.g. "8:30 PM". */
export function formatTime(iso: string): string {
  const d = parseValid(iso);
  if (!d) return "—";
  return getFormatter({ timeStyle: "short" }).format(d);
}

/** Format an ISO date string as a localized date, or "Never" for null. */
export function formatLastPlayed(iso: string | null | undefined): string {
  return formatDate(iso, "Never");
}

/** Format an ISO date string as a relative time, e.g. "2 days ago". */
export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

/**
 * Convert a UTC ISO string to "YYYY-MM-DDTHH:mm" in local wall time, suitable
 * for `<input type="datetime-local">`. The input element interprets its value
 * as local time, so this must NOT use `toISOString()` (which produces UTC).
 */
export function toLocalDateTimeInput(iso: string): string {
  const d = new Date(iso);
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

/**
 * Convert a `<input type="datetime-local">` value ("YYYY-MM-DDTHH:mm", local
 * wall time) to a UTC ISO string.
 */
export function fromLocalDateTimeInput(local: string): string {
  return new Date(local).toISOString();
}
