"use client";
// One renderer for both the Studio canvas and the published Telegram Mini App.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Action, AppDoc, UINode } from "@/lib/types";
import { evaluate, interpolate } from "@/lib/expr";
import { applyRecordChange, type RecordChange, type RecordRow, type RecordsByCollection } from "@/lib/records";

/* ---------------- Host: side effects that differ between studio preview and production ---------------- */

export interface Host {
  /** The current user's own rows of every records collection (called once when the app starts). */
  dbList(): Promise<RecordsByCollection>;
  dbInsert(collection: string, value: unknown): Promise<{ id: string; row?: RecordRow }>;
  dbUpdate(collection: string, id: string, value: unknown): Promise<RecordRow>;
  dbDelete(collection: string, id: string): Promise<void>;
  notifyOwner(text: string): Promise<void>;
  /**
   * `amount` is only a preview. The server recomputes the real amount from `amountExpr`
   * over `state`/`extra`, using catalog prices from the published doc.
   */
  pay(req: PayRequest): Promise<{ url: string; amount?: number } | null>;
  toast(text: string): void;
}

export interface PayRequest {
  provider: "click" | "payme";
  amount: number;
  amountExpr: string;
  description: string;
  state: Record<string, unknown>;
  extra: Record<string, unknown>;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
  }
}
const tg = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : undefined);

/* ---------------- Runtime state hook ---------------- */

export interface Runtime {
  state: Record<string, unknown>;
  /** The user's stored rows per records collection (also visible to expressions as collections.<name>). */
  records: RecordsByCollection;
  screenId: string;
  stack: string[];
  setValue(key: string, value: unknown): void;
  run(actions: Action[] | undefined, extra?: Record<string, unknown>): Promise<void>;
  navigate(screenId: string): void;
  back(): void;
  scope(extra?: Record<string, unknown>): Record<string, unknown>;
  reset(): void;
}

function staticCollections(doc: AppDoc) {
  const out: Record<string, unknown[]> = {};
  for (const c of doc.collections) if (c.mode === "static") out[c.name] = c.data || [];
  return out;
}

function tgUser() {
  const u = tg()?.initDataUnsafe?.user;
  return u
    ? { id: u.id, firstName: u.first_name, lastName: u.last_name || "", username: u.username || "" }
    : { id: 0, firstName: "Mehmon", lastName: "", username: "" };
}

export function useRuntime(doc: AppDoc, host: Host, opts?: { initialScreen?: string }): Runtime {
  const [state, setStateRaw] = useState<Record<string, unknown>>(() => structuredClone(doc.state || {}));
  const stateRef = useRef(state);
  const [stack, setStack] = useState<string[]>([opts?.initialScreen || doc.screens[0]?.id]);
  const stackRef = useRef(stack);

  const setAll = (next: Record<string, unknown>) => {
    stateRef.current = next;
    setStateRaw(next);
  };
  const setValue = useCallback((key: string, value: unknown) => {
    setAll({ ...stateRef.current, [key]: value });
  }, []);

  const setStackBoth = (s: string[]) => {
    stackRef.current = s;
    setStack(s);
  };

  const docRef = useRef(doc);
  docRef.current = doc;
  const hostRef = useRef(host);
  hostRef.current = host;

  // records collections: the user's own stored rows, loaded once and kept in sync with every db action
  const [records, setRecordsRaw] = useState<RecordsByCollection>({});
  const recordsRef = useRef(records);
  const changeRecords = useCallback((c: RecordChange) => {
    recordsRef.current = applyRecordChange(recordsRef.current, c);
    setRecordsRaw(recordsRef.current);
  }, []);
  useEffect(() => {
    let alive = true;
    hostRef.current
      .dbList()
      .then((r) => {
        if (!alive) return;
        recordsRef.current = r;
        setRecordsRaw(r);
      })
      .catch((e) => hostRef.current.toast("Ma'lumotlarni yuklab bo'lmadi: " + (e as Error).message));
    return () => {
      alive = false;
    };
  }, []);

  const scope = useCallback(
    (extra?: Record<string, unknown>) => ({
      state: stateRef.current,
      collections: { ...recordsRef.current, ...staticCollections(docRef.current) },
      user: tgUser(),
      screen: stackRef.current[stackRef.current.length - 1],
      ...extra,
    }),
    [],
  );

  const navigate = useCallback((id: string) => {
    if (!docRef.current.screens.some((s) => s.id === id)) return;
    setStackBoth([...stackRef.current, id]);
    if (typeof window !== "undefined") window.scrollTo?.(0, 0);
  }, []);
  const back = useCallback(() => {
    if (stackRef.current.length > 1) setStackBoth(stackRef.current.slice(0, -1));
  }, []);

  const run = useCallback(
    async (actions: Action[] | undefined, extra?: Record<string, unknown>) => {
      if (!actions?.length) return;
      let last: unknown = undefined;
      for (const a of actions) {
        const sc = scope({ ...extra, last });
        try {
          switch (a.type) {
            case "setState":
              setValue(a.key, evaluate(a.value, sc));
              break;
            case "append": {
              const cur = stateRef.current[a.key];
              setValue(a.key, [...(Array.isArray(cur) ? cur : []), evaluate(a.value, sc)]);
              break;
            }
            case "removeAt": {
              const cur = stateRef.current[a.key];
              const i = Number(evaluate(a.index, sc));
              setValue(
                a.key,
                (Array.isArray(cur) ? cur : []).filter((_, idx) => idx !== i),
              );
              break;
            }
            case "navigate":
              navigate(a.screen);
              break;
            case "back":
              back();
              break;
            case "alert": {
              const t = interpolate(a.text, sc);
              const w = tg();
              if (w?.showAlert && w.platform !== "unknown") await new Promise<void>((r) => w.showAlert(t, () => r()));
              else hostRef.current.toast(t);
              break;
            }
            case "haptic": {
              const h = tg()?.HapticFeedback;
              const s = a.style || "light";
              if (h) {
                if (s === "success" || s === "error") h.notificationOccurred(s);
                else h.impactOccurred(s);
              }
              break;
            }
            case "dbInsert": {
              const res = await hostRef.current.dbInsert(a.collection, evaluate(a.value, sc));
              last = res.id;
              if (res.row) changeRecords({ type: "insert", collection: a.collection, row: res.row });
              if (a.saveIdTo) setValue(a.saveIdTo, res.id);
              break;
            }
            case "dbUpdate": {
              const id = String(evaluate(a.id, sc) ?? "");
              const row = await hostRef.current.dbUpdate(a.collection, id, evaluate(a.value, sc));
              changeRecords({ type: "update", collection: a.collection, row });
              break;
            }
            case "dbDelete": {
              const id = String(evaluate(a.id, sc) ?? "");
              await hostRef.current.dbDelete(a.collection, id);
              changeRecords({ type: "delete", collection: a.collection, id });
              break;
            }
            case "notifyOwner":
              await hostRef.current.notifyOwner(interpolate(a.text, sc));
              break;
            case "pay": {
              const amount = Number(evaluate(a.amount, sc)) || 0;
              const res = await hostRef.current.pay({
                provider: a.provider,
                amount,
                amountExpr: a.amount,
                description: interpolate(a.description || "", sc),
                state: stateRef.current,
                extra: { item: extra?.item, index: extra?.index, last },
              });
              if (res?.url) {
                const w = tg();
                if (w?.openLink && w.platform !== "unknown") w.openLink(res.url);
                else window.open(res.url, "_blank");
              }
              break;
            }
            case "openLink": {
              const url = interpolate(a.url, sc);
              if (!/^https?:\/\/|^tg:\/\//.test(url)) break;
              const w = tg();
              if (url.startsWith("https://t.me/") && w?.openTelegramLink) w.openTelegramLink(url);
              else if (w?.openLink && w.platform !== "unknown") w.openLink(url);
              else window.open(url, "_blank");
              break;
            }
            case "closeApp":
              tg()?.close?.();
              break;
            case "if":
              await run(evaluate(a.cond, sc) ? a.then : a.else, extra);
              break;
          }
        } catch (e) {
          hostRef.current.toast("Xatolik: " + (e as Error).message);
          return;
        }
      }
    },
    [scope, setValue, navigate, back, changeRecords],
  );

  const reset = useCallback(() => {
    setAll(structuredClone(docRef.current.state || {}));
    setStackBoth([docRef.current.screens[0]?.id]);
  }, []);

  return {
    state,
    records,
    screenId: stack[stack.length - 1],
    stack,
    setValue,
    run,
    navigate,
    back,
    scope,
    reset,
  };
}

/* ---------------- Renderer ---------------- */

interface Ctx {
  doc: AppDoc;
  rt: Runtime;
  edit: boolean;
  selectedId?: string | null;
  onSelect?: (id: string, el: HTMLElement) => void;
}
const RenderCtx = createContext<Ctx | null>(null);

const SAFE_STYLE = /javascript:|expression\(|@import/i;

function resolveStyle(style: UINode["style"], scope: Record<string, unknown>): React.CSSProperties {
  const out: Record<string, string | number> = {};
  if (!style) return out;
  for (const [k, v] of Object.entries(style)) {
    const val = typeof v === "string" ? interpolate(v, scope) : v;
    if (typeof val === "string" && SAFE_STYLE.test(val)) continue;
    out[k] = val;
  }
  return out as React.CSSProperties;
}

function baseStyle(n: UINode, doc: AppDoc): React.CSSProperties {
  const t = doc.theme;
  switch (n.type) {
    case "Screen":
      return {
        minHeight: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        background: t.background,
        color: t.text,
        fontFamily: t.font,
        boxSizing: "border-box",
      };
    case "Box":
      return { display: "flex", flexDirection: "column", gap: 8, minWidth: 0 };
    case "Row":
      return { display: "flex", flexDirection: "row", alignItems: "center", gap: 8, minWidth: 0 };
    case "Text": {
      const v = (n.props?.variant as string) || "body";
      const map: Record<string, React.CSSProperties> = {
        h1: { fontSize: 26, fontWeight: 800, lineHeight: 1.2 },
        h2: { fontSize: 21, fontWeight: 700, lineHeight: 1.25 },
        h3: { fontSize: 17, fontWeight: 650, lineHeight: 1.3 },
        body: { fontSize: 15, lineHeight: 1.45 },
        caption: { fontSize: 13, opacity: 0.6, lineHeight: 1.4 },
      };
      return { margin: 0, ...(map[v] || map.body) };
    }
    case "Image":
      return { width: "100%", display: "block", objectFit: "cover", borderRadius: t.radius, background: "#0000000d" };
    case "Button": {
      const v = (n.props?.variant as string) || "primary";
      const common: React.CSSProperties = {
        padding: "12px 16px",
        borderRadius: t.radius,
        fontWeight: 600,
        fontSize: 15,
        border: "none",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "center",
      };
      if (v === "secondary") return { ...common, background: t.primary + "1f", color: t.primary };
      if (v === "ghost") return { ...common, background: "transparent", color: t.primary };
      return { ...common, background: t.primary, color: "#fff" };
    }
    case "Input":
      return {
        padding: "12px 14px",
        borderRadius: t.radius,
        border: "1px solid #0000001f",
        fontSize: 15,
        fontFamily: "inherit",
        background: "#fff",
        color: "#111",
        width: "100%",
        boxSizing: "border-box",
      };
    case "Badge":
      return {
        display: "inline-block",
        alignSelf: "flex-start",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: t.primary + "1f",
        color: t.primary,
      };
    case "Divider":
      return { height: 1, background: "#00000014", border: "none", margin: "4px 0", width: "100%" };
    case "Spacer":
      return { flex: n.props?.size ? undefined : 1, height: (n.props?.size as number) || undefined };
    case "List":
      return { display: "flex", flexDirection: "column", gap: 10 };
  }
  return {};
}

function NodeView({ n, scope }: { n: UINode; scope: Record<string, unknown> }) {
  const ctx = useContext(RenderCtx)!;
  const { doc, rt, edit } = ctx;

  const hidden = n.visibleIf ? !evaluate(n.visibleIf, scope) : false;
  if (hidden && !edit) return null;

  const style: React.CSSProperties = { ...baseStyle(n, doc), ...resolveStyle(n.style, scope) };
  if (hidden && edit) {
    style.opacity = 0.35;
    style.outline = "1px dashed #9ca3af";
  }
  const clickable = !!n.events?.onClick?.length;
  if (clickable && !edit && n.type !== "Button") style.cursor = "pointer";

  const editProps = edit
    ? {
        "data-node-id": n.id,
        "data-selected": ctx.selectedId === n.id ? "true" : undefined,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          ctx.onSelect?.(n.id, e.currentTarget as HTMLElement);
        },
      }
    : clickable
      ? {
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            rt.run(n.events!.onClick, { item: scope.item, index: scope.index });
          },
        }
      : {};

  const kids = (sc = scope) => n.children?.map((c) => <NodeView key={c.id} n={c} scope={sc} />);
  const p = n.props || {};

  switch (n.type) {
    case "Screen":
    case "Box":
    case "Row":
      return (
        <div style={style} {...editProps}>
          {kids()}
        </div>
      );
    case "Text": {
      const v = (p.variant as string) || "body";
      const Tag = (v === "h1" ? "h1" : v === "h2" ? "h2" : v === "h3" ? "h3" : "p") as "p";
      return (
        <Tag style={{ whiteSpace: "pre-wrap", ...style }} {...editProps}>
          {interpolate(p.text, scope)}
        </Tag>
      );
    }
    case "Image": {
      const src = interpolate(p.src, scope);
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='3'/>"}
          alt={interpolate(p.alt, scope)}
          style={{ aspectRatio: (p.aspect as string) || "16/10", ...style }}
          {...editProps}
        />
      );
    }
    case "Button":
      return (
        <button type="button" style={style} {...editProps}>
          {interpolate(p.text, scope)}
        </button>
      );
    case "Badge":
      return (
        <span style={style} {...editProps}>
          {interpolate(p.text, scope)}
        </span>
      );
    case "Divider":
      return <div style={style} {...editProps} />;
    case "Spacer":
      return <div style={style} {...editProps} />;
    case "Input": {
      const key = String(p.bind || "");
      const val = key ? rt.state[key] : "";
      const multiline = !!p.multiline;
      const common = {
        style,
        placeholder: interpolate(p.placeholder, scope),
        value: val == null ? "" : String(val),
        readOnly: edit,
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          if (!key) return;
          rt.setValue(key, p.inputType === "number" ? Number(e.target.value) : e.target.value);
        },
        ...editProps,
      };
      return multiline ? (
        <textarea rows={3} {...common} />
      ) : (
        <input type={(p.inputType as string) === "number" ? "number" : (p.inputType as string) || "text"} {...common} />
      );
    }
    case "List": {
      const items = evaluate(p.source as string, scope);
      const list = Array.isArray(items) ? items : [];
      if (!list.length) {
        return (
          <div style={style} {...editProps}>
            {edit ? (
              <>
                {kids({ ...scope, item: {}, index: 0 })}
                <p style={{ fontSize: 12, opacity: 0.5, margin: 0 }}>
                  {interpolate(p.emptyText, scope) || "Bo'sh ro'yxat"} (namuna)
                </p>
              </>
            ) : p.emptyText ? (
              <p style={{ opacity: 0.6, margin: 0, textAlign: "center", padding: 16 }}>{interpolate(p.emptyText, scope)}</p>
            ) : null}
          </div>
        );
      }
      return (
        <div style={style} {...editProps}>
          {list.map((item, index) => (
            <React.Fragment key={index}>{kids({ ...scope, item, index })}</React.Fragment>
          ))}
        </div>
      );
    }
  }
  return null;
}

export function AppView({
  doc,
  rt,
  edit = false,
  selectedId,
  onSelect,
  screenId,
}: {
  doc: AppDoc;
  rt: Runtime;
  edit?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string, el: HTMLElement) => void;
  screenId?: string;
}) {
  const ctx = useMemo(() => ({ doc, rt, edit, selectedId, onSelect }), [doc, rt, edit, selectedId, onSelect]);
  const sid = screenId || rt.screenId;
  const screen = doc.screens.find((s) => s.id === sid) || doc.screens[0];
  if (!screen) return null;
  return (
    <RenderCtx.Provider value={ctx}>
      <NodeView n={screen} scope={rt.scope()} />
    </RenderCtx.Provider>
  );
}
