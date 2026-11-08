"use client";
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
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  return j as T;
}

/**
 * Run an AI request as a background job (the hosting proxy cuts requests at 100 s): start it, then poll
 * until it finishes. Resolves with the job's result or rejects with its error message.
 */
export async function runAi<T = any>(projectId: string, json: unknown, opts: { intervalMs?: number; timeoutMs?: number } = {}): Promise<T> {
  const { jobId } = await api<{ jobId: string }>(`/api/projects/${projectId}/ai`, { method: "POST", json });
  const deadline = Date.now() + (opts.timeoutMs ?? 7 * 60_000);
  let misses = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, opts.intervalMs ?? 2000));
    try {
      const j = await api<{ status: "running" | "done" | "error"; result?: T; error?: string }>(`/api/projects/${projectId}/ai/${jobId}`);
      misses = 0;
      if (j.status === "done") return j.result as T;
      if (j.status === "error") throw new Error(j.error || "AI xatosi");
    } catch (e) {
      // A dropped poll (network blip, proxy hiccup) is not a failed job: retry a few times.
      if ((e as Error).message.startsWith("HTTP") || e instanceof TypeError) {
        if (++misses > 5) throw e;
        continue;
      }
      throw e;
    }
  }
  throw new Error("AI javobi juda uzoq kechikdi. Keyinroq loyihani yangilab ko'ring.");
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
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  return j.item as AssetItem;
}

export function timeAgo(iso?: string) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "hozirgina";
  if (s < 3600) return `${Math.floor(s / 60)} daqiqa oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  return new Date(iso).toLocaleDateString("uz-UZ");
}
