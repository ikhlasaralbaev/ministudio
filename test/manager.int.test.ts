// Integration test against a real MongoDB (runs only when MONGODB_TEST_URI is set). Telegram calls are mocked.
import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const uri = process.env.MONGODB_TEST_URI;
const calls: { method: string; body: unknown }[] = [];
vi.mock("@/lib/server/telegram", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/telegram")>()),
  tgApi: async (_t: string, method: string, body?: unknown) => {
    calls.push({ method, body });
    if (method === "getManagedBotToken") return "777:CHILD-TOKEN";
    if (method === "getMe") return { username: "mock_bot" };
    if (method === "getFile") return { file_path: "photos/a.png", file_size: (body as { file_id: string }).file_id === "big" ? 9_000_000 : 1000 };
    return {};
  },
}));

vi.mock("@/lib/server/ai", async (orig) => {
  const real = await orig<typeof import("@/lib/server/ai")>();
  const { emptyUsage } = await import("@/lib/server/usage");
  const usage = () => emptyUsage("test", true);
  const doc = { name: "Kafe", theme: { primary: "#e8590c", background: "#fff", text: "#111", radius: 12, font: "x" }, state: {}, collections: [], screens: [{ id: "s1", type: "Screen", name: "Bosh", children: [] }], bot: { welcomeText: "a", buttonText: "b" } };
  return {
    ...real,
    generateApp: async (_p: string, _h: string[], name?: string, _m?: unknown, extras?: unknown) => {
      (globalThis as { __ai?: unknown[] }).__ai = [...((globalThis as { __ai?: unknown[] }).__ai || []), { kind: "generate", extras }];
      return { doc: { ...doc, name: name || "Gul Bazar" }, usage: usage() };
    },
    editApp: async (d: unknown, _c?: string, _n?: unknown, _m?: unknown, extras?: unknown) => {
      (globalThis as { __ai?: unknown[] }).__ai = [...((globalThis as { __ai?: unknown[] }).__ai || []), { kind: "edit", extras }];
      return { doc: d, message: "Narxlar qalinlashtirildi", ops: [{ op: "rename", name: "x" }], usage: usage() };
    },
  };
});

describe.skipIf(!uri)("manager bot and telegram link (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_manager_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
    process.env.TELEGRAM_MANAGER_BOT_TOKEN = "1:MANAGER";
    process.env.TELEGRAM_MANAGER_BOT_USERNAME = "@ms_manager_bot";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  async function project(slug: string) {
    const { projects } = await import("@/lib/server/projects");
    const r = await (await projects()).insertOne({ name: "Kafe", slug, doc: null, publishedVersion: 0, ownerId: "u1", createdAt: new Date(), updatedAt: new Date() } as never);
    return r.insertedId.toHexString();
  }

  it("a managed bot is matched to its creator's pending claim, token stored encrypted", async () => {
    const { createClaim, handleManagedBot, latestClaim } = await import("@/lib/server/manager");
    const { getProject, envOf } = await import("@/lib/server/projects");
    const id = await project("kafe1");
    const { suggested } = await createClaim({ projectId: id, userId: "u1", tgId: 555, slug: "kafe1", name: "Kafe" });
    expect(suggested).toMatch(/^[a-z0-9_]{5,32}$/);
    expect(suggested.endsWith("bot")).toBe(true);
    expect((await latestClaim(id))?.status).toBe("pending");

    const log = await handleManagedBot({ user: { id: 555 }, bot: { id: 9001, username: "my_kafe_bot" } });
    expect(log).toMatch(/connected bot my_kafe_bot/);
    expect(calls.find((c) => c.method === "getManagedBotToken")?.body).toEqual({ user_id: 9001 });
    const p = (await getProject(id))!;
    expect(envOf(p).BOT_TOKEN).toBe("777:CHILD-TOKEN");
    expect(p.envEnc).not.toContain("CHILD-TOKEN"); // encrypted at rest
    expect(p).toMatchObject({ botUsername: "my_kafe_bot", managedBotId: 9001 });
    expect((await latestClaim(id))?.status).toBe("done");
    // the creator is the owner right away (private chat id == Telegram user id), confirmed on their first Start
    expect(envOf(p).OWNER_CHAT_ID).toBe("555");
    expect(envOf(p).OWNER_CONFIRMED).toBeUndefined();

    // the creator is told in the chat; the project is not published yet, so the button offers Publish
    const dm = calls.filter((c) => c.method === "sendMessage" && (c.body as { chat_id: number }).chat_id === 555).at(-1)!.body as { text: string; reply_markup: { inline_keyboard: { text: string; callback_data?: string }[][] } };
    expect(dm.text).toContain("@my_kafe_bot");
    expect(dm.text).toContain("Осталось опубликовать");
    const { ownerCode } = await import("@/lib/server/runtime");
    expect(dm.reply_markup.inline_keyboard[0][0]).toMatchObject({ url: `https://t.me/my_kafe_bot?start=owner_${ownerCode(id)}` }); // one tap: Start with the owner code
    expect(dm.text).toContain("Start");
    expect(dm.reply_markup.inline_keyboard[1][0].callback_data).toBe(`u:${id}`);
  });

  it("a bot from someone without a pending claim is ignored (no token is fetched)", async () => {
    const { handleManagedBot } = await import("@/lib/server/manager");
    const before = calls.length;
    expect(await handleManagedBot({ user: { id: 999999 }, bot: { id: 1, username: "x_bot" } })).toMatch(/ignored/);
    expect(calls.length).toBe(before);
  });

  it("with two pending claims the exact suggested username wins", async () => {
    const { createClaim, handleManagedBot } = await import("@/lib/server/manager");
    const { getProject } = await import("@/lib/server/projects");
    const a = await project("a1");
    const b = await project("b1");
    const first = await createClaim({ projectId: a, userId: "u1", tgId: 600, slug: "a1", name: "A" });
    await createClaim({ projectId: b, userId: "u1", tgId: 600, slug: "b1", name: "B" });
    await handleManagedBot({ user: { id: 600 }, bot: { id: 9100, username: first.suggested } });
    expect((await getProject(a))?.managedBotId).toBe(9100);
    expect((await getProject(b))?.managedBotId).toBeUndefined();
  });

  it("an existing managed bot's token update refreshes the stored token", async () => {
    const { handleManagedBot } = await import("@/lib/server/manager");
    expect(await handleManagedBot({ user: { id: 555 }, bot: { id: 9001, username: "my_kafe_bot" } })).toMatch(/connected/);
  });

  it("one Telegram account links to one platform account only", async () => {
    const { usersCol } = await import("@/lib/server/users");
    const { linkTelegram, getTelegramLink, unlinkTelegram, userByTelegramId } = await import("@/lib/server/tglink");
    const col = usersCol();
    const u1 = (await col.insertOne({ email: "a@x.uz", name: "A" } as never)).insertedId.toHexString();
    const u2 = (await col.insertOne({ email: "b@x.uz", name: "B" } as never)).insertedId.toHexString();
    await linkTelegram(u1, { id: 42, firstName: "A", username: "a" });
    expect(await getTelegramLink(u1)).toEqual({ id: 42, username: "a", name: "A" });
    expect((await userByTelegramId(42))?.id).toBe(u1);
    await expect(linkTelegram(u2, { id: 42, firstName: "B", username: "b" })).rejects.toThrow(/boshqa akkauntga/);
    await linkTelegram(u1, { id: 42, firstName: "A2", username: "a" }); // relinking yourself is fine
    await unlinkTelegram(u1);
    expect(await getTelegramLink(u1)).toBeNull();
    await linkTelegram(u2, { id: 42, firstName: "B", username: "b" }); // free again
  });

  it("linking through the bot: Start asks for confirmation (account shown masked), the button links once", async () => {
    const { usersCol } = await import("@/lib/server/users");
    const { createLinkCode, getTelegramLink } = await import("@/lib/server/tglink");
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    const uid = (await usersCol().insertOne({ email: "ali.valiyev@gmail.com", name: "Ali" } as never)).insertedId.toHexString();
    const code = await createLinkCode(uid);
    const sent = () => calls.filter((c) => c.method === "sendMessage").at(-1)!.body as { text: string; reply_markup?: { inline_keyboard: { callback_data: string }[][] } };

    expect(await handleManagerUpdate({ message: { chat: { id: 7 }, from: { id: 7001 }, text: `/start link_${code}` } })).toMatch(/asked to confirm/);
    expect(sent().text).toContain("a***@gmail.com"); // the account is visible, but not in full
    expect(sent().text).not.toContain("ali.valiyev");
    expect(sent().reply_markup?.inline_keyboard[0][0].callback_data).toBe(`lk:${code}`);
    expect(await getTelegramLink(uid)).toBeNull(); // nothing linked before the user confirms

    const press = (data: string) => handleManagerUpdate({ callback_query: { id: "q", data, from: { id: 7001, first_name: "Ali", username: "ali" }, message: { chat: { id: 7 }, message_id: 5 } } });
    expect(await press(`lk:${code}`)).toMatch(/linked/);
    expect(await getTelegramLink(uid)).toMatchObject({ id: 7001, username: "ali" });
    expect(await press(`lk:${code}`)).toMatch(/expired/); // a code works once
  });

  it("linking: declining, a bad code, and a Telegram already linked elsewhere", async () => {
    const { usersCol } = await import("@/lib/server/users");
    const { createLinkCode, getTelegramLink } = await import("@/lib/server/tglink");
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    const uid = (await usersCol().insertOne({ email: "x@x.uz", name: "X" } as never)).insertedId.toHexString();
    const code = await createLinkCode(uid);
    const press = (data: string, from = 8001) => handleManagerUpdate({ callback_query: { id: "q", data, from: { id: from }, message: { chat: { id: 1 }, message_id: 1 } } });
    expect(await press("lk:no")).toMatch(/declined/);
    expect(await getTelegramLink(uid)).toBeNull();
    // a malformed link is not a link request: it is just a /start in the chat console (menu)
    expect(await handleManagerUpdate({ message: { chat: { id: 1 }, from: { id: 1 }, text: "/start link_deadbeef" } })).toBe("menu");
    expect(await press(`lk:${"0".repeat(36)}`)).toMatch(/expired/);
    expect(await press("lk:" + code, 42)).toMatch(/failed/); // 42 is already linked to another account (earlier test)
    expect(await getTelegramLink(uid)).toBeNull();
  });

  it("ensureTelegramUser: one account per Telegram id, even when first messages race", async () => {
    const { ensureTelegramUser } = await import("@/lib/server/tglink");
    const { usersCol } = await import("@/lib/server/users");
    const results = await Promise.all(Array.from({ length: 6 }, () => ensureTelegramUser({ id: 310310, first_name: "Vali", username: "vali" })));
    expect(new Set(results.map((r) => r.id)).size).toBe(1);
    expect(await usersCol().countDocuments({ telegramId: 310310 } as never)).toBe(1);
  });

  it("a Telegram-only account is merged into the Google account that proves the same Telegram; a real account is never taken over", async () => {
    const { ensureTelegramUser, linkTelegram, getTelegramLink } = await import("@/lib/server/tglink");
    const { usersCol } = await import("@/lib/server/users");
    const { createProject, getProject, projects } = await import("@/lib/server/projects");
    const { rawDb } = await import("@/lib/server/db");
    const tgOnly = (await ensureTelegramUser({ id: 320320, first_name: "Sher", username: "sher" })).id;
    const pid = await createProject(tgOnly, "Sherning kafesi");
    await (await projects()).insertOne({ name: "Hamkor", slug: "hk1", doc: null, publishedVersion: 0, ownerId: "someone", members: [{ userId: tgOnly, email: "", access: "update" }], createdAt: new Date(), updatedAt: new Date() } as never);
    await rawDb().collection("usage").insertOne({ userId: tgOnly, at: new Date(), mock: false });
    await rawDb().collection("session").insertOne({ userId: tgOnly, token: "t" });

    const google = (await usersCol().insertOne({ email: "sher@gmail.com", name: "Sher" } as never)).insertedId.toHexString();
    // both accounts are members of one project, and the Google one is the owner of another one the Telegram one joined
    await (await projects()).insertOne({ name: "Ikkalasi", slug: "hk2", doc: null, publishedVersion: 0, ownerId: "someone", members: [{ userId: tgOnly, email: "", access: "view" }, { userId: google, email: "sher@gmail.com", access: "update" }], createdAt: new Date(), updatedAt: new Date() } as never);
    await (await projects()).insertOne({ name: "Egasi", slug: "hk3", doc: null, publishedVersion: 0, ownerId: google, members: [{ userId: tgOnly, email: "", access: "view" }], createdAt: new Date(), updatedAt: new Date() } as never);
    await linkTelegram(google, { id: 320320, firstName: "Sher", username: "sher" }); // proved from Telegram itself

    expect((await getProject(pid))?.ownerId).toBe(google); // projects moved
    expect((await (await projects()).findOne({ slug: "hk1" }))?.members?.[0].userId).toBe(google); // memberships too
    expect((await (await projects()).findOne({ slug: "hk2" }))?.members).toHaveLength(1); // no duplicate member
    expect((await (await projects()).findOne({ slug: "hk3" }))?.members).toHaveLength(0); // the owner is never also a member
    expect(await rawDb().collection("usage").countDocuments({ userId: google })).toBe(1); // usage history
    expect(await rawDb().collection("session").countDocuments({ userId: tgOnly })).toBe(0); // old sessions gone
    expect(await usersCol().countDocuments({ email: "tg320320@telegram.invalid" })).toBe(0); // placeholder deleted
    expect(await getTelegramLink(google)).toMatchObject({ id: 320320 });

    // a real (Google) account that already owns a Telegram is not absorbed by someone else
    const other = (await usersCol().insertOne({ email: "other@gmail.com", name: "O" } as never)).insertedId.toHexString();
    await expect(linkTelegram(other, { id: 320320, firstName: "X", username: "x" })).rejects.toThrow(/boshqa akkauntga/);
  });

  it("link helpers: username and bot link are well-formed", async () => {
    const { newBotLink, suggestUsername } = await import("@/lib/server/manager");
    expect(suggestUsername("Lazzat Kafe!!")).toMatch(/^ms_lazzatkafe_[0-9a-f]{4}_bot$/);
    expect(newBotLink("ms_manager_bot", "ms_x_bot", "Gul Bazar")).toBe("https://t.me/newbot/ms_manager_bot/ms_x_bot?name=Gul%20Bazar");
  });
});

describe.skipIf(!uri)("manager bot chat console (MongoDB, Telegram and AI mocked)", () => {
  const TGA = 880001; // linked account A
  const TGB = 880002; // linked account B (a stranger to A's projects)
  const ids: Record<string, string> = {};
  const sentTo = () => calls.filter((c) => c.method === "sendMessage").map((c) => c.body as { text: string; reply_markup?: { inline_keyboard: Record<string, unknown>[][] } });
  const last = () => sentTo().at(-1)!;
  const say = async (tg: number, text: string) => {
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    return handleManagerUpdate({ message: { chat: { id: tg }, from: { id: tg }, text } });
  };
  const press = async (tg: number, data: string) => {
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    return handleManagerUpdate({ callback_query: { id: "c", data, from: { id: tg }, message: { chat: { id: tg }, message_id: 1 } } });
  };
  const waitFor = async (pred: () => boolean) => {
    for (let i = 0; i < 100 && !pred(); i++) await new Promise((r) => setTimeout(r, 20));
  };

  beforeAll(async () => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_chat_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
    process.env.TELEGRAM_MANAGER_BOT_TOKEN = "1:MANAGER";
    process.env.TELEGRAM_MANAGER_BOT_USERNAME = "ms_manager_bot";
    process.env.PUBLIC_URL = "https://panel.test";
    const { usersCol } = await import("@/lib/server/users");
    const { linkTelegram } = await import("@/lib/server/tglink");
    for (const [key, tg, email] of [["A", TGA, "a@chat.uz"], ["B", TGB, "b@chat.uz"]] as const) {
      ids[key] = (await usersCol().insertOne({ email, name: key } as never)).insertedId.toHexString();
      await linkTelegram(ids[key], { id: tg, firstName: key, username: key.toLowerCase() });
    }
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  it("a Telegram user we have never seen gets an account on the first message (no Google, nothing to link)", async () => {
    const { usersCol } = await import("@/lib/server/users");
    expect(await usersCol().countDocuments({ telegramId: 424242 } as never)).toBe(0);
    expect(await say(424242, "/start")).toBe("menu");
    expect(last().text).toContain("конструктор Telegram-приложений");
    const u = (await usersCol().findOne({ telegramId: 424242 } as never)) as unknown as { email: string; emailVerified: boolean };
    expect(u.email).toBe("tg424242@telegram.invalid");
    expect(u.emailVerified).toBe(true);
    // a Telegram-only account is pointed to the site, where "Link Telegram" merges it with a Google account
    expect(last().reply_markup!.inline_keyboard.flat().some((b) => "url" in b)).toBe(false); // not in the first menu
    await say(424242, "/projects"); // empty list: here is the hint
    expect(last().reply_markup!.inline_keyboard.flat().some((b) => (b as { url?: string }).url === "https://panel.test/dashboard")).toBe(true);
    expect(await say(424242, "/account")).toBe("account");
    await say(424242, "/start"); // again: still one account
    expect(await usersCol().countDocuments({ telegramId: 424242 } as never)).toBe(1);
  });

  it("menu opens the panel inside Telegram through /tg", async () => {
    expect(await say(TGA, "/start")).toBe("menu");
    const web = last().reply_markup!.inline_keyboard.flat().find((b) => "web_app" in b) as { web_app: { url: string } };
    expect(web.web_app.url).toBe("https://panel.test/tg?next=%2Fdashboard");
    expect(last().reply_markup!.inline_keyboard.flat().some((b) => "url" in b)).toBe(false); // linked accounts get no "link" hint
  });

  it("one message is enough: the idea creates the project (named by the AI) and generates the app", async () => {
    const { getProject, projects } = await import("@/lib/server/projects");
    await press(TGA, "p:new");
    expect(last().text).toMatch(/Напишите одним сообщением/);

    expect(await say(TGA, "gul do'koni uchun katalog va yetkazib berish")).toBe("ai generate started");
    expect(last().text).toMatch(/ИИ работает/);
    await waitFor(() => last().text.includes("Готово"));
    const row = (await (await projects()).findOne({ ownerId: ids.A, name: "Gul Bazar" }))!;
    ids.P = row._id.toHexString();
    expect(last().text).toContain("Приложение «Gul Bazar» создано: 1 экр.");
    const after = (await getProject(ids.P))!;
    expect(after.name).toBe("Gul Bazar"); // the AI's name replaced the placeholder
    expect(after.autoName).toBeUndefined();
    expect(after.doc?.screens).toHaveLength(1);
    // no bot yet: Publish comes first, creating the bot is a separate step
    expect(last().text).toContain("опубликуйте приложение");
    const kb = last().reply_markup!.inline_keyboard;
    expect(kb[0][0].callback_data).toBe(`u:${ids.P}`);
    expect(kb.flat().map((b) => b.callback_data)).toContain(`b:${ids.P}`);

    // the project now has an app: the next message is an edit
    expect(await say(TGA, "narxlarni qalinroq qil")).toBe("ai edit started");
    await waitFor(() => last().text.includes("Narxlar qalinlashtirildi"));
    expect(last().text).toContain("Narxlar qalinlashtirildi");
  });

  it("a short message ('salom') does not create a project; it explains what to write", async () => {
    const { projects } = await import("@/lib/server/projects");
    await say(TGA, "/cancel");
    const before = await (await projects()).countDocuments({ ownerId: ids.A });
    expect(await say(TGA, "salom")).toBe("short message");
    expect(last().text).toMatch(/Опишите идею подробнее/);
    expect(await (await projects()).countDocuments({ ownerId: ids.A })).toBe(before);
  });

  it("the daily AI cap applies to accounts made from Telegram alone", async () => {
    const { usersCol } = await import("@/lib/server/users");
    const { rawDb } = await import("@/lib/server/db");
    process.env.TG_AI_DAILY_LIMIT = "2";
    const TGC = 880003;
    await say(TGC, "/start"); // creates the Telegram-only account
    const uid = ((await usersCol().findOne({ telegramId: TGC } as never)) as unknown as { _id: { toHexString(): string } })._id.toHexString();
    await rawDb().collection("usage").insertMany([1, 2].map(() => ({ userId: uid, mock: false, at: new Date() })));
    await say(TGC, "kafe uchun menyu va yetkazib berish ilovasi");
    await waitFor(() => last().text.includes("лимит"));
    expect(last().text).toContain("Дневной лимит ИИ-запросов исчерпан");
    delete process.env.TG_AI_DAILY_LIMIT;
  });

  it("project card, publish, and latest records", async () => {
    await press(TGA, `p:${ids.P}`);
    expect(last().text).toMatch(/<b>Gul Bazar<\/b>[\s\S]*<b>1<\/b> экр\.[\s\S]*Публикация: <i>нет<\/i>[\s\S]*Бот: <i>не подключён<\/i>/);
    const labels = last().reply_markup!.inline_keyboard.flat().map((b) => b.text);
    expect(labels).toEqual(expect.arrayContaining(["✏️ Изменить через ИИ", "🚀 Опубликовать", "📦 Заказы", "🤖 Создать бота"]));

    expect(await press(TGA, `u:${ids.P}`)).toBe("published");
    expect(last().text).toMatch(/Опубликовано: v1<\/b>\n\n🔗 https:\/\/panel\.test\/app\//);
    expect(last().reply_markup!.inline_keyboard.flat().map((b) => b.callback_data)).toContain(`b:${ids.P}`); // still no bot: offer to create one

    const { recordsCol } = await import("@/lib/server/appdata");
    await (await recordsCol()).insertOne({ projectId: ids.P, collection: "orders", number: 1001, data: { customer: "Ali", total: 76000, note: "" }, tgUser: null, createdAt: new Date() } as never);
    await press(TGA, `o:${ids.P}`);
    expect(last().text).toContain("<b>#1001</b> orders\n<i>Ali · 76000</i>");
  });

  it("another account cannot see or act on this project", async () => {
    expect(await press(TGB, `p:${ids.P}`)).toBe("error");
    expect(last().text).toMatch(/Проект не найден/);
    expect(await press(TGB, `u:${ids.P}`)).toBe("error");
    expect(await press(TGB, `a:${ids.P}`)).toBe("error");
  });

  it("the project list shows only your projects; /cancel leaves the AI mode", async () => {
    await press(TGB, "p:list");
    expect(last().reply_markup!.inline_keyboard.flat().map((b) => b.text)).not.toContain("Gul Bazar");
    await press(TGA, `a:${ids.P}`);
    await say(TGA, "/cancel");
    expect(await say(TGA, "salom")).toBe("short message"); // no longer treated as an AI prompt
  });

  it("messages are HTML-formatted and project names cannot inject markup", async () => {
    const { projects } = await import("@/lib/server/projects");
    const id = (await (await projects()).insertOne({ name: "<b>Evil</b> & Co", slug: "evil1", doc: null, publishedVersion: 0, ownerId: ids.A, createdAt: new Date(), updatedAt: new Date() } as never)).insertedId.toHexString();
    await press(TGA, `p:${id}`);
    const body = calls.filter((c) => c.method === "sendMessage").at(-1)!.body as { parse_mode: string; text: string };
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("&lt;b&gt;Evil&lt;/b&gt; &amp; Co");
    expect(body.text).not.toContain("<b>Evil</b>");
  });

  it("Russian by default; /language switches (from the first message on) and the choice is remembered", async () => {
    const stranger = 515151; // not linked to any account
    await say(stranger, "/language");
    const row = last().reply_markup!.inline_keyboard[0] as { text: string; callback_data: string }[];
    expect(row.map((b) => b.callback_data)).toEqual(["l:ru", "l:uz", "l:en", "l:kaa"]);

    await press(stranger, "l:uz");
    const texts = sentTo().slice(-2).map((m) => m.text);
    expect(texts[0]).toContain("Til: <b>O‘zbekcha</b>");
    expect(texts[1]).toContain("Telegram ilovalari konstruktori");
    await say(stranger, "salom");
    expect(last().text).toContain("G‘oyani batafsilroq yozing"); // remembered: Uzbek
    await press(stranger, "l:ru");
    await say(stranger, "привет");
    expect(last().text).toContain("Опишите идею подробнее");
  });

  it("known server warnings are shown in the chat language", async () => {
    const { localizeWarning } = await import("@/lib/server/managerchat");
    const { BOT_DICT } = await import("@/lib/managerI18n");
    expect(localizeWarning(BOT_DICT.ru, "Bot token kiritilmagan — ilova faqat havola orqali ochiladi")).toBe(BOT_DICT.ru.warn.noToken);
    expect(localizeWarning(BOT_DICT.en, "Egasi (OWNER_CHAT_ID) ulanmagan — x")).toBe(BOT_DICT.en.warn.noOwner);
    expect(localizeWarning(BOT_DICT.ru, "Telegram sendMessage: boom")).toBe("Telegram sendMessage: boom");
  });

  it("creating a bot sends the Telegram link as a button", async () => {
    await press(TGA, `b:${ids.P}`);
    const btn = last().reply_markup!.inline_keyboard.flat()[0] as { url: string };
    expect(btn.url).toMatch(/^https:\/\/t\.me\/newbot\/ms_manager_bot\/ms_[a-z0-9]+_[0-9a-f]{4}_bot\?name=Gul%20Bazar$/);
  });

  it("publishing works without a bot first, and every later publish goes to the bot once it exists", async () => {
    const { encryptEnv } = await import("@/lib/server/crypto");
    const { projects } = await import("@/lib/server/projects");
    // v1 was published without a bot (previous test). Now the bot gets connected...
    await (await projects()).updateOne({ slug: { $exists: true }, _id: new (await import("mongodb")).ObjectId(ids.P) }, { $set: { envEnc: encryptEnv({ BOT_TOKEN: "42:BOT" }) } });
    const before = calls.length;
    // ...and the next publish (v2) updates that bot: webhook, menu button, commands
    expect(await press(TGA, `u:${ids.P}`)).toBe("published");
    const sentCalls = calls.slice(before).map((c) => c.method);
    expect(sentCalls).toEqual(expect.arrayContaining(["getMe", "setWebhook", "setChatMenuButton", "setMyCommands"]));
    expect((calls.slice(before).find((c) => c.method === "setWebhook")!.body as { url: string }).url).toBe(`https://panel.test/api/bot/${ids.P}`);
    expect(last().text).toContain("Опубликовано: v2");
    const kb = last().reply_markup!.inline_keyboard.flat() as { text: string; url?: string; callback_data?: string }[];
    expect(kb.find((b) => b.url)?.url).toBe("https://t.me/mock_bot"); // "open the bot" instead of "create bot"
    expect(kb.map((b) => b.callback_data)).not.toContain(`b:${ids.P}`);
  });

  it("the bot's own /start connects the owner automatically when a linked project editor presses it", async () => {
    const { encryptEnv } = await import("@/lib/server/crypto");
    const { projects, envOf, getProject } = await import("@/lib/server/projects");
    const { botSecret } = await import("@/lib/server/runtime");
    const { POST } = await import("@/app/api/bot/[id]/route");
    const doc = { name: "K", theme: {}, state: {}, collections: [], screens: [{ id: "s", type: "Screen", children: [] }], bot: { welcomeText: "Salom", buttonText: "Ochish" } };
    const pid = (await (await projects()).insertOne({ name: "Own", slug: "own1", doc, publishedDoc: doc, publishedVersion: 1, ownerId: ids.A, envEnc: encryptEnv({ BOT_TOKEN: "9:X" }), createdAt: new Date(), updatedAt: new Date() } as never)).insertedId.toHexString();
    const start = (from: number) =>
      POST(new Request(`https://panel.test/api/bot/${pid}`, { method: "POST", headers: { "x-telegram-bot-api-secret-token": botSecret(pid), "content-type": "application/json" }, body: JSON.stringify({ message: { chat: { id: from }, from: { id: from, first_name: "U" }, text: "/start" } }) }), { params: Promise.resolve({ id: pid }) } as never);

    await start(TGB); // linked, but not a member of this project: not the owner
    expect(envOf((await getProject(pid))!).OWNER_CHAT_ID).toBeUndefined();
    await start(990099); // not linked to any account
    expect(envOf((await getProject(pid))!).OWNER_CHAT_ID).toBeUndefined();

    const before = calls.length;
    await start(TGA); // the project's owner (linked): connected without any code
    expect(envOf((await getProject(pid))!).OWNER_CHAT_ID).toBe(String(TGA));
    const msgs = calls.slice(before).filter((c) => c.method === "sendMessage").map((c) => (c.body as { text: string }).text);
    expect(msgs[0]).toContain("Вы подключены как владелец");
    expect(msgs[1]).toBe("Salom"); // and still gets the welcome with the app button

    await start(TGB); // once an owner exists nobody else can take over by pressing Start
    expect(envOf((await getProject(pid))!).OWNER_CHAT_ID).toBe(String(TGA));
  });
});

describe.skipIf(!uri)("photos in the manager bot (MongoDB, Telegram and AI mocked)", () => {
  const TG = 770001;
  const aiCalls = () => ((globalThis as { __ai?: { kind: string; extras?: { images?: unknown[]; logo?: { src: string } | null } }[] }).__ai || []);
  const sentTo = () => calls.filter((c) => c.method === "sendMessage").map((c) => c.body as { text: string; reply_markup?: { inline_keyboard: { text: string; callback_data?: string }[][] } });
  const last = () => sentTo().at(-1)!;
  const waitFor = async (pred: () => boolean) => {
    for (let i = 0; i < 100 && !pred(); i++) await new Promise((r) => setTimeout(r, 20));
  };
  const photo = async (extra: { caption?: string; id?: string } = {}) => {
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    return handleManagerUpdate({ message: { chat: { id: TG }, from: { id: TG, first_name: "P" }, photo: [{ file_id: "small", file_size: 100 }, { file_id: extra.id || "ok", file_size: 1000 }], caption: extra.caption } });
  };
  const say = async (text: string) => {
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    return handleManagerUpdate({ message: { chat: { id: TG }, from: { id: TG, first_name: "P" }, text } });
  };
  const press = async (data: string) => {
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    return handleManagerUpdate({ callback_query: { id: "c", data, from: { id: TG, first_name: "P" }, message: { chat: { id: TG }, message_id: 1 } } });
  };
  /** The newest project of this Telegram user (the instant AI mock may already have renamed it). */
  const myProject = async () => {
    const { usersCol } = await import("@/lib/server/users");
    const { projects } = await import("@/lib/server/projects");
    const u = (await usersCol().findOne({ telegramId: TG } as never)) as unknown as { _id: { toHexString(): string } };
    return (await (await projects()).find({ ownerId: u._id.toHexString() }).sort({ createdAt: -1 }).limit(1).next())!;
  };

  beforeAll(async () => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_photos_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
    process.env.TELEGRAM_MANAGER_BOT_TOKEN = "1:MANAGER";
    process.env.TELEGRAM_MANAGER_BOT_USERNAME = "ms_manager_bot";
    process.env.PUBLIC_URL = "https://panel.test";
    const png = await sharp({ create: { width: 90, height: 60, channels: 4, background: { r: 220, g: 60, b: 20, alpha: 1 } } }).png().toBuffer();
    vi.stubGlobal("fetch", async (url: string) => (String(url).includes("/file/bot") ? new Response(new Uint8Array(png)) : new Response("{}")));
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  it("a photo before any project waits as a reference; the idea that follows is built from it", async () => {
    const { getProject } = await import("@/lib/server/projects");
    const { listAssets } = await import("@/lib/server/assets");
    expect(await photo()).toBe("photo for idea");
    expect(last().text).toContain("Референсов: 1");
    await say("кофейня в Нукусе с меню и доставкой");
    await waitFor(() => last().text.includes("Готово"));
    const id = (await myProject())._id.toHexString();
    const refs = (await listAssets(id)).filter((a) => a.kind === "reference");
    expect(refs).toHaveLength(1); // the staged photo was promoted into this project
    const call = aiCalls().at(-1)!;
    expect(call.kind).toBe("generate");
    expect(call.extras?.images).toHaveLength(1);
    expect((await getProject(id))?.doc).toBeTruthy();
  });

  it("a photo while an app is open asks what it is; 'logo' saves it and offers to apply it", async () => {
    const { getProject } = await import("@/lib/server/projects");
    const id = (await myProject())._id.toHexString();
    await say(`/cancel`);
    await press(`a:${id}`); // AI mode for that project
    expect(await photo()).toBe("photo staged");
    const kb = last().reply_markup!.inline_keyboard[0];
    expect(kb.map((b) => b.callback_data)).toEqual([expect.stringMatching(/^ig:[a-f0-9]{24}:l$/), expect.stringMatching(/^ig:[a-f0-9]{24}:r$/)]);

    expect(await press(kb[0].callback_data!)).toBe("logo saved");
    expect(last().text).toContain("Логотип сохранён");
    expect(last().text).toContain("#dc3c14");
    const p = (await getProject(id))!;
    expect(p.logoAssetId).toBeTruthy();
    const apply = last().reply_markup!.inline_keyboard[0][0];
    expect(apply.callback_data).toBe(`ia:${id}`);

    const before = aiCalls().length;
    await press(apply.callback_data!); // "apply to the app": an AI edit that knows about the logo
    await waitFor(() => aiCalls().length > before);
    const call = aiCalls().at(-1)!;
    expect(call.kind).toBe("edit");
    expect(call.extras?.logo?.src).toBe(`/api/assets/${p.logoAssetId}`);
  });

  it("'reference' without a caption waits for the instruction; with a caption it runs at once", async () => {
    await photo();
    await press(last().reply_markup!.inline_keyboard[0][1].callback_data!); // reference
    expect(last().text).toContain("Референс добавлен");
    let before = aiCalls().length;
    await say("сделай такие же карточки как на фото");
    await waitFor(() => aiCalls().length > before);
    expect(aiCalls().at(-1)!.extras?.images).toHaveLength(1);
    await say("ещё правка без картинки");
    await waitFor(() => aiCalls().length > before + 1);
    expect(aiCalls().at(-1)!.extras?.images).toHaveLength(0); // the reference was used once

    before = aiCalls().length;
    await photo({ caption: "сделай фон темнее" });
    await press(last().reply_markup!.inline_keyboard[0][1].callback_data!);
    await waitFor(() => aiCalls().length > before);
    expect(aiCalls().at(-1)).toMatchObject({ kind: "edit" });
    expect(aiCalls().at(-1)!.extras?.images).toHaveLength(1); // the caption was the request, the photo its reference
  });

  it("an oversized photo is refused politely; someone else's staged photo cannot be used", async () => {
    expect(await photo({ id: "big" })).toBe("photo too big");
    expect(last().text).toContain("5 МБ");
    const { stageAsset } = await import("@/lib/server/assets");
    const sid = await stageAsset({ projectId: null, input: await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer(), by: "someone-else" });
    expect(await press(`ig:${sid}:l`)).toBe("photo gone");
  });
});
