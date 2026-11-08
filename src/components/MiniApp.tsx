"use client";
import { useEffect, useMemo, useState } from "react";
import type { AppDoc } from "@/lib/types";
import { AppView, useRuntime, type Host } from "./runtime";

async function post(slug: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/rt/${slug}/action`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, initData: window.Telegram?.WebApp?.initData || "" }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Xatolik");
  return j;
}

export function MiniApp({ slug }: { slug: string }) {
  const [doc, setDoc] = useState<AppDoc | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch(`/api/rt/${slug}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => (r.ok ? setDoc(j.doc) : setErr(j.error || "Topilmadi"))))
      .catch(() => setErr("Tarmoq xatosi"));
    const tg = window.Telegram?.WebApp;
    tg?.ready?.();
    tg?.expand?.();
  }, [slug]);

  if (err) return <div style={{ padding: 32, fontFamily: "system-ui", textAlign: "center" }}>{err}</div>;
  if (!doc) return <div style={{ padding: 32, fontFamily: "system-ui", textAlign: "center", opacity: 0.5 }}>…</div>;
  return <Running doc={doc} slug={slug} />;
}

function Running({ doc, slug }: { doc: AppDoc; slug: string }) {
  const [toast, setToast] = useState<string | null>(null);
  const host: Host = useMemo(
    () => ({
      dbList: async () => (await post(slug, { type: "dbList" })).records,
      dbInsert: (collection, value) => post(slug, { type: "dbInsert", collection, value }),
      dbUpdate: async (collection, id, value) => (await post(slug, { type: "dbUpdate", collection, id, value })).row,
      dbDelete: async (collection, id) => {
        await post(slug, { type: "dbDelete", collection, id });
      },
      notifyOwner: async (text) => {
        await post(slug, { type: "notifyOwner", text });
      },
      pay: (req) => post(slug, { type: "pay", ...req }),
      toast: (t) => {
        setToast(t);
        setTimeout(() => setToast(null), 3000);
      },
    }),
    [slug],
  );
  const rt = useRuntime(doc, host);

  // Telegram native back button + header colors
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    try {
      tg.setHeaderColor?.(doc.theme.background);
      tg.setBackgroundColor?.(doc.theme.background);
    } catch {}
    const bb = tg.BackButton;
    if (!bb) return;
    const onBack = () => rt.back();
    if (rt.stack.length > 1) bb.show();
    else bb.hide();
    bb.onClick(onBack);
    return () => bb.offClick(onBack);
  }, [rt.stack.length, rt, doc.theme.background]);

  return (
    <div style={{ minHeight: "100vh", background: doc.theme.background, display: "flex", flexDirection: "column" }}>
      <style>{`html,body{margin:0;background:${doc.theme.background}} *{-webkit-tap-highlight-color:transparent} button:active{transform:scale(.98)}`}</style>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <AppView doc={doc} rt={rt} />
      </div>
      {toast && (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 24,
            padding: "12px 16px",
            borderRadius: 14,
            background: "rgba(20,20,20,.92)",
            color: "#fff",
            fontFamily: "system-ui",
            fontSize: 14,
            textAlign: "center",
            zIndex: 100,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
