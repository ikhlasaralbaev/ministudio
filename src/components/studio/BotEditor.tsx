"use client";
import { Plus, Trash } from "@phosphor-icons/react";
import type { AppDoc, BotConfig, Op } from "@/lib/types";
import { formatButtons, formatKeyboard, formatSteps, parseButtons, parseKeyboard, parseSteps, slug } from "@/lib/botText";
import { Row, Section, Txt } from "./Inspector";
import { useX } from "@/i18n/client";

type Apply = (ops: Op[], coalesceKey?: string) => void;
const sel = "w-full rounded-lg bg-panel-2 px-2 py-1.5 text-[13px] outline-none focus:border-accent";

function Target({ value, onChange, targets }: { value: string; onChange: (v: string) => void; targets: string[] }) {
  const x = useX();
  return (
    <select className={sel} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{x("— tanlang —")}</option>
      {targets.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}
function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="btn btn-sm w-full">
      <Plus /> {label}
    </button>
  );
}
function DelBtn({ onClick }: { onClick: () => void }) {
  const x = useX();
  return (
    <button onClick={onClick} className="btn btn-sm btn-danger" title={x("O'chirish")}>
      <Trash />
    </button>
  );
}
function Card({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="space-y-2 rounded-lg border border-line p-2">
      {children}
      <div className="flex justify-end">
        <DelBtn onClick={onDelete} />
      </div>
    </div>
  );
}

/** Editor for the bot's chat features: messages, commands, keywords, question flows, owner alerts. */
export function BotEditor({ doc, apply }: { doc: AppDoc; apply: Apply }) {
  const x = useX();
  const bot = doc.bot;
  const set = (patch: Partial<BotConfig>, key?: string) => apply([{ op: "setBot", bot: patch }], key);
  const messages = bot.messages || [];
  const commands = bot.commands || [];
  const keywords = bot.keywords || [];
  const flows = bot.flows || [];
  const alerts = bot.ownerAlerts || [];
  const records = doc.collections.filter((c) => c.mode === "records").map((c) => c.name);
  const targets = [...messages.map((m) => m.id), ...flows.map((f) => f.id)];
  const nextId = (base: string) => {
    let i = 1;
    while (targets.includes(`${base}${i}`)) i++;
    return `${base}${i}`;
  };
  const patch = <T,>(list: T[], i: number, p: Partial<T>) => list.map((x, k) => (k === i ? { ...x, ...p } : x));
  const del = <T,>(list: T[], i: number) => list.filter((_, k) => k !== i);

  return (
    <>
      <Section title={x("Bot: xabarlar")}>
        <p className="text-[11px] leading-snug text-muted">{x("Tugma qatori: «Yozuv -> app», «-> https://…» yoki «-> boshqa id». Bir qatorda bir nechta tugma: « | »")}</p>
        {messages.map((m, i) => (
          <Card key={i} onDelete={() => set({ messages: del(messages, i) })}>
            <Row label="id">
              <Txt mono value={m.id} onChange={(v) => slug(v) && set({ messages: patch(messages, i, { id: slug(v) }) }, `bm.${i}.id`)} />
            </Row>
            <Txt multiline value={m.text} placeholder={x("Xabar matni")} onChange={(v) => set({ messages: patch(messages, i, { text: v }) }, `bm.${i}.t`)} />
            <Txt multiline mono placeholder={x("Inline tugmalar")} value={formatButtons(m.buttons)} onChange={(v) => set({ messages: patch(messages, i, { buttons: parseButtons(v) }) }, `bm.${i}.b`)} />
            <Txt multiline mono placeholder={x("Pastki klaviatura (ixtiyoriy): A | B")} value={formatKeyboard(m.keyboard)} onChange={(v) => set({ messages: patch(messages, i, { keyboard: parseKeyboard(v) }) }, `bm.${i}.k`)} />
          </Card>
        ))}
        <AddBtn label={x("Xabar qo'shish")} onClick={() => set({ messages: [...messages, { id: nextId("xabar"), text: "Salom!" }] })} />
        <Row label={x("Mos kelmasa")}>
          <Target targets={targets} value={bot.fallback || ""} onChange={(v) => set({ fallback: v || undefined })} />
        </Row>
      </Section>

      <Section title={x("Bot: buyruqlar")}>
        {commands.map((c, i) => (
          <Card key={i} onDelete={() => set({ commands: del(commands, i) })}>
            <Row label="/buyruq">
              <Txt mono value={c.command} onChange={(v) => /^[a-z]/.test(slug(v, 32)) && set({ commands: patch(commands, i, { command: slug(v, 32).replace(/-/g, "_") }) }, `bc.${i}.c`)} />
            </Row>
            <Row label={x("Tavsif")}>
              <Txt value={c.description} onChange={(v) => set({ commands: patch(commands, i, { description: v }) }, `bc.${i}.d`)} />
            </Row>
            <Row label={x("Javob")}>
              <Target targets={targets} value={c.to} onChange={(v) => set({ commands: patch(commands, i, { to: v }) })} />
            </Row>
          </Card>
        ))}
        <AddBtn label={x("Buyruq qo'shish")} onClick={() => set({ commands: [...commands, { command: `buyruq${commands.length + 1}`, description: "Tavsif", to: targets[0] || "" }] })} />
      </Section>

      <Section title={x("Bot: kalit so'zlar")}>
        {keywords.map((k, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
            <Txt value={k.match} placeholder="narx" onChange={(v) => set({ keywords: patch(keywords, i, { match: v }) }, `bk.${i}`)} />
            <Target targets={targets} value={k.to} onChange={(v) => set({ keywords: patch(keywords, i, { to: v }) })} />
            <DelBtn onClick={() => set({ keywords: del(keywords, i) })} />
          </div>
        ))}
        <AddBtn label={x("Kalit so'z qo'shish")} onClick={() => set({ keywords: [...keywords, { match: "", to: targets[0] || "" }] })} />
      </Section>

      <Section title={x("Bot: so'rovnomalar")}>
        <p className="text-[11px] leading-snug text-muted">{x("Qadam: kalit | savol | text/phone/number/choice | variantlar")}</p>
        {flows.map((f, i) => (
          <Card key={i} onDelete={() => set({ flows: del(flows, i) })}>
            <Row label="id">
              <Txt mono value={f.id} onChange={(v) => slug(v) && set({ flows: patch(flows, i, { id: slug(v) }) }, `bf.${i}.id`)} />
            </Row>
            <Txt multiline placeholder={x("Kirish matni (ixtiyoriy)")} value={f.intro || ""} onChange={(v) => set({ flows: patch(flows, i, { intro: v || undefined }) }, `bf.${i}.i`)} />
            <Txt multiline mono placeholder={x("name | Ismingiz?")} value={formatSteps(f.steps)} onChange={(v) => set({ flows: patch(flows, i, { steps: parseSteps(v) }) }, `bf.${i}.s`)} />
            <Txt multiline placeholder={x("Yakuniy matn")} value={f.done} onChange={(v) => set({ flows: patch(flows, i, { done: v }) }, `bf.${i}.d`)} />
            <Row label={x("Saqlash")}>
              <select className={sel} value={f.saveTo || ""} onChange={(e) => set({ flows: patch(flows, i, { saveTo: e.target.value || undefined }) })}>
                <option value="">{x("— saqlamaslik —")}</option>
                {records.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Row>
            <label className="flex items-center gap-2 text-[12px] text-muted">
              <input type="checkbox" checked={f.notifyOwner !== false} onChange={(e) => set({ flows: patch(flows, i, { notifyOwner: e.target.checked }) })} />
              {x("Egaga xabar yuborish")}
            </label>
          </Card>
        ))}
        <AddBtn
          label={x("So'rovnoma qo'shish")}
          onClick={() =>
            set({
              flows: [
                ...flows,
                { id: nextId("soralma"), saveTo: records[0], done: "Rahmat! Tez orada bog'lanamiz.", steps: [{ key: "name", ask: "Ismingiz?", kind: "text" }, { key: "phone", ask: "Telefon raqamingiz?", kind: "phone" }] },
              ],
            })
          }
        />
      </Section>

      <Section title={x("Bot: egaga tugmali xabar")}>
        <p className="text-[11px] leading-snug text-muted">{x("Yangi yozuv egaga «Qabul qilish / Rad etish» tugmalari bilan boradi, mijozga natija yuboriladi.")}</p>
        {records.length === 0 && <p className="text-[12px] text-muted">{x("Yozuv kolleksiyasi yo'q.")}</p>}
        {records.map((r) => {
          const a = alerts.find((x) => x.collection === r);
          return (
            <div key={r} className="space-y-1.5 rounded-lg border border-line p-2">
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={!!a} onChange={(e) => set({ ownerAlerts: e.target.checked ? [...alerts, { collection: r }] : alerts.filter((x) => x.collection !== r) })} />
                <b>{r}</b>
              </label>
              {a && (
                <>
                  <Txt placeholder={x("Qabul qilinganda mijozga")} value={a.acceptText || ""} onChange={(v) => set({ ownerAlerts: alerts.map((x) => (x.collection === r ? { ...x, acceptText: v || undefined } : x)) }, `ba.${r}.a`)} />
                  <Txt placeholder={x("Rad etilganda mijozga")} value={a.rejectText || ""} onChange={(v) => set({ ownerAlerts: alerts.map((x) => (x.collection === r ? { ...x, rejectText: v || undefined } : x)) }, `ba.${r}.r`)} />
                </>
              )}
            </div>
          );
        })}
      </Section>
    </>
  );
}
