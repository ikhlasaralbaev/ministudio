import type { Action, AppDoc } from "../types";
import { kit, type Palette } from "./kit";

export interface ServiceItem {
  id: string;
  name: string;
  price: number;
  /** "40 daqiqa", "3 oy" */
  duration: string;
  image: string;
  desc: string;
  tag?: string;
}

export interface ServiceCfg {
  name: string;
  palette: Palette;
  radius: number;
  font: string;
  heading?: string;
  hero: { image: string; kicker: string; title: string; sub: string; cta: string; rating: string };
  /** how the app calls things */
  nouns: { service: string; services: string; master: string; masters: string; day: string; time: string; cta: string; mine: string; done: string; doneSub: string };
  highlights: [string, string][];
  services: ServiceItem[];
  /** show "from" before prices (car service) */
  priceFrom?: boolean;
  masters: { id: string; name: string; role: string; rating: string }[];
  reviews: { id: string; name: string; text: string }[];
  days: string[];
  slots: { id: string; time: string; busy?: boolean }[];
  gallery: string[];
  extra?: { label: string; placeholder: string };
  info: { hours: string; address: string; phone: string; about: string; telegram: string };
  bot: { welcome: string; button: string; ask: string };
}

/** Service business: hero, price list, masters, reviews, then a step-by-step booking with day and time slots. */
export function serviceApp(cfg: ServiceCfg): AppDoc {
  const k = kit(cfg.palette, { heading: cfg.heading });
  const { c } = k;
  const R = cfg.radius;
  const N = cfg.nouns;
  const from = cfg.priceFrom ? "dan " : "";
  const tabs: [string, string, string][] = [
    ["house", "Bosh sahifa", "scr_home"],
    ["calendar-check", N.cta.split(" ")[0] === "Ariza" ? "Ariza" : "Yozilish", "scr_book"],
    ["list-checks", N.mine, "scr_mine"],
    ["phone", "Aloqa", "scr_info"],
  ];
  const tab = (active: string) => k.tabBar(tabs, active);
  const pick: Action[] = [{ type: "setState", key: "service", value: "item" }, { type: "haptic", style: "light" }, { type: "navigate", screen: "scr_book" }];
  const clamp: Record<string, string | number> = { display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" };
  const stars = (n = 5) => k.row({ gap: 2 }, Array.from({ length: n }, () => k.icon("star", 14, "#f5a524", "fill")));
  const priceText = `${from}{{ fmt(item.price) }} so'm`;

  // ----- home -----
  const home = k.screen("scr_home", "Bosh sahifa", [
    k.hero(cfg.hero.image, 300, [
      k.text(cfg.hero.kicker, undefined, { fontSize: 12, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "#fff", opacity: 0.85 }),
      k.text(cfg.hero.title, "h1", { color: "#fff", fontSize: 30, lineHeight: 1.15, ...(cfg.heading ? { fontFamily: cfg.heading } : {}) }),
      k.text(cfg.hero.sub, undefined, { color: "#ffffffd9", fontSize: 14 }),
      k.row({ gap: 6 }, [k.icon("star", 16, "#f5a524", "fill"), k.text(cfg.hero.rating, undefined, { color: "#fff", fontSize: 13, fontWeight: 600 })]),
      k.row({ marginTop: 6 }, [
        k.row({ padding: "11px 20px", borderRadius: 999, background: c.primary, color: c.onPrimary, fontWeight: 700, gap: 6, cursor: "pointer", boxShadow: `0 8px 22px ${c.primary}66` }, [k.text(cfg.hero.cta, undefined, { color: c.onPrimary, fontWeight: 700, fontSize: 15 }), k.icon("arrow-right", 16, c.onPrimary)], [{ type: "setState", key: "service", value: "{}" }, { type: "navigate", screen: "scr_book" }]),
      ]),
    ]),
    k.body([
      k.row({ gap: 8 }, cfg.highlights.map(([ic, label]) =>
        k.box({ flex: 1, alignItems: "center", gap: 6, padding: "12px 6px", background: c.surface, borderRadius: R, border: `1px solid ${c.line}`, textAlign: "center" }, [
          k.icon(ic, 22, c.primary, "duotone"),
          k.text(label, undefined, { fontSize: 11.5, fontWeight: 600, lineHeight: 1.25 }),
        ]),
      )),
      k.sectionTitle(N.services),
      k.list(
        "collections.services",
        [
          k.row({ gap: 12, padding: 10, background: c.surface, borderRadius: R, border: `1px solid ${c.line}`, cursor: "pointer", transition: "all .15s" }, [
            k.img("{{ item.image }}", "1/1", { width: 84, height: 84, borderRadius: R - 4, flex: "none" }, "{{ item.name }}"),
            k.box({ flex: 1, gap: 3, minWidth: 0 }, [
              k.row({ gap: 6 }, [k.text("{{ item.name }}", "h3", { fontSize: 16 }), k.when(k.badge("{{ item.tag }}", { background: c.primary, color: c.onPrimary, fontSize: 10, padding: "2px 8px" }), "!empty(item.tag)")]),
              k.text("{{ item.desc }}", "caption", { color: c.muted, opacity: 1, fontSize: 12.5, ...clamp }),
              k.row({ gap: 6, justifyContent: "space-between", marginTop: 2 }, [
                k.row({ gap: 4 }, [k.icon("clock", 14, c.muted), k.muted("{{ item.duration }}", { fontSize: 12.5 })]),
                k.text(priceText, undefined, { fontWeight: 800, color: c.primary, fontSize: 15 }),
              ]),
            ]),
          ], pick),
        ],
        { gap: 10 },
        "Xizmatlar tez orada qo'shiladi",
        "Xizmatlar",
      ),
      k.sectionTitle(N.masters),
      k.scroller([
        k.list(
          "collections.masters",
          [
            k.box({ width: 138, padding: "16px 10px", alignItems: "center", gap: 6, background: c.surface, borderRadius: R, border: `1px solid ${c.line}`, textAlign: "center", flex: "none" }, [
              k.box({ width: 56, height: 56, borderRadius: 28, background: c.primary + "22", alignItems: "center", justifyContent: "center" }, [k.text("{{ upper(item.name[0]) }}", "h2", { color: c.primary, fontSize: 24 }, true)]),
              k.text("{{ item.name }}", "h3", { fontSize: 15 }),
              k.muted("{{ item.role }}", { fontSize: 12 }),
              k.row({ gap: 3 }, [k.icon("star", 13, "#f5a524", "fill"), k.text("{{ item.rating }}", undefined, { fontSize: 12.5, fontWeight: 700 })]),
            ]),
          ],
          { display: "flex", flexDirection: "row", gap: 10 },
        ),
      ]),
      k.sectionTitle("Ish namunalari"),
      k.scroller([k.list("collections.gallery", [k.img("{{ item.image }}", "4/3", { width: 190, borderRadius: R, flex: "none" })], { display: "flex", flexDirection: "row", gap: 10 })]),
      k.sectionTitle("Mijozlar fikri"),
      k.scroller([
        k.list(
          "collections.reviews",
          [
            k.box({ width: 270, padding: 14, gap: 8, background: c.surface, borderRadius: R, border: `1px solid ${c.line}`, flex: "none" }, [
              stars(),
              k.text("{{ item.text }}", undefined, { fontSize: 14, lineHeight: 1.5 }),
              k.text("{{ item.name }}", undefined, { fontWeight: 700, fontSize: 13, color: c.muted }),
            ]),
          ],
          { display: "flex", flexDirection: "row", gap: 10 },
        ),
      ]),
    ]),
    k.spacer(),
    k.row({ position: "sticky", bottom: 70, margin: "0 16px 10px", zIndex: 4 }, [
      k.btn(N.cta, [{ type: "navigate", screen: "scr_book" }], { flex: 1, padding: "15px 16px", borderRadius: 999, fontSize: 16, boxShadow: `0 10px 28px ${c.primary}66` }),
    ]),
    tab("scr_home"),
  ], { background: c.bg });

  // ----- booking -----
  const stepTitle = (n: number, t: string) =>
    k.row({ gap: 10 }, [
      k.box({ width: 26, height: 26, borderRadius: 13, background: c.primary, alignItems: "center", justifyContent: "center", flex: "none" }, [k.text(String(n), undefined, { color: c.onPrimary, fontWeight: 800, fontSize: 13 })]),
      k.text(t, "h3", { fontSize: 17 }, true),
    ]);
  let step = 0;
  const hasMasters = cfg.masters.length > 0;
  const selected = "state.service.id == item.id";
  const book = k.screen("scr_book", N.cta, [
    k.body([
      k.row({ gap: 10 }, [k.iconBtn("arrow-left", [{ type: "navigate", screen: "scr_home" }]), k.text(N.cta, "h2", {}, true)]),
      stepTitle(++step, N.service),
      k.list(
        "collections.services",
        [
          k.row({ gap: 12, padding: "12px 14px", borderRadius: R, cursor: "pointer", transition: "all .15s",
            background: `{{ ${selected} ? '${c.primary}14' : '${c.surface}' }}`,
            border: `{{ ${selected} ? '1.5px solid ${c.primary}' : '1px solid ${c.line}' }}` }, [
            k.box({ width: 22, height: 22, borderRadius: 11, flex: "none", alignItems: "center", justifyContent: "center",
              border: `{{ ${selected} ? '6px solid ${c.primary}' : '2px solid ${c.line}' }}`, background: c.surface }, []),
            k.box({ flex: 1, gap: 1, minWidth: 0 }, [k.text("{{ item.name }}", undefined, { fontWeight: 700 }), k.muted("{{ item.duration }}", { fontSize: 12.5 })]),
            k.text(priceText, undefined, { fontWeight: 800, color: c.primary, fontSize: 14 }),
          ], [{ type: "setState", key: "service", value: "item" }, { type: "haptic", style: "light" }]),
        ],
        { gap: 8 },
      ),
      ...(hasMasters
        ? [
            stepTitle(++step, N.master),
            k.scroller([
              k.chip("Farqi yo'q", "state.master == ''", [{ type: "setState", key: "master", value: "''" }, { type: "haptic", style: "light" }]),
              k.list("collections.masters", [k.chip("{{ item.name }}", "state.master == item.name", [{ type: "setState", key: "master", value: "item.name" }, { type: "haptic", style: "light" }])], { display: "flex", flexDirection: "row", gap: 8 }),
            ]),
          ]
        : []),
      stepTitle(++step, N.day),
      k.scroller([k.list("collections.days", [k.chip("{{ item.label }}", "state.day == item.label", [{ type: "setState", key: "day", value: "item.label" }, { type: "haptic", style: "light" }])], { display: "flex", flexDirection: "row", gap: 8 })]),
      stepTitle(++step, N.time),
      k.list(
        "collections.slots",
        [
          k.when(k.chip("{{ item.time }}", "state.slot == item.time", [{ type: "setState", key: "slot", value: "item.time" }, { type: "haptic", style: "light" }], { justifyContent: "center" }), "!item.busy"),
          k.when(k.row({ padding: "9px 16px", borderRadius: 999, justifyContent: "center", opacity: 0.4, border: `1px dashed ${c.line}` }, [k.text("{{ item.time }}", undefined, { fontSize: 14, textDecoration: "line-through" })]), "item.busy"),
        ],
        { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
      ),
      stepTitle(++step, "Ma'lumotlaringiz"),
      k.input("name", "Ismingiz", {}, { borderRadius: R }),
      k.input("phone", "Telefon: +998 90 123 45 67", { inputType: "tel" }, { borderRadius: R }),
      ...(cfg.extra ? [k.input("extra", cfg.extra.placeholder, {}, { borderRadius: R })] : []),
      k.input("note", "Izoh (ixtiyoriy)", { multiline: true }, { borderRadius: R }),
    ]),
    k.spacer(),
    k.row({ position: "sticky", bottom: 0, gap: 12, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", background: c.bg, borderTop: `1px solid ${c.line}`, zIndex: 5 }, [
      k.btn(
        N.cta,
        [
          {
            type: "if",
            cond: "empty(state.service.name) || empty(state.slot) || len(state.phone) < 9 || len(state.name) < 2",
            then: [{ type: "haptic", style: "error" }, { type: "alert", text: `${N.service}, vaqt, ism va telefon raqamni to'ldiring` }],
            else: [
              {
                type: "dbInsert",
                collection: "bookings",
                value: "{ service: state.service.name, price: state.service.price, master: state.master, day: state.day, slot: state.slot, name: state.name, phone: state.phone, extra: state.extra, note: state.note, status: 'new' }",
                saveIdTo: "bookingId",
              },
              {
                type: "notifyOwner",
                text: `🆕 Yangi so'rov #{{ last }}\n{{ state.service.name }}\n{{ state.day }}, {{ state.slot }}\n{{ empty(state.master) ? '' : '${N.master.replace(/'/g, "‘")}: ' + state.master }}\nIsm: {{ state.name }}\nTel: {{ state.phone }}\n{{ state.extra }}`,
              },
              { type: "haptic", style: "success" },
              { type: "navigate", screen: "scr_done" },
            ],
          },
        ],
        { flex: 1, padding: "15px 16px", borderRadius: 999, fontSize: 16 },
      ),
    ]),
  ], { background: c.bg });

  // ----- done -----
  const summaryRow = (ic: string, v: string) => k.row({ gap: 10 }, [k.icon(ic, 18, c.primary, "duotone"), k.text(v, undefined, { fontWeight: 600 })]);
  const done = k.screen("scr_done", "Tayyor", [
    k.box({ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28, textAlign: "center", minHeight: 540 }, [
      k.box({ width: 104, height: 104, borderRadius: 52, background: "#2f9e4418", alignItems: "center", justifyContent: "center" }, [k.icon("check-circle", 64, "#2f9e44", "fill")]),
      k.text(N.done, "h2", {}, true),
      k.text(N.doneSub, undefined, { color: c.muted }),
      k.card([summaryRow("scissors", "{{ state.service.name }}"), summaryRow("calendar-blank", "{{ state.day }}, {{ state.slot }}"), k.when(summaryRow("user", "{{ state.master }}"), "!empty(state.master)")], { width: "100%", textAlign: "left", marginTop: 6 }),
      k.btn(N.mine, [{ type: "navigate", screen: "scr_mine" }], { borderRadius: 999, padding: "13px 26px", marginTop: 8 }),
      k.btn("Bosh sahifaga", [{ type: "navigate", screen: "scr_home" }], { borderRadius: 999 }, "ghost"),
    ]),
  ], { background: c.bg });

  // ----- my bookings -----
  const st = "item.status == 'accepted' ? 'Tasdiqlandi' : item.status == 'done' ? 'Bajarildi' : item.status == 'cancelled' ? 'Bekor qilindi' : 'Kutilmoqda'";
  const stc = "item.status == 'accepted' ? '#2f9e44' : item.status == 'done' ? '#1c7ed6' : item.status == 'cancelled' ? '#e03131' : '#f08c00'";
  const mine = k.screen("scr_mine", N.mine, [
    k.body([
      k.text(N.mine, "h2", {}, true),
      k.list(
        "collections.bookings",
        [
          k.card([
            k.row({ justifyContent: "space-between" }, [k.text("{{ item.service }}", "h3", { fontSize: 16 }), k.badge(`{{ ${st} }}`, { background: `{{ ${stc} }}22`, color: `{{ ${stc} }}` })]),
            k.row({ gap: 8 }, [k.icon("calendar-blank", 16, c.muted), k.text("{{ item.day }}, {{ item.slot }}", undefined, { fontSize: 14 })]),
            k.when(k.row({ gap: 8 }, [k.icon("user", 16, c.muted), k.text("{{ item.master }}", undefined, { fontSize: 14 })]), "!empty(item.master)"),
            k.when(
              k.btn("Bekor qilish", [{ type: "dbUpdate", collection: "bookings", id: "item._id", value: "{ status: 'cancelled' }" }, { type: "haptic", style: "light" }], { alignSelf: "flex-start", padding: "8px 14px", color: "#e03131" }, "ghost"),
              "item.status == 'new' || item.status == 'accepted'",
            ),
          ]),
        ],
        { gap: 10 },
        "Hali yozuv yo'q. Birinchisini band qiling!",
      ),
    ]),
    k.spacer(),
    tab("scr_mine"),
  ], { background: c.bg });

  // ----- contacts -----
  const info = k.screen("scr_info", "Aloqa", [
    k.hero(cfg.hero.image, 150, [k.text(cfg.name, "h1", { color: "#fff", ...(cfg.heading ? { fontFamily: cfg.heading } : {}) })]),
    k.body([
      k.text(cfg.info.about, undefined, { color: c.muted, lineHeight: 1.55 }),
      k.infoRow("clock", "Ish vaqti", cfg.info.hours),
      k.infoRow("map-pin", "Manzil", cfg.info.address),
      k.infoRow("phone", "Telefon", cfg.info.phone, [{ type: "openLink", url: `tel:${cfg.info.phone.replace(/\s/g, "")}` }]),
      k.infoRow("paper-plane-tilt", "Telegram", cfg.info.telegram, [{ type: "openLink", url: `https://t.me/${cfg.info.telegram.replace("@", "")}` }]),
    ]),
    k.spacer(),
    tab("scr_info"),
  ], { background: c.bg });

  return {
    name: cfg.name,
    theme: { primary: c.primary, background: c.bg, text: c.text, radius: R, font: cfg.font },
    state: { service: {}, master: "", day: cfg.days[0], slot: "", name: "", phone: "", extra: "", note: "", bookingId: "" },
    collections: [
      {
        name: "services",
        label: N.services,
        mode: "static",
        fields: [
          { name: "id", type: "text" },
          { name: "name", type: "text", label: "Nomi" },
          { name: "price", type: "money", label: "Narxi" },
          { name: "duration", type: "text", label: "Davomiyligi" },
          { name: "image", type: "image", label: "Rasm" },
          { name: "desc", type: "text", label: "Tavsif" },
          { name: "tag", type: "text", label: "Belgi" },
        ],
        data: cfg.services.map((x) => ({ ...x })),
      },
      { name: "masters", label: N.masters, mode: "static", fields: [{ name: "id", type: "text" }, { name: "name", type: "text", label: "Ismi" }, { name: "role", type: "text", label: "Lavozimi" }, { name: "rating", type: "text", label: "Reyting" }], data: cfg.masters },
      { name: "days", label: N.day, mode: "static", fields: [{ name: "id", type: "text" }, { name: "label", type: "text", label: "Nomi" }], data: cfg.days.map((label, i) => ({ id: `d${i + 1}`, label })) },
      { name: "slots", label: N.time, mode: "static", fields: [{ name: "id", type: "text" }, { name: "time", type: "text", label: "Vaqt" }, { name: "busy", type: "boolean", label: "Band" }], data: cfg.slots.map((x) => ({ busy: false, ...x })) },
      { name: "gallery", label: "Ish namunalari", mode: "static", fields: [{ name: "id", type: "text" }, { name: "image", type: "image", label: "Rasm" }], data: cfg.gallery.map((image, i) => ({ id: `g${i + 1}`, image })) },
      { name: "reviews", label: "Sharhlar", mode: "static", fields: [{ name: "id", type: "text" }, { name: "name", type: "text", label: "Mijoz" }, { name: "text", type: "text", label: "Sharh" }], data: cfg.reviews },
      {
        name: "bookings",
        label: N.mine,
        mode: "records",
        fields: [
          { name: "service", type: "text", label: N.service },
          { name: "price", type: "money", label: "Narxi" },
          { name: "master", type: "text", label: N.master },
          { name: "day", type: "text", label: N.day },
          { name: "slot", type: "text", label: N.time },
          { name: "name", type: "text", label: "Mijoz" },
          { name: "phone", type: "phone", label: "Telefon" },
          { name: "extra", type: "text", label: cfg.extra?.label ?? "Qo'shimcha" },
          { name: "note", type: "text", label: "Izoh" },
          { name: "status", type: "select", options: ["new", "accepted", "done", "cancelled"], label: "Holat" },
        ],
      },
    ],
    screens: [home, book, done, mine, info],
    bot: {
      welcomeText: cfg.bot.welcome,
      buttonText: cfg.bot.button,
      messages: [{ id: "narx", text: cfg.bot.ask, buttons: [[{ text: cfg.bot.button, app: true }]] }],
      commands: [{ command: "menu", description: "Ilovani ochish", to: "narx" }],
      keywords: [{ match: "narx", to: "narx" }],
      ownerAlerts: [{ collection: "bookings", acceptText: "✅ So'rovingiz qabul qilindi. Kutamiz!", rejectText: "❌ Kechirasiz, bu vaqt band. Boshqa vaqt tanlang yoki qo'ng'iroq qiling." }],
    },
  };
}
