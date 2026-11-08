"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { RocketLaunch, Sparkle, Warning } from "@phosphor-icons/react";
import type { AppDoc, Op, ProjectDTO, UINode } from "@/lib/types";
import { applyOps, cloneWithNewIds, findNode, findParent, newId, nodePath } from "@/lib/doc";
import { api, pollAi, runAi, uploadAsset } from "@/lib/client";
import { AppView, useRuntime, type Host } from "@/components/runtime";
import { ProjectNav } from "@/components/ui";
import { BotCreator } from "@/components/BotCreator";
import { AiPrompt } from "@/components/AiPrompt";
import { BuildingScreen } from "@/components/BuildingScreen";
import { useAttachments } from "@/components/Attachments";
import { clearBuilding } from "@/lib/building";
import { askNotify, notifyDone } from "@/lib/notifyClient";
import { useT } from "@/i18n/client";
import { ModelPicker } from "./ModelPicker";
import { FRAME_H, PhoneFrame, SCREEN_H, SCREEN_W } from "./PhoneFrame";
import { ChatPanel } from "./ChatPanel";
import type { RecordRow, RecordsByCollection } from "@/lib/records";

type Layout = "vibe" | "advanced";
const LAYOUT_KEY = "ministudio.studioLayout";
import { Layers } from "./Layers";
import { AppInspector, NodeInspector } from "./Inspector";
import { CONTAINERS, nodeLabel } from "./describe";

type Mode = "edit" | "preview";
interface Toast {
  id: number;
  text: string;
  kind: "ok" | "err" | "info";
}

const EXAMPLES = [
  "Kafe uchun menyu: taomlar kartochkalari, savat, telefon va manzil bilan buyurtma berish",
  "Go'zallik saloni: xizmatlar ro'yxati, usta tanlash, kun va vaqt tanlab yozilish",
  "Onlayn kurs: kurslar katalogi, kurs sahifasi, Click orqali to'lov",
  "Kiyim do'koni: kategoriyalar bo'yicha filtr, o'lcham tanlash, savat va buyurtma",
];

/* ------------------------------------------------------------------ */

export function Studio({ project }: { project: ProjectDTO & { envKeys: string[] } }) {
  const id = project._id;
  const tr = useT();
  // Members without "update" get a view-only studio. The server rejects writes regardless; this keeps the UI honest.
  const readOnly = !project.permissions.update;
  // an idea from the dashboard is about to become the first app: show the building screen, not an empty prompt
  const [starting, setStarting] = useState((!!project.pendingIdea || project.activeJob?.kind === "generate") && !project.doc);
  const [lastIdea, setLastIdea] = useState("");
  const [doc, setDocRaw] = useState<AppDoc | null>(project.doc);
  const past = useRef<AppDoc[]>([]);
  const future = useRef<AppDoc[]>([]);
  const lastCoalesce = useRef<{ key: string; t: number } | null>(null);
  const [, force] = useState(0);

  const [screenId, setScreenId] = useState<string>(project.doc?.screens[0]?.id || "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("edit");
  const [busy, setBusy] = useState<null | "generate" | "global" | string>(null);
  const building = busy === "generate" || starting;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [save, setSave] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<null | { url: string; version: number; botUsername: string | null; warnings: string[] }>(null);
  const [version, setVersion] = useState(project.publishedVersion);
  const [aiModel, setAiModel] = useState<string | null>(project.aiModel);
  // Vibe: chat + result only. Advanced: layers, canvas, inspector. Remembered per browser.
  const [layout, setLayoutRaw] = useState<Layout>("advanced");
  const [historyTick, setHistoryTick] = useState(0);
  const [meId, setMeId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const v = localStorage.getItem(LAYOUT_KEY);
      if (v === "vibe" || v === "advanced") setLayoutRaw(v);
    } catch {}
    api<{ id: string }>("/api/me")
      .then((m) => setMeId(m.id))
      .catch(() => {});
  }, []);
  const setLayout = (l: Layout) => {
    setLayoutRaw(l);
    if (l === "vibe") setSelectedId(null); // no element selection in vibe: keyboard shortcuts stay inert
    try {
      localStorage.setItem(LAYOUT_KEY, l);
    } catch {}
  };
  const vibe = layout === "vibe";

  const toast = useCallback((text: string, kind: Toast["kind"] = "info") => {
    const t = { id: Date.now() + Math.random(), text, kind };
    setToasts((x) => [...x.slice(-3), t]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== t.id)), kind === "err" ? 7000 : 3500);
  }, []);

  /* ---------- history ---------- */
  const commit = useCallback((next: AppDoc, coalesceKey?: string, fromServer = false) => {
    if (readOnly) return; // the single mutation point: nothing changes in view-only mode
    setDocRaw((prev) => {
      if (prev) {
        const now = Date.now();
        const lc = lastCoalesce.current;
        const merge = coalesceKey && lc && lc.key === coalesceKey && now - lc.t < 1200;
        if (!merge) {
          past.current = [...past.current.slice(-99), prev];
          future.current = [];
        }
        lastCoalesce.current = coalesceKey ? { key: coalesceKey, t: now } : null;
      }
      return next;
    });
    setSave(fromServer ? "saved" : "dirty");
    force((x) => x + 1);
  }, [readOnly]);

  const apply = useCallback(
    (ops: Op[], coalesceKey?: string) => {
      if (!doc) return;
      try {
        commit(applyOps(doc, ops), coalesceKey);
      } catch (e) {
        toast((e as Error).message, "err");
      }
    },
    [doc, commit, toast],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !doc) return;
    future.current.push(doc);
    lastCoalesce.current = null;
    setDocRaw(prev);
    setSave("dirty");
    force((x) => x + 1);
  }, [doc]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !doc) return;
    past.current.push(doc);
    lastCoalesce.current = null;
    setDocRaw(next);
    setSave("dirty");
    force((x) => x + 1);
  }, [doc]);

  /* ---------- autosave ---------- */
  useEffect(() => {
    if (readOnly || save !== "dirty" || !doc) return;
    const t = setTimeout(async () => {
      setSave("saving");
      try {
        await api(`/api/projects/${id}`, { method: "PATCH", json: { doc } });
        setSave((s) => (s === "saving" ? "saved" : s));
      } catch (e) {
        setSave("error");
        toast("Saqlab bo'lmadi: " + (e as Error).message, "err");
      }
    }, 700);
    return () => clearTimeout(t);
  }, [doc, save, id, toast, readOnly]);

  // keep screen valid
  useEffect(() => {
    if (doc && !doc.screens.some((s) => s.id === screenId)) setScreenId(doc.screens[0]?.id);
    if (doc && selectedId && !findNode(doc, selectedId)) setSelectedId(null);
  }, [doc, screenId, selectedId]);

  /* ---------- AI ---------- */
  async function generate(prompt: string, refs?: string[]) {
    setLastIdea(prompt);
    setBusy("generate");
    askNotify();
    try {
      const r = await runAi<{ doc: AppDoc }>(id, { mode: "generate", prompt, refs });
      commit(r.doc, undefined, true);
      notifyDone(tr.notify.title, project.name);
      setScreenId(r.doc.screens[0].id);
      setSelectedId(null);
      // in vibe mode the chat shows the result; toasts are kept for errors only
      if (!vibe) toast("Ilova tayyor! Elementni bosib, comment orqali o'zgartiring.", "ok");
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
      setStarting(false);
      clearBuilding();
      setHistoryTick((t) => t + 1);
    }
  }

  async function edit(prompt: string, nodeId: string | null, refs?: string[]) {
    if (!doc) return;
    setBusy(nodeId || "global");
    askNotify();
    try {
      const r = await runAi<{ doc: AppDoc; message: string }>(id, { mode: "edit", prompt, nodeId, doc, refs });
      commit(r.doc, undefined, true);
      notifyDone(tr.notify.title, tr.notify.body);
      if (!vibe) toast(r.message || "O'zgartirildi", "ok");
      // if a new screen appeared and the comment was global, jump to it
      const newScreen = r.doc.screens.find((s) => !doc.screens.some((o) => o.id === s.id));
      if (newScreen) setScreenId(newScreen.id);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(null);
      setHistoryTick((t) => t + 1);
    }
  }

  // An idea typed on the dashboard becomes the first app as soon as Studio opens. The idea is cleared first, so a
  // reload while the app is being built cannot start a second generation.
  const autoStarted = useRef(false);
  useEffect(() => {
    const idea = project.pendingIdea;
    const refs = project.pendingRefs;
    if ((!idea && project.activeJob?.kind !== "generate") || doc || readOnly) {
      clearBuilding();
      setStarting(false);
    }
    if (autoStarted.current || !idea || doc || readOnly) return;
    autoStarted.current = true;
    api(`/api/projects/${id}`, { method: "PATCH", json: { pendingIdea: null } })
      .catch(() => {})
      .then(() => generate(idea, refs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The page was refreshed while an AI job was running: keep the loading state and pick up its result.
  const resumed = useRef(false);
  useEffect(() => {
    const job = project.activeJob;
    if (!job || readOnly || resumed.current) return;
    resumed.current = true;
    setBusy(job.kind === "generate" ? "generate" : "global");
    pollAi<{ doc: AppDoc }>(id, job.id)
      .then((r) => {
        commit(r.doc, undefined, true);
        notifyDone(tr.notify.title, project.name);
        setScreenId((cur) => (r.doc.screens.some((s) => s.id === cur) ? cur : r.doc.screens[0].id));
        setSelectedId(null);
      })
      .catch((e) => toast((e as Error).message, "err"))
      .finally(() => {
        setBusy(null);
        setStarting(false);
        clearBuilding();
        setHistoryTick((t) => t + 1);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- structure helpers ---------- */
  const selected = doc && selectedId ? findNode(doc, selectedId) : null;
  const parentInfo = doc && selectedId ? findParent(doc, selectedId) : null;

  const duplicate = useCallback(() => {
    if (!doc || !selectedId) return;
    const n = findNode(doc, selectedId);
    const loc = findParent(doc, selectedId);
    if (!n) return;
    if (!loc?.parent) {
      const copy = cloneWithNewIds(n);
      apply([{ op: "addScreen", screen: { ...copy, name: (n.name || "Ekran") + " (nusxa)" } }]);
      return;
    }
    const copy = cloneWithNewIds(n);
    apply([{ op: "insert", parentId: loc.parent.id, index: loc.index + 1, node: copy }]);
    setSelectedId(copy.id);
  }, [doc, selectedId, apply]);

  const shift = useCallback(
    (dir: -1 | 1) => {
      if (!doc || !selectedId) return;
      const loc = findParent(doc, selectedId);
      if (!loc?.parent) return;
      const max = (loc.parent.children?.length || 1) - 1;
      const idx = Math.max(0, Math.min(max, loc.index + dir));
      if (idx === loc.index) return;
      apply([{ op: "move", id: selectedId, parentId: loc.parent.id, index: idx }]);
    },
    [doc, selectedId, apply],
  );

  const moveByDrop = useCallback(
    (dragId: string, targetId: string, pos: "before" | "after" | "inside") => {
      if (!doc) return;
      if (pos === "inside") return apply([{ op: "move", id: dragId, parentId: targetId, index: 9999 }]);
      // compute index after removal
      const without = applyOps(doc, [{ op: "delete", id: dragId }]);
      const loc = findParent(without, targetId);
      if (!loc?.parent) return;
      apply([{ op: "move", id: dragId, parentId: loc.parent.id, index: loc.index + (pos === "after" ? 1 : 0) }]);
    },
    [doc, apply],
  );

  const addScreen = useCallback(() => {
    if (!doc) return;
    const sid = newId("scr");
    apply([
      {
        op: "addScreen",
        screen: {
          id: sid,
          type: "Screen",
          name: `Ekran ${doc.screens.length + 1}`,
          children: [{ id: newId("txt"), type: "Text", props: { text: "Yangi ekran", variant: "h2" } }],
        },
      },
    ]);
    setScreenId(sid);
    setSelectedId(sid);
  }, [doc, apply]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (readOnly) {
        if (e.key === "Escape" && !typing) setSelectedId(null);
        return;
      }
      if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "d" && !typing) {
        e.preventDefault();
        duplicate();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !typing && selectedId && doc) {
        e.preventDefault();
        apply([{ op: "delete", id: selectedId }]);
        setSelectedId(null);
      } else if (e.key === "Escape" && !typing) {
        setSelectedId(null);
      } else if (e.key === "Enter" && !typing && selectedId) {
        e.preventDefault();
        document.getElementById("comment-input")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, duplicate, apply, selectedId, doc, readOnly]);

  /* ---------- publish ---------- */
  async function publish() {
    setPublishing(true);
    try {
      if (save !== "saved" && doc) await api(`/api/projects/${id}`, { method: "PATCH", json: { doc } });
      setSave("saved");
      const r = await api<{ url: string; version: number; botUsername: string | null; warnings: string[] }>(`/api/projects/${id}/publish`, { method: "POST" });
      setPublished(r);
      setVersion(r.version);
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setPublishing(false);
    }
  }

  const saveLabel = { saved: "Saqlangan", saving: "Saqlanmoqda…", dirty: "O'zgarishlar…", error: "Saqlanmadi" }[save];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ProjectNav
        id={id}
        name={doc?.name || project.name}
        project={project}
        right={
          <>
            <div className="mr-1 flex rounded-lg bg-panel-2 p-0.5 text-[13px]" title="Studio ko'rinishi">
              {(["vibe", "advanced"] as Layout[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`rounded-md px-2.5 py-1 ${layout === l ? "bg-line text-fg" : "text-muted hover:text-fg"}`}
                >
                  {l === "vibe" ? <><Sparkle weight="fill" className="mr-1 inline" />Vibe</> : "Advanced"}
                </button>
              ))}
            </div>
            {!doc && vibe && !readOnly && (
              <ModelPicker projectId={id} value={aiModel} onChange={setAiModel} onError={(m) => toast(m, "err")} />
            )}
          {doc && (
            <>
              {readOnly ? (
                <span className="mr-2 rounded-md bg-panel-2 px-2 py-1 text-xs text-muted">Faqat ko&apos;rish</span>
              ) : (
                <>
              <span className={`mr-2 text-xs ${save === "error" ? "text-danger" : "text-muted"}`}>{saveLabel}</span>
              <button onClick={undo} disabled={!past.current.length} title="Bekor qilish (⌘Z)" className="rounded-md px-2 py-1 text-muted hover:bg-panel-2 hover:text-fg disabled:opacity-30">
                ↶
              </button>
              <button onClick={redo} disabled={!future.current.length} title="Qaytarish (⇧⌘Z)" className="rounded-md px-2 py-1 text-muted hover:bg-panel-2 hover:text-fg disabled:opacity-30">
                ↷
              </button>
                </>
              )}
              {!readOnly && (
                <ModelPicker projectId={id} value={aiModel} onChange={setAiModel} onError={(m) => toast(m, "err")} />
              )}
              {!vibe && <div className="mx-2 flex rounded-lg bg-panel-2 p-0.5 text-sm">
                {(["edit", "preview"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-3 py-1 ${mode === m ? "bg-line text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {m === "edit" ? "Tahrirlash" : "▶ Sinash"}
                  </button>
                ))}
              </div>}
              {!readOnly && (
                <button
                  onClick={publish}
                  disabled={publishing}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-2 disabled:opacity-50"
                >
                  {publishing ? "E'lon qilinmoqda…" : version ? `Publish · v${version + 1}` : "Publish"}
                </button>
              )}
            </>
          )}
          </>
        }
      />

      {vibe ? (
        <div className="flex min-h-0 flex-1">
          <aside className="w-[400px] shrink-0 border-r border-line bg-panel">
            <ChatPanel
              projectId={id}
              hasDoc={!!doc}
              busy={!!busy}
              readOnly={readOnly}
              refreshKey={historyTick}
              meId={meId}
              onSend={(t, refs) => (doc ? edit(t, null, refs) : generate(t, refs))}
            />
          </aside>
          {doc ? (
            <Canvas
              doc={doc}
              mode="preview"
              screenId={screenId}
              setScreenId={setScreenId}
              selectedId={null}
              onSelect={setSelectedId}
              selected={null}
              busy={busy}
              onEdit={edit}
              toast={toast}
              onAddScreen={addScreen}
              readOnly={readOnly}
              clean
            />
          ) : (
            building ? <BuildingScreen /> : <VibePlaceholder busy={false} />
          )}
        </div>
      ) : !doc && readOnly ? (
        <div className="canvas-dots grid flex-1 place-items-center p-6 text-muted">Ilova hali yaratilmagan.</div>
      ) : !doc && building ? (
        <BuildingScreen />
      ) : !doc ? (
        <EmptyState
          projectId={id}
          initial={lastIdea}
          busy={false}
          onGenerate={generate}
          envKeys={project.envKeys}
          picker={<ModelPicker projectId={id} value={aiModel} onChange={setAiModel} onError={(m) => toast(m, "err")} />}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          {/* left */}
          <aside className="w-64 shrink-0 border-r border-line bg-panel">
            <Layers
              doc={doc}
              screenId={screenId}
              selectedId={selectedId}
              onSelect={(sid) => {
                setSelectedId(sid);
                const scr = nodePath(doc, sid)[0];
                if (scr) setScreenId(scr.id);
              }}
              onScreen={setScreenId}
              onMove={moveByDrop}
              onAddScreen={addScreen}
              readOnly={readOnly}
            />
          </aside>

          {/* center */}
          <Canvas
            doc={doc}
            mode={mode}
            screenId={screenId}
            setScreenId={setScreenId}
            selectedId={selectedId}
            onSelect={setSelectedId}
            selected={selected}
            busy={busy}
            onEdit={edit}
            toast={toast}
            onAddScreen={addScreen}
            readOnly={readOnly}
          />

          {/* right */}
          <aside className="scroll-thin w-80 shrink-0 overflow-auto border-l border-line bg-panel">
            <fieldset disabled={readOnly} className="contents">
            {selected ? (
              <NodeInspector
                key={selected.id}
                doc={doc}
                node={selected}
                parentId={parentInfo?.parent?.id || null}
                apply={apply}
                onSelect={setSelectedId}
                onDuplicate={duplicate}
                onShift={shift}
              />
            ) : (
              <AppInspector doc={doc} apply={apply} onAiEdit={(p) => void edit(p, null)} />
            )}
            </fieldset>
          </aside>
        </div>
      )}

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-lg rounded-xl px-4 py-2.5 text-sm shadow-2xl ${
              t.kind === "err" ? "bg-danger/90 text-white" : t.kind === "ok" ? "bg-ok/95 text-white" : "bg-panel-2 text-white"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {published && (
        <PublishModal
          res={published}
          projectId={id}
          onBot={(botUsername) => setPublished((r) => (r ? { ...r, botUsername } : r))}
          onClose={() => setPublished(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Vibe mode before the first generation: an empty phone that fills in once the AI is done. */
function VibePlaceholder({ busy }: { busy: boolean }) {
  return (
    <section className="canvas-dots grid min-w-0 flex-1 place-items-center overflow-auto p-6">
      <div style={{ zoom: 0.85 }}>
        <PhoneFrame
          title="Yangi ilova"
          theme={{ background: "#f6f7f9", text: "#111111", primary: "#2481cc" }}
          overlay={busy ? <div className="ai-working pointer-events-none absolute inset-0" /> : null}
        >
          <div className="grid h-full place-items-center px-10 text-center text-[15px] text-[#8a8f98]">
            {busy ? "AI ilovani chizmoqda…" : "Chatda ilovangizni tasvirlab bering — natija shu yerda paydo bo'ladi"}
          </div>
        </PhoneFrame>
      </div>
    </section>
  );
}

function EmptyState({
  initial,
  busy,
  onGenerate,
  envKeys,
  picker,
  projectId,
}: {
  /** what the person typed last time (kept after a failed attempt, so they can retry or edit it) */
  initial: string;
  busy: boolean;
  onGenerate: (p: string, refs?: string[]) => void;
  envKeys: string[];
  picker: React.ReactNode;
  projectId: string;
}) {
  const [prompt, setPrompt] = useState(initial);
  const attach = useAttachments();
  return (
    <div className="canvas-dots grid flex-1 place-items-center overflow-auto p-6">
      <div className="w-full max-w-2xl">
        <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight">Qanday ilova yaratamiz?</h1>
        <p className="mb-8 text-center text-muted">Biznesingizni tasvirlab bering — AI ekranlar, dizayn va logikani yaratadi.</p>
        <AiPrompt
          value={prompt}
          onChange={setPrompt}
          onSubmit={async () => {
            // reference images are uploaded first, then the AI gets them with the prompt
            const ids: string[] = [];
            for (const x of attach.items) ids.push((await uploadAsset(projectId, x.file, "reference")).id);
            attach.clear();
            onGenerate(prompt, ids);
          }}
          attach={attach}
          busy={busy}
          busyLabel="AI chizmoqda… 30–90 s"
          submitLabel="Yaratish"
          placeholders={EXAMPLES}
          rows={4}
          autoFocus
          footerLeft={`${envKeys.length ? `Ulangan: ${envKeys.filter((k) => !k.includes("SECRET") && !k.endsWith("KEY")).join(", ")}` : "Integratsiyalar hali ulanmagan"} · ⌘↵`}
          extra={picker}
        />
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              disabled={busy}
              onClick={() => setPrompt(ex)}
              className="rounded-xl border border-line bg-panel/60 p-3 text-left text-[13px] text-fg/80 hover:border-accent/50 hover:text-fg"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Studio preview host: server actions are simulated; records live in memory for the studio session. */
function studioHost(toast: (t: string, k?: "ok" | "err" | "info") => void): Host {
  let n = 1000;
  const store: RecordsByCollection = {};
  return {
    async dbList() {
      return structuredClone(store);
    },
    async dbInsert(collection, value) {
      n++;
      const data = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : { value };
      const row: RecordRow = { ...data, _id: `sim_${n}`, _number: n, _at: new Date().toISOString() };
      store[collection] = [row, ...(store[collection] || [])];
      toast(`Sinov: "${collection}" ga yozildi (#${n})`, "info");
      return { id: String(n), row };
    },
    async dbUpdate(collection, id, value) {
      const list = store[collection] || [];
      const old = list.find((r) => r._id === id);
      if (!old) throw new Error("Yozuv topilmadi");
      const row = { ...old, ...(value as Record<string, unknown>), _id: old._id, _number: old._number, _at: old._at };
      store[collection] = list.map((r) => (r._id === id ? row : r));
      return row;
    },
    async dbDelete(collection, id) {
      store[collection] = (store[collection] || []).filter((r) => r._id !== id);
    },
    async notifyOwner(text) {
      toast("Sinov: egasiga xabar → " + text.slice(0, 80), "info");
    },
    async pay({ provider, amount }) {
      toast(`Sinov: ${provider} to'lov sahifasi ochiladi (${amount.toLocaleString("ru-RU")} so'm)`, "info");
      return null;
    },
    toast: (t) => toast(t, "info"),
  };
}

function Canvas(props: {
  doc: AppDoc;
  mode: Mode;
  screenId: string;
  setScreenId: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  selected: UINode | null;
  busy: string | null;
  onEdit: (prompt: string, nodeId: string | null) => void;
  toast: (t: string, k?: "ok" | "err" | "info") => void;
  onAddScreen: () => void;
  readOnly: boolean;
  /** Vibe mode: just the phone, no screen tabs or command bar. */
  clean?: boolean;
}) {
  const { doc, mode, screenId, setScreenId, selectedId, onSelect, selected, busy, onEdit, toast, readOnly, clean = false } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<{ top: number; left: number; bracket: number; elTop: number; elH: number } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [fit, setFit] = useState(1);
  const host = useMemo(() => studioHost(toast), [toast]);

  // scale the phone so the whole device fits the canvas height (label + padding included)
  useLayoutEffect(() => {
    const w = wrapRef.current;
    if (!w) return;
    const update = () => setFit(Math.max(0.55, Math.min(1, (w.clientHeight - 48 - 30) / FRAME_H)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(w);
    return () => ro.disconnect();
  }, []);
  const stateKey = JSON.stringify(doc.state);

  // position comment box next to the selected element
  const measure = useCallback(() => {
    if (!selectedId || mode !== "edit" || !wrapRef.current || !phoneRef.current) return setAnchor(null);
    const el = phoneRef.current.querySelector(`[data-node-id="${CSS.escape(selectedId)}"]`) as HTMLElement | null;
    if (!el) return setAnchor(null);
    const w = wrapRef.current.getBoundingClientRect();
    const p = phoneRef.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const sl = wrapRef.current.scrollLeft;
    const st = wrapRef.current.scrollTop;
    const top = Math.max(8 + st, Math.min(r.top - w.top + st, w.height - 250 + st));
    // right of the phone if it fits, otherwise left of it, otherwise pinned to the visible right edge
    const right = p.right - w.left + sl + 20;
    const leftSide = p.left - w.left + sl - 300;
    const left = right + 280 <= w.width + sl ? right : leftSide >= sl + 8 ? leftSide : w.width + sl - 292;
    const bracket = left > p.left - w.left + sl ? p.right - w.left + sl + 6 : p.left - w.left + sl - 9;
    setAnchor({ top, left, bracket, elTop: r.top - w.top + st, elH: r.height });
  }, [selectedId, mode]);

  useLayoutEffect(() => {
    measure();
  }, [measure, doc, screenId, fit]);
  useEffect(() => {
    const ph = phoneRef.current;
    const w = wrapRef.current;
    window.addEventListener("resize", measure);
    ph?.addEventListener("scroll", measure, { passive: true });
    w?.addEventListener("scroll", measure, { passive: true });
    return () => {
      window.removeEventListener("resize", measure);
      ph?.removeEventListener("scroll", measure);
      w?.removeEventListener("scroll", measure);
    };
  }, [measure]);

  // scroll selected into view when chosen from layers
  useEffect(() => {
    if (!selectedId || !phoneRef.current) return;
    const el = phoneRef.current.querySelector(`[data-node-id="${CSS.escape(selectedId)}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  const onSelectEl = useCallback((nid: string) => onSelect(nid), [onSelect]);

  return (
    <section className="relative flex min-w-0 flex-1 flex-col">
      {clean && (
        <button
          onClick={() => setPreviewKey((k) => k + 1)}
          className="absolute right-4 top-4 z-10 rounded-lg border border-line bg-panel/80 px-3 py-1.5 text-[12px] text-muted backdrop-blur hover:text-fg"
        >
          ↻ Qayta boshlash
        </button>
      )}
      {/* screen tabs */}
      {!clean && <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-line bg-panel/60 px-3">
        {doc.screens.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              setScreenId(s.id);
              if (mode === "preview") setPreviewKey((k) => k + 1);
            }}
            className={`shrink-0 rounded-md px-3 py-1 text-[13px] ${s.id === screenId ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"}`}
          >
            {nodeLabel(s)}
          </button>
        ))}
        {!readOnly && (
          <button onClick={props.onAddScreen} className="shrink-0 rounded-md px-2 py-1 text-[13px] text-muted hover:text-fg">
            +
          </button>
        )}
        {mode === "preview" && (
          <button onClick={() => setPreviewKey((k) => k + 1)} className="ml-auto shrink-0 text-[13px] text-muted hover:text-fg">
            ↻ Qayta boshlash
          </button>
        )}
      </div>}

      <div
        ref={wrapRef}
        className="canvas-dots scroll-thin relative flex-1 overflow-auto"
        onClick={() => mode === "edit" && onSelect(null)}
      >
        {/* phone stays centered; it is scaled down (never up) to fit the canvas height */}
        <div className="flex min-h-full min-w-max items-center justify-center p-6">
          <div className="relative" onClick={(e) => e.stopPropagation()} style={{ zoom: fit }}>
            <div className={`mb-3 flex items-center justify-between px-2 text-[12px] text-muted ${clean ? "invisible" : ""}`}>
              <span>{mode === "edit" ? "Element ustiga bosing → comment yozing" : "Sinov rejimi — xuddi Telegram'dagidek ishlaydi"}</span>
              <span>
                {SCREEN_W} × {SCREEN_H}
              </span>
            </div>
            <PhoneFrame
              title={doc.name}
              theme={doc.theme}
              scrollRef={phoneRef}
              scrollClassName={mode === "edit" ? "canvas-edit" : ""}
              overlay={
                busy && busy !== "generate" && (busy === "global" || busy === selectedId) ? (
                  <div className="ai-working pointer-events-none absolute inset-0" />
                ) : null
              }
            >
              {mode === "edit" ? (
                <EditSurface key={stateKey} doc={doc} host={host} screenId={screenId} selectedId={selectedId} onSelect={onSelectEl} />
              ) : (
                <PreviewSurface key={previewKey} doc={doc} host={host} screenId={screenId} />
              )}
            </PhoneFrame>
          </div>
        </div>

        {/* selection highlight bracket + comment box */}
        {anchor && selected && mode === "edit" && (
          <>
            <div
              className="pointer-events-none absolute w-[3px] rounded bg-primary"
              style={{ top: anchor.elTop, left: anchor.bracket, height: Math.max(anchor.elH, 12) }}
            />
            {!readOnly && (
            <CommentBox
              key={selected.id}
              node={selected}
              top={anchor.top}
              left={anchor.left}
              busy={busy === selected.id}
              onSend={(t) => onEdit(t, selected.id)}
              onClose={() => onSelect(null)}
            />
            )}
          </>
        )}
      </div>

      {!readOnly && !clean && <GlobalBar busy={busy === "global"} disabled={!!busy} onSend={(t) => onEdit(t, null)} />}
    </section>
  );
}

function EditSurface({
  doc,
  host,
  screenId,
  selectedId,
  onSelect,
}: {
  doc: AppDoc;
  host: Host;
  screenId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const rt = useRuntime(doc, host, { initialScreen: screenId });
  return <AppView doc={doc} rt={rt} edit selectedId={selectedId} onSelect={onSelect} screenId={screenId} />;
}

function PreviewSurface({ doc, host, screenId }: { doc: AppDoc; host: Host; screenId: string }) {
  const rt = useRuntime(doc, host, { initialScreen: screenId });
  return <AppView doc={doc} rt={rt} />;
}

/* ------------------------------------------------------------------ */

const QUICK: Record<string, string[]> = {
  Button: ["Bosilganda keyingi ekranga o'tsin", "Rangini o'zgartir", "Kattaroq va yumaloq qil"],
  Text: ["Kattaroq va qalin qil", "Matnni chiroyliroq yoz", "Rangini asosiy rangga o'zgartir"],
  Image: ["Burchaklarini yumaloq qil", "Kvadrat qil"],
  List: ["Ikki ustunli grid qil", "Qidiruv qo'sh"],
  Box: ["Kartochka qilib soya ber", "Ichiga tugma qo'sh"],
  Row: ["Elementlar orasini kengaytir"],
  Input: ["Bo'sh bo'lsa xato ko'rsatsin"],
  Screen: ["Dizaynni zamonaviyroq qil", "Pastiga navigatsiya paneli qo'sh"],
};

function CommentBox({
  node,
  top,
  left,
  busy,
  onSend,
  onClose,
}: {
  node: UINode;
  top: number;
  left: number;
  busy: boolean;
  onSend: (t: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim() || busy) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <div
      className="absolute z-20 w-[280px] rounded-2xl border border-line bg-panel p-3 shadow-2xl"
      style={{ top, left }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-md bg-accent/20 px-1.5 py-0.5 text-[11px] font-medium text-accent-2">{node.type}</span>
        <span className="truncate text-[13px] font-medium">{nodeLabel(node)}</span>
        <button onClick={onClose} className="ml-auto text-muted hover:text-fg">
          ✕
        </button>
      </div>
      <textarea
        id="comment-input"
        autoFocus
        rows={3}
        value={text}
        disabled={busy}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
          if (e.key === "Escape") onClose();
        }}
        placeholder={
          CONTAINERS.has(node.type)
            ? "Nima o'zgarsin? Dizayn, ichidagi elementlar, logika…"
            : "Nima o'zgarsin? Masalan: bosilganda savatga qo'shsin"
        }
        className="w-full resize-none rounded-lg bg-panel-2 p-2 text-[13px] outline-none placeholder:text-muted/70 disabled:opacity-50"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {(QUICK[node.type] || []).map((q) => (
          <button key={q} disabled={busy} onClick={() => onSend(q)} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted hover:border-accent/60 hover:text-fg">
            {q}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[11px] text-muted">↵ yuborish · ⇧↵ yangi qator</span>
        <button
          onClick={send}
          disabled={busy || !text.trim()}
          className="rounded-lg bg-primary px-3 py-1 text-[13px] font-medium text-white hover:bg-primary-2 disabled:opacity-40"
        >
          {busy ? "AI ishlayapti…" : "Yuborish"}
        </button>
      </div>
    </div>
  );
}

function GlobalBar({ busy, disabled, onSend }: { busy: boolean; disabled: boolean; onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="shrink-0 border-t border-line bg-panel px-4 py-3">
      <div className={`mx-auto flex max-w-2xl items-center gap-2 rounded-xl border border-line bg-panel-2 px-3 py-1.5 ${busy ? "ai-working" : ""}`}>
        <Sparkle weight="fill" className="text-accent-2" />
        <input
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              onSend(text.trim());
              setText("");
            }
          }}
          placeholder={busy ? "AI ishlayapti…" : "Butun ilova uchun buyruq: masalan, \"Biz haqimizda\" ekrani qo'sh, ranglarni to'q rangga o'tkaz…"}
          className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted/70"
        />
        <button
          disabled={disabled || !text.trim()}
          onClick={() => {
            onSend(text.trim());
            setText("");
          }}
          className="rounded-lg bg-primary px-3 py-1 text-[13px] text-white disabled:opacity-30"
        >
          ↵
        </button>
      </div>
    </div>
  );
}

function PublishModal({
  res,
  projectId,
  onBot,
  onClose,
}: {
  res: { url: string; version: number; botUsername: string | null; warnings: string[] };
  projectId: string;
  onBot: (botUsername: string | null) => void;
  onClose: () => void;
}) {
  const warnings = res.botUsername ? res.warnings : res.warnings.filter((w) => !/Bot token|OWNER_CHAT_ID/.test(w));
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 text-3xl text-accent-2"><RocketLaunch weight="duotone" className="mx-auto" /></div>
        <h2 className="mb-4 text-lg font-semibold">Ilova e&apos;lon qilindi <span className="text-sm font-normal text-muted">v{res.version}</span></h2>
        {res.botUsername && (
          <a
            href={`https://t.me/${res.botUsername}`}
            target="_blank"
            className="mb-2 flex items-center justify-between rounded-xl bg-[#2aabee] px-4 py-3 font-medium text-white"
          >
            <span>Telegramda ochish</span>
            <span>@{res.botUsername} ↗</span>
          </a>
        )}
        {/* no bot yet: create it right here (one tap for Telegram accounts), no trip to Settings */}
        {!res.botUsername && (
          <div className="mb-3">
            <BotCreator
              projectId={projectId}
              onConnected={() => api<{ botUsername?: string }>(`/api/projects/${projectId}`).then((p) => onBot(p.botUsername ?? null)).catch(() => {})}
            />
          </div>
        )}
        {/* without a bot, the bot card above already says what is missing: do not repeat it as warnings */}
        {warnings.length > 0 && (
          <ul className="mt-4 space-y-1.5 text-[13px] text-warn">
            {warnings.map((w) => (
              <li key={w}><Warning className="mr-1 inline" />{w}</li>
            ))}
          </ul>
        )}
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-panel-2 py-2 text-sm hover:bg-line">
          Yopish
        </button>
      </div>
    </div>
  );
}
