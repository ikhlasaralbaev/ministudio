"use client";
import { useEffect, useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { z } from "zod";
import { ActionSchema, CollectionSchema, type AppDoc, type Op, type UINode } from "@/lib/types";
import { describeAction } from "./describe";
import { BotEditor } from "./BotEditor";
import { LogoUploader } from "@/components/AssetUploader";
import { useParams } from "next/navigation";
import { CollectionEditor, StateEditor } from "./DataEditors";

const inp =
  "w-full rounded-lg bg-panel-2 px-2 py-1.5 text-[13px] outline-none focus:border-accent";

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="border-b border-line px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</span>
        {right}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[84px_1fr] items-center gap-2">
      <span className="truncate text-[12px] text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Text input that commits on every change but keeps local value while focused (no cursor jumps). */
export function Txt({
  value,
  onChange,
  multiline,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  mono?: boolean;
}) {
  const [v, setV] = useState(value);
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (!focus) setV(value);
  }, [value, focus]);
  const props = {
    value: v,
    placeholder,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setV(e.target.value);
      onChange(e.target.value);
    },
    className: inp + (mono ? " font-mono text-[12px]" : ""),
  };
  return multiline ? <textarea rows={3} {...props} /> : <input {...props} />;
}

/** JSON textarea that applies only when valid. */
function JsonEdit({
  value,
  onApply,
  rows = 6,
  validate,
}: {
  value: unknown;
  onApply: (v: any) => void;
  rows?: number;
  validate?: (v: unknown) => string | null;
}) {
  const text = JSON.stringify(value ?? null, null, 2);
  const [v, setV] = useState(text);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setV(text), [text]);
  return (
    <div>
      <textarea
        rows={rows}
        spellCheck={false}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v === text) return;
          try {
            const parsed = JSON.parse(v);
            const e = validate?.(parsed);
            if (e) return setErr(e);
            setErr(null);
            onApply(parsed);
          } catch (e) {
            setErr((e as Error).message);
          }
        }}
        className={inp + " font-mono text-[11.5px] leading-snug"}
      />
      {err && <p className="mt-1 text-[11px] text-danger">{err}</p>}
    </div>
  );
}

function Sel({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inp}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o || "—"}
        </option>
      ))}
    </select>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div className="flex gap-1.5">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-[30px] w-8 shrink-0 cursor-pointer rounded border border-line bg-panel-2" />
      <Txt value={value} onChange={onChange} placeholder="—" mono />
    </div>
  );
}

const STYLE_FIELDS: { key: string; label: string; kind?: "color" | "select"; options?: string[] }[] = [
  { key: "color", label: "Matn rangi", kind: "color" },
  { key: "background", label: "Fon", kind: "color" },
  { key: "fontSize", label: "Shrift" },
  { key: "fontWeight", label: "Qalinlik", kind: "select", options: ["", "400", "500", "600", "700", "800"] },
  { key: "textAlign", label: "Tekislash", kind: "select", options: ["", "left", "center", "right"] },
  { key: "padding", label: "Padding" },
  { key: "margin", label: "Margin" },
  { key: "gap", label: "Gap" },
  { key: "borderRadius", label: "Radius" },
  { key: "width", label: "Kenglik" },
  { key: "height", label: "Balandlik" },
  { key: "flex", label: "Flex" },
  { key: "justifyContent", label: "Justify", kind: "select", options: ["", "flex-start", "center", "flex-end", "space-between", "space-around"] },
  { key: "alignItems", label: "Align", kind: "select", options: ["", "flex-start", "center", "flex-end", "stretch"] },
  { key: "border", label: "Chegara" },
  { key: "boxShadow", label: "Soya" },
];

function toStyleVal(v: string): string | number | null {
  if (v === "") return null;
  return /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v;
}

export function NodeInspector({
  doc,
  node,
  parentId,
  apply,
  onSelect,
  onDuplicate,
  onShift,
}: {
  doc: AppDoc;
  node: UINode;
  parentId: string | null;
  apply: (ops: Op[], coalesceKey?: string) => void;
  onSelect: (id: string | null) => void;
  onDuplicate: () => void;
  onShift: (dir: -1 | 1) => void;
}) {
  const p = node.props || {};
  const s = node.style || {};
  const setProp = (k: string, v: unknown) => apply([{ op: "update", id: node.id, props: { [k]: v === "" ? null : v } }], `${node.id}.p.${k}`);
  const setStyle = (k: string, v: string) => apply([{ op: "update", id: node.id, style: { [k]: toStyleVal(v) } }], `${node.id}.s.${k}`);
  const stateKeys = Object.keys(doc.state || {});
  const isScreen = node.type === "Screen";
  const actions = node.events?.onClick || [];

  return (
    <div>
      <Section
        title={node.type}
        right={
          <div className="flex gap-1 text-[12px]">
            {parentId && (
              <button title="Ota elementni tanlash" onClick={() => onSelect(parentId)} className="rounded px-1.5 py-0.5 text-muted hover:bg-panel-2 hover:text-fg">
                ↰
              </button>
            )}
            {!isScreen && (
              <>
                <button title="Yuqoriga" onClick={() => onShift(-1)} className="rounded px-1.5 py-0.5 text-muted hover:bg-panel-2 hover:text-fg">↑</button>
                <button title="Pastga" onClick={() => onShift(1)} className="rounded px-1.5 py-0.5 text-muted hover:bg-panel-2 hover:text-fg">↓</button>
              </>
            )}
            <button title="Nusxalash (⌘D)" onClick={onDuplicate} className="rounded px-1.5 py-0.5 text-muted hover:bg-panel-2 hover:text-fg">⧉</button>
            <button
              title="O'chirish (Del)"
              onClick={() => {
                apply([{ op: "delete", id: node.id }]);
                onSelect(null);
              }}
              className="rounded px-1.5 py-0.5 text-muted hover:bg-danger/20 hover:text-danger"
            >
              <Trash className="inline" />
            </button>
          </div>
        }
      >
        <Row label="Nomi">
          <Txt value={node.name || ""} placeholder={node.type} onChange={(v) => apply([{ op: "update", id: node.id, name: v }], `${node.id}.name`)} />
        </Row>
        <Row label="ID">
          <code className="truncate text-[12px] text-muted">{node.id}</code>
        </Row>
      </Section>

      <Section title="Kontent">
        {(node.type === "Text" || node.type === "Button" || node.type === "Badge") && (
          <Row label="Matn">
            <Txt value={String(p.text ?? "")} onChange={(v) => setProp("text", v)} multiline={node.type === "Text"} />
          </Row>
        )}
        {node.type === "Icon" && (
          <>
            <Row label="Ikonka">
              <Txt mono value={String(p.name ?? "")} placeholder="shopping-cart" onChange={(v) => setProp("name", v)} />
            </Row>
            <Row label="O'lcham">
              <Txt mono value={String(p.size ?? 22)} onChange={(v) => setProp("size", Number(v) || 22)} />
            </Row>
            <Row label="Rang">
              <Txt mono value={String(p.color ?? "")} placeholder="#e8590c" onChange={(v) => setProp("color", v)} />
            </Row>
            <Row label="Qalinlik">
              <Sel value={String(p.weight || "bold")} options={["thin", "light", "regular", "bold", "fill", "duotone"]} onChange={(v) => setProp("weight", v)} />
            </Row>
          </>
        )}
        {node.type === "Text" && (
          <Row label="Turi">
            <Sel value={String(p.variant || "body")} options={["h1", "h2", "h3", "body", "caption"]} onChange={(v) => setProp("variant", v)} />
          </Row>
        )}
        {node.type === "Button" && (
          <Row label="Ko'rinish">
            <Sel value={String(p.variant || "primary")} options={["primary", "secondary", "ghost"]} onChange={(v) => setProp("variant", v)} />
          </Row>
        )}
        {node.type === "Image" && (
          <>
            <Row label="Rasm URL">
              <Txt value={String(p.src ?? "")} onChange={(v) => setProp("src", v)} mono />
            </Row>
            <Row label="Nisbat">
              <Sel value={String(p.aspect || "16/10")} options={["16/10", "16/9", "4/3", "1/1", "3/4"]} onChange={(v) => setProp("aspect", v)} />
            </Row>
          </>
        )}
        {node.type === "Input" && (
          <>
            <Row label="State kaliti">
              <Txt value={String(p.bind ?? "")} onChange={(v) => setProp("bind", v)} placeholder={stateKeys.join(", ")} mono />
            </Row>
            <Row label="Placeholder">
              <Txt value={String(p.placeholder ?? "")} onChange={(v) => setProp("placeholder", v)} />
            </Row>
            <Row label="Turi">
              <Sel value={String(p.inputType || "text")} options={["text", "tel", "number", "email"]} onChange={(v) => setProp("inputType", v)} />
            </Row>
            <Row label="Ko'p qatorli">
              <input type="checkbox" checked={!!p.multiline} onChange={(e) => setProp("multiline", e.target.checked || null)} />
            </Row>
          </>
        )}
        {node.type === "List" && (
          <>
            <Row label="Manba">
              <Txt value={String(p.source ?? "")} onChange={(v) => setProp("source", v)} placeholder="collections.products" mono />
            </Row>
            <Row label="Bo'sh matn">
              <Txt value={String(p.emptyText ?? "")} onChange={(v) => setProp("emptyText", v)} />
            </Row>
          </>
        )}
        {node.type === "Spacer" && (
          <Row label="O'lcham">
            <Txt value={String(p.size ?? "")} onChange={(v) => setProp("size", v ? Number(v) : "")} placeholder="avto" />
          </Row>
        )}
        {isScreen && (
          <Row label="Sarlavha">
            <Txt value={String(p.title ?? "")} onChange={(v) => setProp("title", v)} />
          </Row>
        )}
        <Row label="Ko'rinish sharti">
          <Txt
            value={node.visibleIf || ""}
            onChange={(v) => apply([{ op: "update", id: node.id, visibleIf: v || null }], `${node.id}.vis`)}
            placeholder="har doim (masalan: count(state.cart) > 0)"
            mono
          />
        </Row>
        <p className="text-[11px] leading-snug text-muted">
          Matnlarda <code className="text-fg/70">{"{{ ifoda }}"}</code> ishlatsa bo&apos;ladi: <code className="text-fg/70">{"{{ fmt(item.price) }}"}</code>
        </p>
      </Section>

      <Section title="Stil">
        {STYLE_FIELDS.map((f) => (
          <Row key={f.key} label={f.label}>
            {f.kind === "color" ? (
              <ColorInput value={String(s[f.key] ?? "")} onChange={(v) => setStyle(f.key, v)} />
            ) : f.kind === "select" ? (
              <Sel value={String(s[f.key] ?? "")} options={f.options!} onChange={(v) => setStyle(f.key, v)} />
            ) : (
              <Txt value={String(s[f.key] ?? "")} onChange={(v) => setStyle(f.key, v)} placeholder="—" mono />
            )}
          </Row>
        ))}
        <details>
          <summary className="cursor-pointer text-[12px] text-muted hover:text-fg">Barcha stillar (JSON)</summary>
          <div className="mt-2">
            <JsonEdit
              value={s}
              onApply={(v) => {
                const nulls = Object.fromEntries(Object.keys(s).map((k) => [k, null]));
                apply([{ op: "update", id: node.id, style: { ...nulls, ...v } }]);
              }}
            />
          </div>
        </details>
      </Section>

      <Section title="Logika · bosilganda">
        {actions.length ? (
          <ol className="space-y-1">
            {actions.map((a, i) => (
              <li key={i} className="flex gap-2 rounded-md bg-panel-2 px-2 py-1.5 text-[12px]">
                <span className="text-warn">{i + 1}</span>
                <span className="break-all">{describeAction(a, doc)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[12px] text-muted">Logika yo&apos;q. Elementga comment yozing, masalan: &quot;bosilganda savatga qo&apos;shsin va vibratsiya bersin&quot;.</p>
        )}
        <details>
          <summary className="cursor-pointer text-[12px] text-muted hover:text-fg">Qo&apos;lda tahrirlash (JSON)</summary>
          <div className="mt-2">
            <JsonEdit
              value={actions}
              rows={8}
              validate={(v) => {
                const r = z.array(ActionSchema).safeParse(v);
                return r.success ? null : r.error.issues[0]?.path.join(".") + ": " + r.error.issues[0]?.message;
              }}
              onApply={(v) => apply([{ op: "update", id: node.id, events: v.length ? { onClick: v } : null }])}
            />
          </div>
        </details>
      </Section>
    </div>
  );
}

export function AppInspector({ doc, apply, onAiEdit }: { doc: AppDoc; apply: (ops: Op[], coalesceKey?: string) => void; onAiEdit?: (prompt: string) => void }) {
  const { id: projectId } = useParams<{ id: string }>();
  const t = doc.theme;
  return (
    <div>
      <Section title="Ilova">
        <Row label="Nomi">
          <Txt value={doc.name} onChange={(v) => apply([{ op: "rename", name: v }], "name")} />
        </Row>
      </Section>
      <Section title="Logo">
        <LogoUploader
          projectId={projectId}
          canEdit
          onApply={
            onAiEdit
              ? () => onAiEdit("Loyiha logosini ilovaning sarlavhasiga yoki bosh ekraniga qo'y (kichik, cho'zmasdan) va asosiy rangni logo rangiga moslab yangila.")
              : undefined
          }
        />
      </Section>
      <Section title="Mavzu">
        <Row label="Asosiy rang">
          <ColorInput value={t.primary} onChange={(v) => apply([{ op: "setTheme", theme: { primary: v } }], "t.primary")} />
        </Row>
        <Row label="Fon">
          <ColorInput value={t.background} onChange={(v) => apply([{ op: "setTheme", theme: { background: v } }], "t.bg")} />
        </Row>
        <Row label="Matn">
          <ColorInput value={t.text} onChange={(v) => apply([{ op: "setTheme", theme: { text: v } }], "t.text")} />
        </Row>
        <Row label="Radius">
          <Txt value={String(t.radius)} onChange={(v) => apply([{ op: "setTheme", theme: { radius: Number(v) || 0 } }], "t.radius")} mono />
        </Row>
        <Row label="Shrift">
          <Txt value={t.font} onChange={(v) => apply([{ op: "setTheme", theme: { font: v } }], "t.font")} mono />
        </Row>
      </Section>
      <Section title="Telegram bot">
        <Row label="Salom matni">
          <Txt multiline value={doc.bot.welcomeText} onChange={(v) => apply([{ op: "setBot", bot: { welcomeText: v } }], "b.w")} />
        </Row>
        <Row label="Tugma">
          <Txt value={doc.bot.buttonText} onChange={(v) => apply([{ op: "setBot", bot: { buttonText: v } }], "b.b")} />
        </Row>
      </Section>
      <BotEditor doc={doc} apply={apply} />
      <StateEditor doc={doc} apply={apply} />
      {doc.collections.map((c) => (
        <CollectionEditor key={c.name} doc={doc} c={c} apply={apply} />
      ))}
      <Section title="Yangi kolleksiya">
        <NewCollection onAdd={(c) => apply([{ op: "setCollection", collection: c }])} />
      </Section>
    </div>
  );
}

function NewCollection({ onAdd }: { onAdd: (c: z.infer<typeof CollectionSchema>) => void }) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"static" | "records">("static");
  return (
    <div className="flex gap-1.5">
      <input value={name} onChange={(e) => setName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder="nomi" className={inp} />
      <select value={mode} onChange={(e) => setMode(e.target.value as "static")} className={inp + " w-28"}>
        <option value="static">static</option>
        <option value="records">records</option>
      </select>
      <button
        disabled={!name}
        onClick={() => {
          onAdd({ name, mode, fields: [], ...(mode === "static" ? { data: [] } : {}) });
          setName("");
        }}
        className="btn btn-sm px-2"
      >
        +
      </button>
    </div>
  );
}
