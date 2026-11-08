import { z } from "zod";

/* ---------- Components ---------- */

export const NODE_TYPES = [
  "Screen",
  "Box",
  "Row",
  "Text",
  "Image",
  "Icon",
  "Button",
  "Input",
  "List",
  "Badge",
  "Divider",
  "Spacer",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

/* ---------- Actions (logic DSL) ---------- */
// Fields named value / amount / cond / index / id are EXPRESSIONS (e.g. "state.count + 1", "'text'").
// Fields named text / url / description are TEMPLATES (e.g. "Jami: {{ fmt(total) }} so'm").

export type Action =
  | { type: "setState"; key: string; value: string }
  | { type: "append"; key: string; value: string }
  | { type: "removeAt"; key: string; index: string }
  | { type: "navigate"; screen: string }
  | { type: "back" }
  | { type: "alert"; text: string }
  | { type: "haptic"; style?: "light" | "medium" | "heavy" | "success" | "error" }
  | { type: "dbInsert"; collection: string; value: string; saveIdTo?: string }
  | { type: "dbUpdate"; collection: string; id: string; value: string }
  | { type: "dbDelete"; collection: string; id: string }
  | { type: "notifyOwner"; text: string }
  | { type: "pay"; provider: "click" | "payme"; amount: string; description?: string }
  | { type: "openLink"; url: string }
  | { type: "closeApp" }
  | { type: "if"; cond: string; then: Action[]; else?: Action[] };

export const ActionSchema: z.ZodType<Action> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("setState"), key: z.string(), value: z.string() }),
    z.object({ type: z.literal("append"), key: z.string(), value: z.string() }),
    z.object({ type: z.literal("removeAt"), key: z.string(), index: z.string() }),
    z.object({ type: z.literal("navigate"), screen: z.string() }),
    z.object({ type: z.literal("back") }),
    z.object({ type: z.literal("alert"), text: z.string() }),
    z.object({
      type: z.literal("haptic"),
      style: z.enum(["light", "medium", "heavy", "success", "error"]).optional(),
    }),
    z.object({
      type: z.literal("dbInsert"),
      collection: z.string(),
      value: z.string(),
      saveIdTo: z.string().optional(),
    }),
    z.object({ type: z.literal("dbUpdate"), collection: z.string(), id: z.string(), value: z.string() }),
    z.object({ type: z.literal("dbDelete"), collection: z.string(), id: z.string() }),
    z.object({ type: z.literal("notifyOwner"), text: z.string() }),
    z.object({
      type: z.literal("pay"),
      provider: z.enum(["click", "payme"]),
      amount: z.string(),
      description: z.string().optional(),
    }),
    z.object({ type: z.literal("openLink"), url: z.string() }),
    z.object({ type: z.literal("closeApp") }),
    z.object({
      type: z.literal("if"),
      cond: z.string(),
      then: z.array(ActionSchema),
      else: z.array(ActionSchema).optional(),
    }),
  ]),
);

/* ---------- Nodes ---------- */

export type Style = Record<string, string | number>;

export interface UINode {
  id: string;
  type: NodeType;
  name?: string;
  props?: Record<string, unknown>;
  style?: Style;
  visibleIf?: string;
  events?: { onClick?: Action[] };
  children?: UINode[];
}

/**
 * Optional field that also accepts null and turns it into "absent".
 * MongoDB stores `undefined` as null, so documents read back from the database carry nulls on optional fields.
 */
const opt = <T extends z.ZodType>(s: T) => s.nullish().transform((v) => v ?? undefined);
/** Like opt(), but the key itself may be missing in the type. */
const optk = <T extends z.ZodType>(s: T) => opt(s).optional();

export const NodeSchema: z.ZodType<UINode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    type: z.enum(NODE_TYPES),
    name: opt(z.string()),
    props: opt(z.record(z.string(), z.unknown())),
    style: opt(z.record(z.string(), z.union([z.string(), z.number()]))),
    visibleIf: opt(z.string()),
    events: opt(z.object({ onClick: opt(z.array(ActionSchema)) })),
    children: opt(z.array(NodeSchema)),
  }),
);

/* ---------- App document ---------- */

/**
 * A field of a collection. `type` is free text from the AI (string, number, array...) or one of the panel's types:
 * text, number, money, boolean, date, phone, url, image, select, relation, list, object.
 */
export const CollectionFieldSchema = z.object({
  name: z.string(),
  type: z.string(),
  label: optk(z.string()),
  /** type "relation": the collection (static or records) this field points at (by its id / number). */
  ref: optk(z.string()),
  /** type "select": allowed values (shown as badges, filterable). */
  options: optk(z.array(z.string())),
});
export type CollectionField = z.infer<typeof CollectionFieldSchema>;

export const CollectionSchema = z.object({
  name: z.string(),
  // static: data lives in the doc (menu, products). records: written at runtime (orders) and stored in DB.
  mode: z.enum(["static", "records"]),
  fields: z.array(CollectionFieldSchema).default([]),
  /** Human title shown in the owner's panel (defaults to the name). */
  label: optk(z.string()),
  description: optk(z.string()),
  data: z.array(z.record(z.string(), z.unknown())).optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const ThemeSchema = z.object({
  primary: z.string().default("#2481cc"),
  background: z.string().default("#ffffff"),
  text: z.string().default("#111111"),
  radius: z.number().default(12),
  font: z.string().default("Inter, system-ui, sans-serif"),
});

/* ---------- Telegram bot (chat features besides the mini app) ---------- */
// ids are short slugs so they fit Telegram's 64-byte callback_data ("m:<id>", "f:<id>").
const botId = z.string().regex(/^[a-z0-9_-]{1,24}$/, "id: a-z, 0-9, _ yoki -");

export const BotButtonSchema = z.object({
  text: z.string().max(64),
  /** Opens a link. */
  url: optk(z.string()),
  /** true = opens the mini app. */
  app: optk(z.boolean()),
  /** id of a message (sends it) or a flow (starts it). */
  to: optk(botId),
});
export type BotButton = z.infer<typeof BotButtonSchema>;

export const BotMessageSchema = z.object({
  id: botId,
  text: z.string().max(3500),
  /** Inline buttons under the message: rows of buttons. */
  buttons: optk(z.array(z.array(BotButtonSchema).max(4)).max(8)),
  /** Reply keyboard shown under the input field: rows of button labels (a label equal to a keyword triggers it). */
  keyboard: optk(z.array(z.array(z.string().max(64)).max(4)).max(8)),
});
export type BotMessage = z.infer<typeof BotMessageSchema>;

export const BotCommandSchema = z.object({
  command: z.string().regex(/^[a-z][a-z0-9_]{0,31}$/, "buyruq: a-z, 0-9, _"),
  description: z.string().max(256),
  /** id of a message or flow. */
  to: botId,
});

export const BotKeywordSchema = z.object({
  /** Case-insensitive; the user's text must contain it. */
  match: z.string().max(64),
  to: botId,
});

export const BotFlowStepSchema = z.object({
  key: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,31}$/, "kalit: harf va raqam"),
  ask: z.string().max(500),
  kind: optk(z.enum(["text", "phone", "number", "choice"])),
  options: optk(z.array(z.string().max(64)).max(12)),
});

/** The bot asks questions one by one, saves the answers as a record and thanks the user. */
export const BotFlowSchema = z.object({
  id: botId,
  intro: optk(z.string().max(1000)),
  steps: z.array(BotFlowStepSchema).max(10),
  /** Records collection that receives the answers (shows up in the Data panel). */
  saveTo: optk(z.string()),
  done: z.string().max(1000),
  /** Send the answers to the owner (default true). */
  notifyOwner: optk(z.boolean()),
});
export type BotFlow = z.infer<typeof BotFlowSchema>;

/** New records in `collection` reach the owner with Accept / Reject buttons; the customer is told the outcome. */
export const BotOwnerAlertSchema = z.object({
  collection: z.string(),
  acceptText: optk(z.string().max(500)),
  rejectText: optk(z.string().max(500)),
});

export const BotSchema = z.object({
  welcomeText: z.string().default("Xush kelibsiz! Ilovani ochish uchun pastdagi tugmani bosing."),
  buttonText: z.string().default("Ochish"),
  messages: optk(z.array(BotMessageSchema).max(40)),
  commands: optk(z.array(BotCommandSchema).max(20)),
  keywords: optk(z.array(BotKeywordSchema).max(40)),
  flows: optk(z.array(BotFlowSchema).max(10)),
  ownerAlerts: optk(z.array(BotOwnerAlertSchema).max(10)),
  /** id of a message sent when nothing else matches. */
  fallback: optk(botId),
});
export type BotConfig = z.infer<typeof BotSchema>;

export const AppDocSchema = z.object({
  name: z.string(),
  theme: ThemeSchema,
  state: z.record(z.string(), z.unknown()).default({}),
  collections: z.array(CollectionSchema).default([]),
  screens: z.array(NodeSchema).min(1),
  bot: BotSchema.default({
    welcomeText: "Xush kelibsiz! Ilovani ochish uchun pastdagi tugmani bosing.",
    buttonText: "Ochish",
  }),
});
export type AppDoc = z.infer<typeof AppDocSchema>;

/* ---------- Edit operations (what AI returns) ---------- */

export const OpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("update"),
    id: z.string(),
    name: z.string().optional(),
    props: z.record(z.string(), z.unknown()).optional(),
    style: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
    events: z.object({ onClick: z.array(ActionSchema).optional() }).nullable().optional(),
    visibleIf: z.string().nullable().optional(),
  }),
  z.object({ op: z.literal("replace"), id: z.string(), node: NodeSchema }),
  z.object({
    op: z.literal("insert"),
    parentId: z.string(),
    index: z.number().optional(),
    node: NodeSchema,
  }),
  z.object({ op: z.literal("delete"), id: z.string() }),
  z.object({ op: z.literal("move"), id: z.string(), parentId: z.string(), index: z.number() }),
  z.object({ op: z.literal("setState"), key: z.string(), value: z.unknown() }),
  z.object({ op: z.literal("setCollection"), collection: CollectionSchema }),
  z.object({ op: z.literal("deleteCollection"), name: z.string() }),
  z.object({ op: z.literal("addScreen"), screen: NodeSchema }),
  z.object({ op: z.literal("setTheme"), theme: ThemeSchema.partial() }),
  z.object({ op: z.literal("setBot"), bot: BotSchema.partial() }),
  z.object({ op: z.literal("rename"), name: z.string() }),
]);
export type Op = z.infer<typeof OpSchema>;

/* ---------- Project (DB) ---------- */

import type { Perms } from "./permissions";

export interface ProjectEnv {
  BOT_TOKEN?: string;
  OWNER_CHAT_ID?: string;
  CLICK_SERVICE_ID?: string;
  CLICK_MERCHANT_ID?: string;
  CLICK_SECRET_KEY?: string;
  PAYME_MERCHANT_ID?: string;
  [k: string]: string | undefined;
}

export interface ProjectDTO {
  _id: string;
  name: string;
  slug: string;
  doc: AppDoc | null;
  publishedVersion: number;
  publishedAt?: string;
  updatedAt: string;
  botUsername?: string;
  ownerId: string | null;
  permissions: Perms;
  suspended: boolean;
  ownerEmail?: string | null;
  /** Claude model chosen for this project's AI (null = server default). */
  aiModel: string | null;
  /** Idea typed when the project was created; Studio starts generating from it. */
  pendingIdea?: string;
}
