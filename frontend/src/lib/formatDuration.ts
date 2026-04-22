/**
 * Formats the elapsed duration between a start time and an end time
 * (or "now" if the game isn't finished yet) into HH:MM:SS.
 */
export function formatDuration(
  start: string | null,
  finish: string | null,
  now: number
): string {
  if (!start) return '--:--:--';
  const s = new Date(start).getTime();
  const e = finish ? new Date(finish).getTime() : now;
  const elapsed = Math.max(0, Math.floor((e - s) / 1000));
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const sec = (elapsed % 60).toString().padStart(2, '0');
  return `${h}:${m}:${sec}`;
}
