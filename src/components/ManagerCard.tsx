"use client";
import { useEffect, useState } from "react";
import { Robot } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { useX } from "@/i18n/client";

interface Setup {
  username: string;
  canManageBots: boolean;
  webhook: string;
}

/** Admin: status of the platform's manager bot (the bot that creates users' bots) and a one-click webhook setup. */
export function ManagerCard() {
  const x = useX();
  const [info, setInfo] = useState<{ configured: boolean; username: string | null } | null>(null);
  const [res, setRes] = useState<Setup | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ configured: boolean; username: string | null }>("/api/admin/manager").then(setInfo).catch((e) => setErr(e.message));
  }, []);
  async function setup() {
    setBusy(true);
    setErr("");
    try {
      setRes(await api<Setup>("/api/admin/manager", { method: "POST" }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!info) return null;
  return (
    <div className="card mb-6 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Robot size={20} weight="fill" className="text-accent-2" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{x("Manager bot (foydalanuvchilar uchun bot yaratadi)")}</p>
          <p className="text-xs text-muted">
            {info.configured ? <>@{info.username} {x("sozlangan")}</> : <>{x("Sozlanmagan: serverda TELEGRAM_MANAGER_BOT_TOKEN va TELEGRAM_MANAGER_BOT_USERNAME kerak")}</>}
          </p>
        </div>
        {info.configured && (
          <button className="btn" disabled={busy} onClick={setup}>
            {busy ? x("Tekshirilmoqda…") : x("Webhook o'rnatish va tekshirish")}
          </button>
        )}
      </div>
      {res && (
        <p className={`mt-3 ${res.canManageBots ? "text-ok" : "text-warn"}`}>
          {res.canManageBots ? x("Tayyor: bot boshqarish rejimi yoqilgan.") : x("Webhook o'rnatildi, lekin Telegram bu botga bot boshqarish huquqini ko'rsatmayapti. BotFather'da Bot Management Mode ni yoqing.")}
        </p>
      )}
      {err && <p className="mt-3 text-danger">{err}</p>}
    </div>
  );
}
