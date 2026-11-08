import { lintBot } from "@/lib/bot";
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AppDocSchema, OpSchema, type AppDoc, type Op, type UINode } from "../types";
import { EDIT_SYSTEM, GENERATE_SYSTEM } from "../spec";
import { applyOps, ensureIds, findNode, nodePath, OpError, walk } from "../doc";
import { cafeTemplate } from "../template";
import { validateExpr } from "../expr";
import { addUsage, emptyUsage, type Usage } from "./usage";
import { DEFAULT_AI_MODEL, resolveModel } from "../models";

/** An AI request that failed; carries the tokens it had already spent so they can be recorded. */
export class AiError extends Error {
  constructor(
    message: string,
    public usage: Usage,
  ) {
    super(message);
  }
}

/** Project choice first, then the server-wide ANTHROPIC_MODEL, then the default. */
export const pickModel = (model?: string | null) => (model ? resolveModel(model) : process.env.ANTHROPIC_MODEL || DEFAULT_AI_MODEL);
const mock = () => process.env.AI_MOCK === "1" || !process.env.ANTHROPIC_API_KEY;

let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());

type Msg = Anthropic.MessageParam;

/** Extra semantic checks zod can't express: expressions parse, navigate targets exist, list sources, binds. */
export function lint(doc: AppDoc): string[] {
  const errs: string[] = [];
  const screenIds = new Set(doc.screens.map((s) => s.id));
  const recordCols = new Set(doc.collections.filter((c) => c.mode === "records").map((c) => c.name));
  const checkExpr = (where: string, e?: string) => {
    if (!e) return;
    const err = validateExpr(e);
    if (err) errs.push(`${where}: invalid expression "${e}" (${err})`);
  };
  const checkTpl = (where: string, t?: unknown) => {
    if (typeof t !== "string") return;
    for (const m of t.matchAll(/\{\{([\s\S]+?)\}\}/g)) checkExpr(where, m[1].trim());
  };
  const checkActions = (where: string, acts?: any[]) => {
    for (const a of acts || []) {
      if (a.type === "navigate" && !screenIds.has(a.screen)) errs.push(`${where}: navigate to unknown screen "${a.screen}"`);
      if ((a.type === "dbInsert" || a.type === "dbUpdate" || a.type === "dbDelete") && !recordCols.has(a.collection))
        errs.push(`${where}: ${a.type} to unknown records collection "${a.collection}" (declare it with mode "records")`);
      for (const k of ["value", "amount", "cond", "index"]) checkExpr(`${where}.${a.type}.${k}`, a[k]);
      if (a.type === "dbUpdate" || a.type === "dbDelete") checkExpr(`${where}.${a.type}.id`, a.id);
      for (const k of ["text", "url", "description"]) checkTpl(`${where}.${a.type}.${k}`, a[k]);
      if (a.type === "if") {
        checkActions(where, a.then);
        checkActions(where, a.else);
      }
    }
  };
  walk(doc.screens, (n, parent) => {
    const w = `${n.type}#${n.id}`;
    if (n.type === "Screen" && parent) errs.push(`${w}: Screen must be top-level`);
    if (n.type !== "Screen" && !parent) errs.push(`${w}: top-level nodes must be Screen`);
    checkExpr(w + ".visibleIf", n.visibleIf);
    if (n.type === "List") checkExpr(w + ".source", n.props?.source as string);
    for (const k of ["text", "src", "alt", "placeholder", "emptyText"]) checkTpl(`${w}.${k}`, n.props?.[k]);
    checkActions(w, n.events?.onClick);
  });
  errs.push(...lintBot(doc.bot, [...recordCols]));
  return errs;
}

async function callTool<T>(opts: {
  system: string;
  messages: Msg[];
  tool: Anthropic.Tool;
  parse: (input: unknown) => { ok: true; value: T } | { ok: false; error: string };
  maxTokens: number;
  retries?: number;
  model: string;
}): Promise<{ value: T; usage: Usage }> {
  const messages = [...opts.messages];
  let usage = emptyUsage(opts.model, false);
  const fail = (e: unknown): never => {
    throw e instanceof AiError ? e : new AiError((e as Error)?.message || "AI xatosi", usage);
  };
  for (let attempt = 0; attempt <= (opts.retries ?? 2); attempt++) {
    // streaming avoids the SDK's long-request timeout for large outputs
    const res = await client()
      .messages.stream({
        model: opts.model,
        max_tokens: opts.maxTokens,
        // Design quality matters more than speed here; Opus 5.5 / Haiku 5.5 would otherwise default to "medium".
        output_config: { effort: "high" },
        system: opts.system,
        tools: [opts.tool],
        // Current models (Sonnet 5.5, Opus 5.5, Fable 5.1) reject forced tool_choice ("tool"/"any").
        // "auto" + an explicit instruction, with the output still validated below and retried on failure.
        tool_choice: { type: "auto" },
        messages,
      })
      .finalMessage()
      .catch(fail);
    usage = addUsage(usage, res.usage);
    if (res.stop_reason === "max_tokens") fail(new Error("AI javobi juda uzun bo'lib ketdi, so'rovni qisqartiring"));
    if (res.stop_reason === "refusal") fail(new Error("AI bu so'rovni bajarishdan bosh tortdi, boshqacha yozib ko'ring"));
    const use = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === "tool_use");
    if (!use) {
      // Answered in prose instead of calling the tool: keep the turn and ask again.
      messages.push({ role: "assistant", content: res.content });
      messages.push({
        role: "user",
        content: `Do not answer in text. Call the ${opts.tool.name} tool now with the complete input.`,
      });
      continue;
    }
    let parsed: ReturnType<typeof opts.parse>;
    try {
      parsed = opts.parse(use.input);
    } catch (e) {
      return fail(e);
    }
    if (parsed.ok) return { value: parsed.value, usage };
    messages.push({ role: "assistant", content: res.content });
    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: use.id,
          is_error: true,
          content: `Invalid. Fix these problems and call ${opts.tool.name} again with the complete corrected input:\n${parsed.error}`,
        },
      ],
    });
  }
  return fail(new Error("AI to'g'ri formatdagi javob qaytara olmadi, qaytadan urinib ko'ring"));
}

function zodErr(e: z.ZodError) {
  return e.issues
    .slice(0, 15)
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n");
}

/* ------------------------------ generate ------------------------------ */

export async function generateApp(
  prompt: string,
  envHints: string[],
  projectName?: string,
  model?: string | null,
): Promise<{ doc: AppDoc; usage: Usage }> {
  if (mock()) {
    await new Promise((r) => setTimeout(r, 600));
    return { doc: cafeTemplate(projectName), usage: emptyUsage("mock", true) };
  }
  const example = JSON.stringify(cafeTemplate());
  const r = await callTool<AppDoc>({
    model: pickModel(model),
    system: GENERATE_SYSTEM,
    // thinking shares this budget with the app JSON
    maxTokens: 64000,
    tool: {
      name: "write_app",
      description: "Write the complete app document.",
      input_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          theme: { type: "object" },
          state: { type: "object" },
          collections: { type: "array", items: { type: "object" } },
          screens: { type: "array", items: { type: "object" } },
          bot: { type: "object" },
        },
        required: ["name", "theme", "state", "collections", "screens", "bot"],
      },
    },
    messages: [
      {
        role: "user",
        content: `Example of a good, complete app (a cafe) for reference of the format and quality:\n${example}\n\n` +
          `Configured integrations for this project: ${envHints.length ? envHints.join(", ") : "none (bot token may be added later)"}.\n` +
          `Use "pay" actions only if CLICK or PAYME is configured; otherwise save orders with dbInsert + notifyOwner.\n\n` +
          `App name: ${projectName || "(choose one)"}\nNow build this app:\n${prompt}`,
      },
    ],
    parse: (input) => {
      const r = AppDocSchema.safeParse(input);
      if (!r.success) return { ok: false, error: zodErr(r.error) };
      const doc = { ...r.data, screens: ensureIds(r.data.screens) };
      const errs = lint(doc);
      return errs.length ? { ok: false, error: errs.join("\n") } : { ok: true, value: doc };
    },
  });
  return { doc: r.value, usage: r.usage };
}

/* ------------------------------ edit ------------------------------ */

export interface EditResult {
  ops: Op[];
  message: string;
  doc: AppDoc;
}

function mockEdit(doc: AppDoc, comment: string, nodeId?: string | null): EditResult {
  // Deterministic tiny editor so the studio can be tried without an API key.
  const ops: Op[] = [];
  const c = comment.toLowerCase();
  const target = nodeId ? findNode(doc, nodeId) : null;
  const color = c.match(/#[0-9a-f]{3,6}/)?.[0] ||
    (c.includes("qizil") || c.includes("red") ? "#e03131" : c.includes("yashil") || c.includes("green") ? "#2f9e44" : c.includes("ko'k") || c.includes("blue") ? "#1971c2" : c.includes("qora") || c.includes("black") ? "#111111" : null);
  if (target) {
    if (c.includes("o'chir") || c.includes("delete") || c.includes("remove")) ops.push({ op: "delete", id: target.id });
    else {
      const style: Record<string, string | number | null> = {};
      if (color) style[target.type === "Text" ? "color" : "background"] = color;
      if (c.includes("katta") || c.includes("bigger")) style.fontSize = (Number(target.style?.fontSize) || 18) + 6;
      if (c.includes("kichik") || c.includes("smaller")) style.fontSize = Math.max(10, (Number(target.style?.fontSize) || 15) - 3);
      if (c.includes("yumaloq") || c.includes("round")) style.borderRadius = 999;
      const quoted = comment.match(/["“'«](.+?)["”'»]/)?.[1];
      ops.push({ op: "update", id: target.id, style, ...(quoted ? { props: { text: quoted } } : {}) });
    }
  } else if (color) {
    ops.push({ op: "setTheme", theme: { primary: color } });
  }
  const next = applyOps(doc, ops);
  return { ops, doc: next, message: ops.length ? "Demo rejim: o'zgartirildi (haqiqiy AI uchun ANTHROPIC_API_KEY qo'shing)" : "Demo rejimda bu buyruq tushunilmadi. ANTHROPIC_API_KEY qo'shing." };
}

export async function editApp(
  doc: AppDoc,
  comment: string,
  nodeId?: string | null,
  model?: string | null,
): Promise<EditResult & { usage: Usage }> {
  if (mock()) return { ...mockEdit(doc, comment, nodeId), usage: emptyUsage("mock", true) };
  const target = nodeId ? findNode(doc, nodeId) : null;
  const path = nodeId ? nodePath(doc, nodeId) : [];
  const parentCtx = path.length > 1 ? path[path.length - 2] : null;
  const insideList = path.find((n) => n.type === "List");

  const brief = (n: UINode) => `${n.type}#${n.id}`;
  const selection = target
    ? `Selected element: ${brief(target)} on screen ${path[0] ? brief(path[0]) : "?"}\n` +
      `Ancestors: ${path.slice(0, -1).map(brief).join(" > ")}\n` +
      (insideList ? `It is inside List#${insideList.id} (source: ${insideList.props?.source}); "item" and "index" are available.\n` : "") +
      `Selected node JSON:\n${JSON.stringify(target)}\n` +
      (parentCtx ? `Parent id: ${parentCtx.id}\n` : "")
    : "Nothing selected — the comment is about the whole app.\n";

  let resultDoc = doc;
  const res = await callTool<{ ops: Op[]; message: string }>({
    model: pickModel(model),
    system: EDIT_SYSTEM,
    maxTokens: 32000,
    tool: {
      name: "apply_ops",
      description: "Apply edit operations to the app document.",
      input_schema: {
        type: "object",
        properties: {
          ops: { type: "array", items: { type: "object" } },
          message: { type: "string" },
        },
        required: ["ops", "message"],
      },
    },
    messages: [
      {
        role: "user",
        content: `Current app document:\n${JSON.stringify(doc)}\n\n${selection}\nComment: ${comment}`,
      },
    ],
    parse: (input) => {
      const r = z.object({ ops: z.array(OpSchema), message: z.string() }).safeParse(input);
      if (!r.success) return { ok: false, error: zodErr(r.error) };
      try {
        const next = applyOps(doc, r.data.ops);
        const before = new Set(lint(doc));
        const errs = lint(next).filter((e) => !before.has(e));
        if (errs.length) return { ok: false, error: errs.join("\n") };
        resultDoc = next;
        return { ok: true, value: r.data };
      } catch (e) {
        if (e instanceof OpError) return { ok: false, error: e.message };
        throw e;
      }
    },
  });
  return { ...res.value, doc: resultDoc, usage: res.usage };
}
