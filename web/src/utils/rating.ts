export function formatRating(rating: number | null): string {
  if (rating === null) return "Not rated";
  return `${rating}/10`;
}
