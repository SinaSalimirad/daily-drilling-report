// Avatar fallback: first letter of the first and last word ("Sina Salimirad" -> "SS"),
// or the first two letters of a single word ("admin" -> "AD"). Users have no picture yet.
export function initialsOf(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "?";

  const last = words.at(-1) ?? first;
  const letters = words.length === 1 ? first.slice(0, 2) : `${first[0]}${last[0]}`;

  return letters.toUpperCase();
}
