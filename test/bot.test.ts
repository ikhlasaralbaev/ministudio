import { describe, expect, it } from "vitest";
import { BotSchema } from "@/lib/types";
import { commandList, handleUpdate, lintBot, parseAnswer, type FlowState } from "@/lib/bot";

const bot = BotSchema.parse({
  messages: [
    { id: "menu", text: "Menyu", buttons: [[{ text: "Ilova", app: true }, { text: "Sayt", url: "https://x.uz" }], [{ text: "Yozilish", to: "book" }, { text: "Narx", to: "price" }]] },
    { id: "price", text: "Narxlar: 10 000", keyboard: [["Menyu"]] },
  ],
  commands: [{ command: "menu", description: "Menyu", to: "menu" }, { command: "book", description: "Yozilish", to: "book" }],
  keywords: [{ match: "narx", to: "price" }],
  flows: [
    {
      id: "book",
      intro: "Boshladik",
      saveTo: "bookings",
      done: "Rahmat!",
      steps: [
        { key: "name", ask: "Ismingiz?" },
        { key: "phone", ask: "Telefon?", kind: "phone" },
        { key: "people", ask: "Necha kishi?", kind: "number" },
        { key: "time", ask: "Vaqt?", kind: "choice", options: ["10:00", "12:00"] },
      ],
    },
  ],
});
const A = "https://app.test/app/x";
const msg = (text: string, extra = {}) => ({ message: { chat: { id: 7 }, from: { id: 7 }, text, ...extra } });
const sent = (r: { calls: { method: string; body: Record<string, unknown> }[] }) => r.calls.filter((c) => c.method === "sendMessage").map((c) => c.body);

describe("commands, keywords, buttons", () => {
  it("a command sends its message with inline buttons (url, web_app, callbacks)", () => {
    const [b] = sent(handleUpdate(bot, null, msg("/menu"), A));
    expect(b.text).toBe("Menyu");
    expect((b.reply_markup as any).inline_keyboard).toEqual([
      [{ text: "Ilova", web_app: { url: A } }, { text: "Sayt", url: "https://x.uz" }],
      [{ text: "Yozilish", callback_data: "f:book" }, { text: "Narx", callback_data: "m:price" }],
    ]);
  });
  it("accepts /cmd@botname and ignores unknown commands", () => {
    expect(sent(handleUpdate(bot, null, msg("/menu@my_bot"), A))).toHaveLength(1);
    expect(handleUpdate(bot, null, msg("/nope"), A).calls).toEqual([]);
  });
  it("keyword match is a case-insensitive contains", () => {
    const [b] = sent(handleUpdate(bot, null, msg("Narxi qancha?"), A));
    expect(b.text).toContain("Narxlar");
    expect((b.reply_markup as any).keyboard).toEqual([[{ text: "Menyu" }]]);
  });
  it("a callback answers the query and opens its target", () => {
    const r = handleUpdate(bot, null, { callback_query: { id: "q1", data: "m:price", from: { id: 7 }, message: { chat: { id: 7 } } } }, A);
    expect(r.calls[0]).toEqual({ method: "answerCallbackQuery", body: { callback_query_id: "q1" } });
    expect(sent(r)[0].text).toContain("Narxlar");
  });
  it("garbage callback data only answers the query", () => {
    const r = handleUpdate(bot, null, { callback_query: { id: "q", data: "o:evil", from: { id: 1 } } }, A);
    expect(r.calls).toEqual([{ method: "answerCallbackQuery", body: { callback_query_id: "q" } }]);
  });
  it("fallback, when set, answers unmatched text", () => {
    const b2 = { ...bot, fallback: "menu" };
    expect(sent(handleUpdate(b2, null, msg("salom"), A))[0].text).toBe("Menyu");
    expect(handleUpdate(bot, null, msg("salom"), A).calls).toEqual([]);
  });
});

describe("flows", () => {
  it("a command starts the flow: intro + first question, state at step 0", () => {
    const r = handleUpdate(bot, null, msg("/book"), A);
    expect(sent(r)[0].text).toBe("Boshladik\n\nIsmingiz?");
    expect(r.state).toEqual({ flowId: "book", step: 0, answers: {} });
  });
  it("walks all steps, validates answers and saves", () => {
    let st: FlowState | null = handleUpdate(bot, null, msg("/book"), A).state as FlowState;
    let r = handleUpdate(bot, st, msg("Ali"), A);
    st = r.state as FlowState;
    expect(sent(r)[0].reply_markup).toMatchObject({ keyboard: [[{ request_contact: true }]] });
    r = handleUpdate(bot, st, msg("abc"), A); // bad phone: same question again
    expect(r.state).toBeUndefined();
    expect(String(sent(r)[0].text)).toContain("Telefon raqamini to'g'ri");
    r = handleUpdate(bot, st, msg("", { contact: { phone_number: "998901234567" } }), A);
    st = r.state as FlowState;
    r = handleUpdate(bot, st, msg("2,5"), A);
    st = r.state as FlowState;
    expect(sent(r)[0].reply_markup).toMatchObject({ keyboard: [[{ text: "10:00" }, { text: "12:00" }]] });
    r = handleUpdate(bot, st, msg("15:00"), A); // not an option
    expect(r.state).toBeUndefined();
    r = handleUpdate(bot, st, msg("12:00"), A);
    expect(r.state).toBeNull();
    expect(sent(r)[0].text).toBe("Rahmat!");
    expect(r.save).toEqual({ flowId: "book", collection: "bookings", notifyOwner: true, data: { name: "Ali", phone: "+998901234567", people: 2.5, time: "12:00" } });
  });
  it("/cancel clears the state", () => {
    const st: FlowState = { flowId: "book", step: 1, answers: { name: "Ali" } };
    expect(handleUpdate(bot, st, msg("/cancel"), A).state).toBeNull();
  });
  it("a state pointing at a deleted flow falls through to normal handling", () => {
    const st: FlowState = { flowId: "gone", step: 0, answers: {} };
    expect(sent(handleUpdate(bot, st, msg("narx"), A))[0].text).toContain("Narxlar");
  });
});

describe("parseAnswer", () => {
  it("number", () => {
    expect(parseAnswer("number", undefined, "1 200")).toBe(1200);
    expect(parseAnswer("number", undefined, "x")).toBeNull();
    expect(parseAnswer("number", undefined, "")).toBeNull();
  });
  it("text is trimmed and capped", () => {
    expect(parseAnswer("text", undefined, "  hi ")).toBe("hi");
    expect(String(parseAnswer(undefined, undefined, "a".repeat(900))).length).toBe(500);
  });
});

describe("config", () => {
  it("rejects ids that do not fit callback_data and bad commands", () => {
    expect(BotSchema.safeParse({ messages: [{ id: "Has Space", text: "x" }] }).success).toBe(false);
    expect(BotSchema.safeParse({ commands: [{ command: "Menu", description: "x", to: "a" }] }).success).toBe(false);
  });
  it("old docs (only welcome + button) still parse, and nulls are tolerated", () => {
    expect(BotSchema.safeParse({ welcomeText: "a", buttonText: "b" }).success).toBe(true);
    expect(BotSchema.safeParse({ welcomeText: "a", buttonText: "b", flows: null, messages: null }).success).toBe(true);
  });
  it("commandList always leads with /start and skips reserved names", () => {
    const l = commandList({ ...bot, commands: [...bot.commands!, { command: "id", description: "x", to: "menu" }] });
    expect(l.map((c) => c.command)).toEqual(["start", "menu", "book"]);
  });
  it("lintBot finds dangling ids and missing collections", () => {
    expect(lintBot(bot, ["bookings"])).toEqual([]);
    const bad = BotSchema.parse({ commands: [{ command: "x", description: "d", to: "nope" }], flows: [{ id: "f", saveTo: "ghost", done: "ok", steps: [{ key: "a", ask: "?", kind: "choice" }] }] });
    expect(lintBot(bad, []).join("|")).toMatch(/nope[\s\S]*ghost[\s\S]*options/);
  });
});

import { formatButtons, formatSteps, parseButtons, parseKeyboard, parseSteps } from "@/lib/botText";

describe("botText", () => {
  it("buttons round-trip through the text syntax", () => {
    const rows = [[{ text: "Ilova", app: true }, { text: "Sayt", url: "https://x.uz" }], [{ text: "Narx", to: "price" }]];
    expect(parseButtons(formatButtons(rows as never))).toEqual(rows);
  });
  it("drops buttons without a valid target", () => {
    expect(parseButtons("A -> \nB -> Bad Id\nC -> ok")).toEqual([[{ text: "C", to: "ok" }]]);
  });
  it("keyboard rows", () => expect(parseKeyboard("A | B\n\nC")).toEqual([["A", "B"], ["C"]]));
  it("steps round-trip and sanitize", () => {
    const steps = parseSteps("name | Ismingiz?\nt | Vaqt? | choice | 10:00, 12:00\n1bad | x\nph | Tel | phone");
    expect(steps).toEqual([
      { key: "name", ask: "Ismingiz?", kind: "text" },
      { key: "t", ask: "Vaqt?", kind: "choice", options: ["10:00", "12:00"] },
      { key: "ph", ask: "Tel", kind: "phone" },
    ]);
    expect(parseSteps(formatSteps(steps))).toEqual(steps);
  });
});
