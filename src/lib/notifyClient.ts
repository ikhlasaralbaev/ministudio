// Browser notifications for finished AI jobs: shown only when the tab is in the background.
export const canNotify = () => typeof Notification !== "undefined" && Notification.permission === "granted";

/** Ask once (call it from a click: starting an AI request). Silent when already decided or unsupported. */
export function askNotify(): void {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
  } catch {
    /* unsupported */
  }
}

/** What the tab tells the server on each poll: 2 visible, 1 hidden but will notify, 0 hidden and silent. */
export function watchLevel(): 0 | 1 | 2 {
  if (typeof document === "undefined") return 0;
  if (document.visibilityState === "visible") return 2;
  return canNotify() ? 1 : 0;
}

export function notifyDone(title: string, body: string): void {
  try {
    if (!canNotify() || document.visibilityState === "visible") return;
    const n = new Notification(title, { body, tag: "ms-ai-done" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    /* unsupported */
  }
}
