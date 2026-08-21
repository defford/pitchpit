export function padRank(rank: number, width = 2): string {
  return String(Math.max(0, Math.floor(rank))).padStart(width, "0");
}

export function formatRating(elo: number): string {
  return String(Math.round(elo));
}

export function formatRecord(wins?: number, losses?: number): string | null {
  if (wins == null || losses == null) return null;
  return `${wins}W ${losses}L`;
}

export function formatToday(wins?: number, losses?: number): string | null {
  if (wins == null || losses == null) return null;
  return `${wins}–${losses}`;
}

export function formatBattleId(id: string): string {
  const digits = id.replace(/\D/g, "").slice(-6);
  return digits.padStart(6, "0");
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function hostFromUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
