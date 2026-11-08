"use client";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Field, inputCls, ProjectNav } from "@/components/ui";
import { Members } from "@/components/Members";
import { BotCreator } from "@/components/BotCreator";
import { SharePoster } from "@/components/SharePoster";
import { LogoUploader } from "@/components/AssetUploader";
import type { ProjectDTO } from "@/lib/types";

interface EnvResp {
  env: Record<string, string>;
  botUsername: string | null;
  ownerLink: string | null;
  callbacks: { click: string; payme: string; webhook: string };
  published: boolean;
}

const KNOWN: { key: string; label: string; hint: React.ReactNode; secret?: boolean; group: string }[] = [
  {
    key: "BOT_TOKEN",
    label: "Telegram bot token",
    group: "Telegram",
    secret: true,
    hint: (
      <>
        @BotFather → /newbot → tokenni shu yerga qo&apos;ying. Saqlanganda token tekshiriladi.
      </>
    ),
  },
  {
    key: "OWNER_CHAT_ID",
    label: "Egasining chat ID",
    group: "Telegram",
    hint: "Buyurtma va to'lov xabarlari shu chatga boradi. Pastdagi tugma orqali avtomatik ulash mumkin.",
  },
  { key: "CLICK_SERVICE_ID", label: "Click service_id", group: "Click", hint: "Click merchant kabinetidan" },
  { key: "CLICK_MERCHANT_ID", label: "Click merchant_id", group: "Click", hint: "" },
  { key: "CLICK_SECRET_KEY", label: "Click secret key", group: "Click", secret: true, hint: "Prepare/Complete imzosini tekshirish uchun" },
  { key: "PAYME_MERCHANT_ID", label: "Payme merchant ID", group: "Payme", hint: "Payme Business kabinetidan" },
  { key: "PAYME_KEY", label: "Payme kalit (key)", group: "Payme", secret: true, hint: "Merchant API Basic auth uchun" },
];

function SettingsInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = useSearchParams().get("new") === "1";
  const [name, setName] = useState("");
  const [data, setData] = useState<EnvResp | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<{ k: string; v: string }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [me, setMe] = useState<{ id: string } | null>(null);

  const load = async () => {
    const [p, e, u] = await Promise.all([
      api<ProjectDTO>(`/api/projects/${id}`),
      api<EnvResp>(`/api/projects/${id}/env`),
      api<{ id: string }>("/api/me"),
    ]);
    setProject(p);
    setMe(u);
    setName(p.name);
    setData(e);
    setForm(e.env);
    setCustom(
      Object.entries(e.env)
        .filter(([k]) => !KNOWN.some((x) => x.key === k))
        .map(([k, v]) => ({ k, v })),
    );
  };
  useEffect(() => {
    load().catch((e) => setMsg({ ok: false, text: e.message }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const env: Record<string, string> = {};
      for (const k of KNOWN) env[k.key] = form[k.key] ?? "";
      for (const c of custom) if (c.k.trim()) env[c.k.trim().toUpperCase()] = c.v;
      // removed custom keys
      for (const k of Object.keys(data?.env || {}))
        if (!KNOWN.some((x) => x.key === k) && !custom.some((c) => c.k.trim().toUpperCase() === k)) env[k] = "";
      await api(`/api/projects/${id}`, { method: "PATCH", json: { name } });
      const r = await api<{ botUsername: string | null }>(`/api/projects/${id}/env`, { method: "PUT", json: { env } });
      setMsg({ ok: true, text: r.botUsername ? `Saqlandi. Bot: @${r.botUsername}` : "Saqlandi" });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  const groups = [...new Set(KNOWN.map((k) => k.group))];
  const canEdit = !!project?.permissions.update;

  return (
    <div className="flex h-full flex-col">
      <ProjectNav id={id} name={name} project={project} />
      <div className="scroll-thin flex-1 overflow-auto">
        <form onSubmit={save} className="mx-auto max-w-3xl space-y-6 px-6 pt-8">
          {project && !canEdit && (
            <div className="rounded-xl border border-line bg-panel-2 p-4 text-sm text-muted">
              Sizda faqat ko&apos;rish huquqi bor: sozlamalarni o&apos;zgartira olmaysiz.
            </div>
          )}
          <fieldset disabled={!canEdit} className="space-y-6">
          {isNew && (
            <div className="rounded-xl border border-accent/40 bg-accent/10 p-4 text-sm">
              Loyiha yaratildi. Bot token va to&apos;lov kalitlarini kiriting (keyinroq ham qo&apos;shsa bo&apos;ladi), keyin{" "}
              <Link href={`/projects/${id}/studio`} className="font-medium text-accent-2 underline">
                Studio
              </Link>
              ga o&apos;ting.
            </div>
          )}

          <section className="rounded-2xl border border-line bg-panel p-6">
            <h2 className="mb-4 font-semibold">Loyiha</h2>
            <Field label="Nomi">
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="mt-4">
              <span className="mb-1 block text-xs font-medium text-muted">Logo</span>
              <LogoUploader projectId={id} canEdit={canEdit} />
            </div>
          </section>

          {groups.map((g) => (
            <section key={g} className="rounded-2xl border border-line bg-panel p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">{g}</h2>
                {g === "Telegram" && data?.botUsername && (
                  <a href={`https://t.me/${data.botUsername}`} target="_blank" className="text-sm text-accent-2">
                    @{data.botUsername} ↗
                  </a>
                )}
              </div>
              <div className="space-y-4">
                {g === "Telegram" && <BotCreator projectId={id} onConnected={() => void load()} onOwnerId={(tgId) => setForm((f) => ({ ...f, OWNER_CHAT_ID: String(tgId) }))} />}
                {g === "Telegram" && data?.botUsername && <SharePoster botUsername={data.botUsername} name={name || "Mini App"} />}
                {KNOWN.filter((k) => k.group === g && !(k.key === "BOT_TOKEN" && !data?.env.BOT_TOKEN)).map((k) => ( // no bot yet: the card above takes the token (checked before saving)
                  <Field key={k.key} label={`${k.label} · ${k.key}`} hint={k.hint}>
                    <input
                      className={inputCls + " font-mono"}
                      type={k.secret ? "password" : "text"}
                      autoComplete="off"
                      value={form[k.key] ?? ""}
                      onFocus={(e) => k.secret && e.target.value.includes("••") && setForm({ ...form, [k.key]: "" })}
                      onChange={(e) => setForm({ ...form, [k.key]: e.target.value })}
                      placeholder={k.secret && data?.env[k.key] ? "o'zgartirish uchun yangisini kiriting" : ""}
                    />
                  </Field>
                ))}
                {g === "Telegram" && data?.ownerLink && (
                  <div className="rounded-lg bg-panel-2 p-3 text-sm">
                    <p className="mb-2 text-muted">
                      Egasini avtomatik ulash: ilova e&apos;lon qilingandan keyin quyidagi havolani Telegramda oching va Start bosing.
                    </p>
                    <a href={data.ownerLink} target="_blank" className="break-all font-mono text-accent-2">
                      {data.ownerLink}
                    </a>
                    {!data.published && <p className="mt-2 text-warn">Avval Studio&apos;da Publish qiling (webhook o&apos;rnatiladi).</p>}
                  </div>
                )}
                {g === "Click" && data && (
                  <p className="text-xs text-muted">
                    Click kabinetida Prepare va Complete URL: <code className="text-fg/80">{data.callbacks.click}</code>
                  </p>
                )}
                {g === "Payme" && data && (
                  <p className="text-xs text-muted">
                    Payme kabinetida endpoint: <code className="text-fg/80">{data.callbacks.payme}</code>
                  </p>
                )}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-line bg-panel p-6">
            <h2 className="mb-1 font-semibold">Boshqa o&apos;zgaruvchilar</h2>
            <p className="mb-4 text-sm text-muted">Har qanday qo&apos;shimcha kalit. Barchasi shifrlangan holda saqlanadi.</p>
            <div className="space-y-2">
              {custom.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={inputCls + " w-56 font-mono uppercase"}
                    placeholder="KALIT_NOMI"
                    value={c.k}
                    onChange={(e) => setCustom(custom.map((x, j) => (j === i ? { ...x, k: e.target.value } : x)))}
                  />
                  <input
                    className={inputCls + " font-mono"}
                    placeholder="qiymat"
                    value={c.v}
                    onChange={(e) => setCustom(custom.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))}
                  />
                  <button type="button" onClick={() => setCustom(custom.filter((_, j) => j !== i))} className="px-2 text-muted hover:text-danger">
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setCustom([...custom, { k: "", v: "" }])} className="text-sm text-accent-2">
                + O&apos;zgaruvchi qo&apos;shish
              </button>
            </div>
          </section>

          </fieldset>

          <div className="sticky bottom-0 z-10 flex items-center gap-4 border-t border-line bg-bg/90 py-4 backdrop-blur">
            {canEdit && (
              <button disabled={saving} className="rounded-xl bg-primary px-6 py-2.5 font-medium text-white hover:bg-primary-2 disabled:opacity-50">
                {saving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            )}
            <Link href={`/projects/${id}/studio`} className="text-sm text-muted hover:text-fg">
              Studio&apos;ga o&apos;tish →
            </Link>
            {msg && <span className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</span>}
          </div>
        </form>
        <div className="mx-auto max-w-3xl px-6 pb-10 pt-6">
          {project && me && <Members projectId={id} perms={project.permissions} userId={me.id} />}

          {project && (
            <section className="rounded-2xl border border-line bg-panel p-6">
              <h2 className="mb-1 font-semibold">Nusxa va eksport</h2>
              <p className="mb-4 text-sm text-muted">Ilovaning dizayni va mantig&apos;i (kalitlar, buyurtmalar va mijozlar ma&apos;lumoti kirmaydi).</p>
              <div className="flex flex-wrap gap-2">
                <a className="btn btn-sm" href={`/api/projects/${id}/export`} download>
                  Yuklab olish (JSON)
                </a>
                {canEdit && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={async () => {
                      try {
                        const r = await api<{ _id: string }>(`/api/projects/${id}/duplicate`, { method: "POST" });
                        router.push(`/projects/${r._id}/studio`);
                      } catch (e) {
                        setMsg({ ok: false, text: (e as Error).message });
                      }
                    }}
                  >
                    Nusxa yaratish
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
