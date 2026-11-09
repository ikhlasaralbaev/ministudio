"use client";
import { watchLevel } from "./notifyClient";
import { browserLocale, translateServer } from "../i18n/server-text";

/** A server message in the browser's interface language. */
const tr = (m: string) => translateServer(browserLocale(), m);
export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    // Session gone (expired, signed out elsewhere) or account banned: back to the login page.
    if (typeof window !== "undefined") {
      if (r.status === 401) {
        const here = window.location.pathname + window.location.search;
        window.location.replace(`/login?next=${encodeURIComponent(here)}`);
      } else if (r.status === 403 && j.code === "banned") {
        window.location.replace("/login?error=1");
      }
    }
    throw new Error(tr(j.error || `HTTP ${r.status}`));
  }
  return j as T;
}

/**
 * Run an AI request as a background job (the hosting proxy cuts requests at 100 s): start it, then poll
 * until it finishes. Resolves with the job's result or rejects with its error message.
 */
export async function runAi<T = any>(projectId: string, json: unknown, opts: { intervalMs?: number; timeoutMs?: number } = {}): Promise<T> {
  const { jobId } = await api<{ jobId: string }>(`/api/projects/${projectId}/ai`, { method: "POST", json });
  return pollAi<T>(projectId, jobId, opts);
}

/** Waits for a job that is already running (also used to resume after a page refresh). */
export async function pollAi<T = any>(projectId: string, jobId: string, opts: { intervalMs?: number; timeoutMs?: number } = {}): Promise<T> {
  const deadline = Date.now() + (opts.timeoutMs ?? 7 * 60_000);
  let misses = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, opts.intervalMs ?? 2000));
    try {
      const j = await api<{ status: "running" | "done" | "error"; result?: T; error?: string }>(`/api/projects/${projectId}/ai/${jobId}?w=${watchLevel()}`);
      misses = 0;
      if (j.status === "done" || j.status === "error") window.dispatchEvent(new Event("ms:credits")); // the balance just changed
      if (j.status === "done") return j.result as T;
      if (j.status === "error") throw new Error(tr(j.error || "AI xatosi"));
    } catch (e) {
      // A dropped poll (network blip, proxy hiccup) is not a failed job: retry a few times.
      if ((e as Error).message.startsWith("HTTP") || e instanceof TypeError) {
        if (++misses > 5) throw e;
        continue;
      }
      throw e;
    }
  }
  throw new Error(tr("AI javobi juda uzoq kechikdi. Keyinroq loyihani yangilab ko'ring."));
}

export interface AssetItem {
  id: string;
  kind: "logo" | "reference";
  url: string;
  width: number;
  height: number;
  color: string | null;
  createdAt: string;
}

/** Uploads an image to a project (multipart). `pending` keeps a reference for the project's first generation. */
export async function uploadAsset(projectId: string, file: File, kind: "logo" | "reference", pending = false): Promise<AssetItem> {
  const form = new FormData();
  form.set("file", file);
  form.set("kind", kind);
  if (pending) form.set("pending", "1");
  const r = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && typeof window !== "undefined") window.location.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    throw new Error(tr(j.error || `HTTP ${r.status}`));
  }
  return j.item as AssetItem;
}

const AGO: Record<string, [string, (n: number) => string, (n: number) => string]> = {
  uz: ["hozirgina", (n) => `${n} daqiqa oldin`, (n) => `${n} soat oldin`],
  kaa: ["házir ǵana", (n) => `${n} minut aldın`, (n) => `${n} saat aldın`],
  en: ["just now", (n) => `${n} min ago`, (n) => `${n} h ago`],
  ru: ["только что", (n) => `${n} мин назад`, (n) => `${n} ч назад`],
};
const DATE_LOCALE: Record<string, string> = { uz: "uz-UZ", kaa: "uz-UZ", en: "en-GB", ru: "ru-RU" };

/** "3 minutes ago" in the interface language. */
export function timeAgo(iso?: string) {
  if (!iso) return "";
  const l = browserLocale();
  const [now, mins, hours] = AGO[l] ?? AGO.uz;
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return now;
  if (s < 3600) return mins(Math.floor(s / 60));
  if (s < 86400) return hours(Math.floor(s / 3600));
  return new Date(iso).toLocaleDateString(DATE_LOCALE[l] ?? "uz-UZ");
}
