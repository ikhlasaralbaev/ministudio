"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageSquare, Sparkle, Trash, UploadSimple } from "@phosphor-icons/react";
import { api, uploadAsset, type AssetItem } from "@/lib/client";
import { ACCEPT, pickImages } from "@/lib/attachFiles";
import { useX } from "@/i18n/client";

/**
 * The project's logo: shows the current one, uploads a new one (replaces it) or removes it. The AI reads the logo's
 * look and main color; "apply" asks it to put the logo into the app and adopt the color.
 */
export function LogoUploader({ projectId, canEdit, onApply }: { projectId: string; canEdit: boolean; onApply?: () => void }) {
  const x = useX();
  const [logo, setLogo] = useState<AssetItem | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [fresh, setFresh] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(
    () =>
      api<{ items: AssetItem[] }>(`/api/projects/${projectId}/assets`)
        .then((r) => setLogo(r.items.find((x) => x.kind === "logo") ?? null))
        .catch(() => setLogo(null)),
    [projectId],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function pick(files: File[]) {
    const { ok, error } = pickImages(files.slice(0, 1), 0);
    if (error || !ok[0]) return setErr(error);
    setBusy(true);
    setErr("");
    try {
      setLogo(await uploadAsset(projectId, ok[0], "logo"));
      setFresh(true);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!logo || !window.confirm(x("Logo o'chirilsinmi?"))) return;
    await api(`/api/projects/${projectId}/assets/${logo.id}`, { method: "DELETE" });
    setLogo(null);
    setFresh(false);
  }

  if (logo === undefined) return <div className="ms-skeleton h-16 rounded-lg" />;
  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => (pick([...(e.target.files || [])]), (e.target.value = ""))} />
      <div className="flex items-center gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-[repeating-conic-gradient(#8883_0_25%,transparent_0_50%)] bg-[length:12px_12px]">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${logo.url}?v=${logo.id}`} alt="Logo" className="h-full w-full object-contain" />
          ) : (
            <ImageSquare size={22} className="text-muted" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-[12px] text-muted">
          {logo ? (
            <p className="flex items-center gap-1.5">
              {logo.width}×{logo.height}
              {logo.color && (
                <>
                  <i className="inline-block h-3 w-3 rounded-full border border-line" style={{ background: logo.color }} />
                  <code>{logo.color}</code>
                </>
              )}
            </p>
          ) : (
            <p>{x("PNG, JPG yoki WebP, 5 MB gacha. AI logoni ilovaga qo'yadi va rangini oladi.")}</p>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => input.current?.click()}>
            <UploadSimple /> {busy ? x("Yuklanmoqda…") : logo ? x("Almashtirish") : x("Logo yuklash")}
          </button>
          {logo && (
            <button type="button" className="btn btn-sm btn-danger" onClick={remove} title={x("O'chirish")}>
              <Trash />
            </button>
          )}
          {logo && onApply && (
            <button type="button" className={`btn btn-sm ${fresh ? "btn-primary" : ""}`} onClick={onApply}>
              <Sparkle weight="fill" /> {x("Ilovaga qo'llash")}
            </button>
          )}
        </div>
      )}
      {err && <p className="text-xs text-danger">{err}</p>}
    </div>
  );
}
