// Integration test against a real MongoDB (runs only when MONGODB_TEST_URI is set). Telegram calls are mocked.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const uri = process.env.MONGODB_TEST_URI;
const calls: { method: string; body: unknown }[] = [];
vi.mock("@/lib/server/telegram", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/telegram")>()),
  tgApi: async (_t: string, method: string, body?: unknown) => {
    calls.push({ method, body });
    if (method === "getManagedBotToken") return "777:CHILD-TOKEN";
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
    generateApp: async () => ({ doc, usage: usage() }),
    editApp: async (d: unknown) => ({ doc: d, message: "Narxlar qalinlashtirildi", ops: [{ op: "rename", name: "x" }], usage: usage() }),
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

    // the creator is told in the chat; the project is not published yet, so the button offers Publish
    const dm = calls.filter((c) => c.method === "sendMessage" && (c.body as { chat_id: number }).chat_id === 555).at(-1)!.body as { text: string; reply_markup: { inline_keyboard: { text: string; callback_data?: string }[][] } };
    expect(dm.text).toContain("@my_kafe_bot");
    expect(dm.text).toContain("Осталось опубликовать");
    expect(dm.reply_markup.inline_keyboard[0][0].callback_data).toBe(`u:${id}`);
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
    // a malformed link is not a link request: it falls through to the chat console (this Telegram is not linked)
    expect(await handleManagerUpdate({ message: { chat: { id: 1 }, from: { id: 1 }, text: "/start link_deadbeef" } })).toMatch(/not linked/);
    expect(await press(`lk:${"0".repeat(36)}`)).toMatch(/expired/);
    expect(await press("lk:" + code, 42)).toMatch(/failed/); // 42 is already linked to another account (earlier test)
    expect(await getTelegramLink(uid)).toBeNull();
  });

  it("link helpers: username and bot link are well-formed", async () => {
    const { newBotLink, suggestUsername } = await import("@/lib/server/manager");
    expect(suggestUsername("Lazzat Kafe!!")).toMatch(/^ms_lazzatkafe_[0-9a-f]{4}_bot$/);
    expect(newBotLink("ms_manager_bot", "ms_x_bot", "Lazzat Kafe")).toBe("https://t.me/newbot/ms_manager_bot/ms_x_bot?name=Lazzat%20Kafe");
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

  it("an unlinked Telegram account is told how to link, nothing else happens", async () => {
    expect(await say(424242, "/start")).toBe("not linked");
    expect(last().text).toMatch(/Telegram ещё не привязан/);
  });

  it("menu opens the panel inside Telegram through /tg", async () => {
    expect(await say(TGA, "/start")).toBe("menu");
    const web = last().reply_markup!.inline_keyboard.flat().find((b) => "web_app" in b) as { web_app: { url: string } };
    expect(web.web_app.url).toBe("https://panel.test/tg?next=%2Fdashboard");
  });

  it("creating a project by chat, then generating the app with a prompt", async () => {
    const { getProject } = await import("@/lib/server/projects");
    await press(TGA, "p:new");
    expect(last().text).toMatch(/Новый проект/);
    expect(await say(TGA, "Lazzat Kafe")).toBe("project created");
    const { projects } = await import("@/lib/server/projects");
    const row = (await (await projects()).findOne({ name: "Lazzat Kafe" }))!;
    ids.P = row._id.toHexString();
    expect(row.ownerId).toBe(ids.A);
    expect(last().text).toMatch(/Опишите приложение/);

    expect(await say(TGA, "gul do'koni katalogi")).toBe("ai generate started");
    expect(last().text).toMatch(/ИИ работает/);
    await waitFor(() => last().text.includes("Готово"));
    expect(last().text).toContain("Приложение создано: 1 экр.");
    expect((await getProject(ids.P))?.doc?.screens).toHaveLength(1);
    // no bot yet: the result points at the next step and offers "create bot" next to Publish
    expect(last().text).toContain("Следующий шаг");
    expect(last().reply_markup!.inline_keyboard.flat().map((b) => b.callback_data)).toEqual(expect.arrayContaining([`b:${ids.P}`, `u:${ids.P}`]));

    // the project now has an app: the next message is an edit
    expect(await say(TGA, "narxlarni qalinroq qil")).toBe("ai edit started");
    await waitFor(() => last().text.includes("Narxlar qalinlashtirildi"));
    expect(last().text).toContain("Narxlar qalinlashtirildi");
  });

  it("project card, publish, and latest records", async () => {
    await press(TGA, `p:${ids.P}`);
    expect(last().text).toMatch(/<b>Lazzat Kafe<\/b>[\s\S]*<b>1<\/b> экр\.[\s\S]*Публикация: <i>нет<\/i>[\s\S]*Бот: <i>не подключён<\/i>/);
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
    expect(last().reply_markup!.inline_keyboard.flat().map((b) => b.text)).not.toContain("Lazzat Kafe");
    await press(TGA, `a:${ids.P}`);
    await say(TGA, "/cancel");
    expect(await say(TGA, "salom")).toBe("menu (no state)"); // no longer treated as an AI prompt
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

  it("Russian by default; /language switches (even before linking) and the choice is remembered", async () => {
    const stranger = 515151; // not linked to any account
    await say(stranger, "/language");
    const row = last().reply_markup!.inline_keyboard[0] as { text: string; callback_data: string }[];
    expect(row.map((b) => b.callback_data)).toEqual(["l:ru", "l:uz", "l:en", "l:kaa"]);

    await press(stranger, "l:uz");
    const texts = sentTo().slice(-2).map((m) => m.text);
    expect(texts[0]).toContain("Til: <b>O‘zbekcha</b>");
    expect(texts[1]).toContain("Telegram ilovalari konstruktori");
    await say(stranger, "salom");
    expect(last().text).toContain("Telegram hali ulanmagan"); // remembered
    await press(stranger, "l:ru");
    await say(stranger, "привет");
    expect(last().text).toContain("Telegram ещё не привязан");
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
    expect(btn.url).toMatch(/^https:\/\/t\.me\/newbot\/ms_manager_bot\/ms_[a-z0-9]+_[0-9a-f]{4}_bot\?name=Lazzat%20Kafe$/);
  });
});
