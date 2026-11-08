// "An app is being built" flag across the dashboard -> Studio navigation, so the loading screen stays up through the page change.
const KEY = "ms:building";

export function markBuilding(): void {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
}

/** True while a build started in the last 10 minutes (a stale flag from a closed tab must not trap the page). */
export function isBuilding(): boolean {
  try {
    const at = Number(sessionStorage.getItem(KEY));
    return !!at && Date.now() - at < 600_000;
  } catch {
    return false;
  }
}

export function clearBuilding(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
