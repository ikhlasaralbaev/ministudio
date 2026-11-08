// The idea typed on the landing page survives the sign-in round trip (Google redirects away and back) in the
// browser's localStorage, and is dropped into the dashboard's prompt box. Every access is guarded: storage can be
// blocked (private windows) and the page must work without it.
export const IDEA_DRAFT_KEY = "ms:idea-draft";
const KEY = IDEA_DRAFT_KEY;
const TTL_MS = 24 * 3600_000;
const MAX = 2000;

export function saveIdeaDraft(text: string): void {
  try {
    const t = text.slice(0, MAX);
    if (!t.trim()) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify({ t, at: Date.now() }));
  } catch {
    /* storage unavailable */
  }
}

/** The saved idea, once: it is removed as it is read, and ignored when older than a day. */
export function takeIdeaDraft(): string {
  try {
    const raw = localStorage.getItem(KEY);
    localStorage.removeItem(KEY);
    if (!raw) return "";
    const d = JSON.parse(raw) as { t?: unknown; at?: unknown };
    return typeof d.t === "string" && typeof d.at === "number" && Date.now() - d.at < TTL_MS ? d.t.slice(0, MAX) : "";
  } catch {
    return "";
  }
}

/**
 * Inline script for the landing page: the page hydrates a second or two after it appears, and anything typed before
 * that must not be lost. It saves the box's text in the same format as saveIdeaDraft().
 */
export function ideaDraftScript(selector: string): string {
  return `document.addEventListener("input",function(e){var t=e.target;if(!t||!t.matches||!t.matches(${JSON.stringify(selector)}))return;try{var v=String(t.value||"").slice(0,${MAX});if(v.trim())localStorage.setItem(${JSON.stringify(KEY)},JSON.stringify({t:v,at:Date.now()}));else localStorage.removeItem(${JSON.stringify(KEY)})}catch(_){}},true);`;
}
