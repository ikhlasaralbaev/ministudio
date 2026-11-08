// Helpers for "one message is enough": telling an idea from small talk, and a first name for a project made from it.

/** A real idea has some substance: at least three words and a dozen characters ("salom" must not create a project). */
export function looksLikeIdea(text: string): boolean {
  const t = text.trim();
  return t.length >= 12 && t.split(/\s+/).length >= 3;
}

/** A readable placeholder name from the idea's first line; the AI replaces it with a real name once the app exists. */
export function nameFromIdea(text: string, max = 40): string {
  const line = text.trim().split(/\n/)[0].replace(/\s+/g, " ");
  if (line.length <= max) return line || "Yangi loyiha";
  const cut = line.slice(0, max);
  return cut.slice(0, Math.max(10, cut.lastIndexOf(" "))).trim() + "…";
}
