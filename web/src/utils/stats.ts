const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Format a win rate (0–1) as a percentage string, e.g. 0.667 → "66.7%" */
export function formatWinRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/** Format an ISO month string as "Jan 2025", e.g. "2025-01" → "Jan 2025" */
export function formatMonth(isoMonth: string): string {
  const [yearStr, monthStr] = isoMonth.split("-");
  const monthIndex = parseInt(monthStr, 10) - 1;
  return `${MONTH_NAMES[monthIndex]} ${yearStr}`;
}

/** Format an ISO date string as a localized date, or "Never" for null */
export function formatLastPlayed(isoDate: string | null): string {
  return isoDate ? new Date(isoDate).toLocaleDateString() : "Never";
}

/** Format a score value, returning "--" for null */
export function formatScore(score: number | null): string {
  return score !== null ? String(score) : "--";
}

/** Format an ISO date string as a relative time, e.g. "2 days ago" */
export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
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
