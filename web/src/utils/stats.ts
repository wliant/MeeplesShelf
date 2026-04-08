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
