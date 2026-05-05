import { formatDateTime } from "../../utils/datetime";

export function buildGameDeleteMessage(
  name: string,
  expansionCount: number,
): string {
  if (expansionCount > 0) {
    return `Delete "${name}" and all its data? This will also remove ${expansionCount} expansion${expansionCount > 1 ? "s" : ""} and all associated sessions. This cannot be undone.`;
  }
  return `Delete "${name}" and all its data? All associated sessions will also be removed. This cannot be undone.`;
}

export function buildSessionDeleteMessage(
  gameName: string,
  playedAt: string,
): string {
  return `Delete the ${gameName} session from ${formatDateTime(playedAt)}? This cannot be undone.`;
}

export function buildExpansionDeleteMessage(
  expansionName: string,
  gameName: string,
): string {
  return `Delete the expansion "${expansionName}" from ${gameName}? This cannot be undone.`;
}

export function buildPlayerDeleteMessage(
  name: string,
  sessionCount: number,
): string {
  if (sessionCount > 0) {
    return `Delete "${name}"? This player appears in ${sessionCount} session${sessionCount !== 1 ? "s" : ""}. Their scores will be removed from those sessions. This cannot be undone.`;
  }
  return `Delete "${name}"? This player has no session history. This cannot be undone.`;
}
