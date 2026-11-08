import type { Action, AppDoc, UINode } from "../types";
import { kit, type Palette, type S } from "./kit";

/** One catalog row. `image` is a full URL. */
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  desc: string;
  tag?: string;
}

export interface ShopCfg {
  name: string;
  palette: Palette;
  radius: number;
  font: string;
  /** serif/display family for titles (optional) */
  heading?: string;
  /** list = thumbnail rows, grid = two columns of tall photos, feature = full-width photo cards */
  layout: "list" | "grid" | "feature";
  hero: { image: string; kicker: string; title: string; sub: string; cta: string };
  /** three small selling points under the hero: [phosphor icon, text] */
  perks: [string, string][];
  categories: { id: string; name: string }[];
  products: Product[];
  /** a choice on the product page (size, weight...): stored in state.opt and kept on the cart row */
  option?: { label: string; values: string[]; initial: string };
  /** an optional free-text line on the product page (a card text for a bouquet) */
  note?: { label: string; placeholder: string };
  deliveryFee: number;
  freeFrom: number;
  info: { hours: string; address: string; phone: string; about: string; telegram: string };
  bot: { welcome: string; button: string; ask: string };
  words: { items: string; emptyCart: string };
}

/** Catalog + cart + checkout + order history, in the style of the given config. */
export function shopApp(cfg: ShopCfg): AppDoc {
  const k = kit(cfg.palette, { heading: cfg.heading });
  const { c } = k;
  const R = cfg.radius;

  // ----- expressions shared by several screens -----
  const SUB = "sum(state.cart, 'price', 'qty')";
  const FEE = `(state.mode == 'delivery' ? (${SUB} >= ${cfg.freeFrom} ? 0 : ${cfg.deliveryFee}) : 0)`;
  const TOTAL = `${SUB} + ${FEE}`;
  const CART_N = "count(state.cart)";
  const tabs: [string, string, string][] = [
    ["house", "Bosh sahifa", "scr_home"],
    ["shopping-bag", "Savat", "scr_cart"],
    ["receipt", "Buyurtmalar", "scr_orders"],
    ["info", "Ma'lumot", "scr_info"],
  ];
  const tab = (active: string) => k.tabBar(tabs, active, { scr_cart: CART_N });

  const addQuick: Action[] = [
    { type: "append", key: "cart", value: `{ id: item.id, name: item.name, price: item.price, qty: 1, image: item.image, opt: '${cfg.option?.initial ?? ""}' }` },
    { type: "haptic", style: "success" },
  ];
  const open: Action[] = [
    { type: "setState", key: "sel", value: "item" },
    { type: "setState", key: "qty", value: "1" },
    { type: "setState", key: "opt", value: `'${cfg.option?.initial ?? ""}'` },
    { type: "setState", key: "note", value: "''" },
    { type: "navigate", screen: "scr_item" },
  ];
  const plusBtn = (extra: S = {}) =>
    k.box({ width: 36, height: 36, borderRadius: 18, background: c.primary, alignItems: "center", justifyContent: "center", flex: "none", cursor: "pointer", boxShadow: `0 4px 12px ${c.primary}55`, ...extra }, [k.icon("plus", 18, c.onPrimary)], addQuick);
  const clamp = (lines: number): S => ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" });
  const tagBadge = (extra: S = {}) => k.when(k.badge("{{ item.tag }}", { background: c.primary, color: c.onPrimary, ...extra }), "!empty(item.tag)");

  // ----- catalog cards by layout -----
  const catalog: UINode =
    cfg.layout === "grid"
      ? k.list(
          "state.cat == 'all' ? collections.products : filter(collections.products, 'category', state.cat)",
          [
            k.box({ gap: 8, minWidth: 0, cursor: "pointer" }, [
              k.box({ position: "relative" }, [
                k.img("{{ item.image }}", "4/5", { borderRadius: R, boxShadow: "0 6px 20px rgba(0,0,0,0.08)" }, "{{ item.name }}"),
                tagBadge({ position: "absolute", top: 10, left: 10 }),
                plusBtn({ position: "absolute", right: 10, bottom: 10 }),
              ]),
              k.text("{{ item.name }}", "h3", { fontSize: 15, ...clamp(2) }, true),
              k.text("{{ fmt(item.price) }} so'm", undefined, { fontWeight: 700, color: c.primary, fontSize: 15 }),
            ], open),
          ],
          { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px 12px" },
          "Bu bo'limda hozircha hech narsa yo'q",
          "Katalog",
        )
      : cfg.layout === "feature"
        ? k.list(
            "state.cat == 'all' ? collections.products : filter(collections.products, 'category', state.cat)",
            [
              k.box({ background: c.surface, borderRadius: R + 4, overflow: "hidden", border: `1px solid ${c.line}`, boxShadow: "0 8px 24px rgba(0,0,0,0.06)", cursor: "pointer" }, [
                k.box({ position: "relative" }, [k.img("{{ item.image }}", "16/10", { borderRadius: 0 }, "{{ item.name }}"), tagBadge({ position: "absolute", top: 12, left: 12 })]),
                k.box({ padding: "12px 14px 14px", gap: 6 }, [
                  k.text("{{ item.name }}", "h3", { fontSize: 18 }, true),
                  k.text("{{ item.desc }}", "caption", { color: c.muted, opacity: 1, ...clamp(2) }),
                  k.row({ justifyContent: "space-between", marginTop: 4 }, [
                    k.text("{{ fmt(item.price) }} so'm", undefined, { fontWeight: 800, fontSize: 17, color: c.primary }),
                    k.row({ gap: 6, padding: "8px 14px", borderRadius: 999, background: c.primary, color: c.onPrimary, fontWeight: 700, fontSize: 14, cursor: "pointer" }, [k.icon("plus", 16, c.onPrimary), k.text("Savatga", undefined, { color: c.onPrimary, fontWeight: 700, fontSize: 14 })], addQuick),
                  ]),
                ]),
              ], open),
            ],
            { gap: 16 },
            "Bu bo'limda hozircha hech narsa yo'q",
            "Katalog",
          )
        : k.list(
            "state.cat == 'all' ? collections.products : filter(collections.products, 'category', state.cat)",
            [
              k.row({ gap: 12, padding: 10, background: c.surface, borderRadius: R, border: `1px solid ${c.line}`, alignItems: "stretch", cursor: "pointer", transition: "all .15s" }, [
                k.box({ position: "relative", flex: "none", width: 96 }, [k.img("{{ item.image }}", "1/1", { borderRadius: R - 4, height: 96, width: 96 }, "{{ item.name }}")]),
                k.box({ flex: 1, gap: 3, justifyContent: "space-between", minWidth: 0 }, [
                  k.box({ gap: 2 }, [
                    k.row({ gap: 6 }, [k.text("{{ item.name }}", "h3", { fontSize: 16 }), tagBadge({ fontSize: 10, padding: "2px 8px" })]),
                    k.text("{{ item.desc }}", "caption", { color: c.muted, opacity: 1, fontSize: 12.5, ...clamp(2) }),
                  ]),
                  k.row({ justifyContent: "space-between" }, [k.text("{{ fmt(item.price) }} so'm", undefined, { fontWeight: 800, color: c.primary }), plusBtn({ width: 32, height: 32 })]),
                ]),
              ], open),
            ],
            { gap: 10 },
            "Bu bo'limda hozircha hech narsa yo'q",
            "Katalog",
          );

  // ----- home -----
  const home = k.screen("scr_home", "Bosh sahifa", [
    k.hero(cfg.hero.image, 250, [
      k.text(cfg.hero.kicker, undefined, { fontSize: 12, fontWeight: 700, letterSpacing: 1.6, textTransform: "uppercase", color: "#fff", opacity: 0.85 }),
      k.text(cfg.hero.title, "h1", { color: "#fff", fontSize: 30, lineHeight: 1.15, ...(cfg.heading ? { fontFamily: cfg.heading } : {}) }),
      k.text(cfg.hero.sub, undefined, { color: "#ffffffd9", fontSize: 14 }),
      k.row({ gap: 8, marginTop: 6 }, [
        k.row({ padding: "10px 18px", borderRadius: 999, background: "#fff", color: "#111", fontWeight: 700, fontSize: 14, gap: 6, cursor: "pointer" }, [k.text(cfg.hero.cta, undefined, { color: "#111", fontWeight: 700, fontSize: 14 }), k.icon("arrow-right", 16, "#111")], [{ type: "setState", key: "cat", value: "'all'" }]),
      ]),
    ]),
    k.body([
      k.row({ gap: 8, justifyContent: "space-between" }, cfg.perks.map(([ic, label]) =>
        k.box({ flex: 1, alignItems: "center", gap: 6, padding: "10px 4px", background: c.surface, borderRadius: R, border: `1px solid ${c.line}`, textAlign: "center" }, [
          k.icon(ic, 22, c.primary, "duotone"),
          k.text(label, undefined, { fontSize: 11.5, fontWeight: 600, lineHeight: 1.25 }),
        ]),
      )),
      k.scroller([
        k.chip("Hammasi", "state.cat == 'all'", [{ type: "setState", key: "cat", value: "'all'" }, { type: "haptic", style: "light" }]),
        k.list("collections.categories", [k.chip("{{ item.name }}", "state.cat == item.id", [{ type: "setState", key: "cat", value: "item.id" }, { type: "haptic", style: "light" }])], { display: "flex", flexDirection: "row", gap: 8 }),
      ]),
      catalog,
    ]),
    k.spacer(),
    k.when(
      k.row({ position: "sticky", bottom: 70, margin: "0 16px 10px", padding: "13px 16px", borderRadius: 999, background: c.primary, color: c.onPrimary, justifyContent: "space-between", boxShadow: `0 10px 28px ${c.primary}66`, cursor: "pointer", zIndex: 4 }, [
        k.row({ gap: 8 }, [k.icon("shopping-bag", 20, c.onPrimary, "fill"), k.text(`{{ ${CART_N} }} ta ${cfg.words.items}`, undefined, { color: c.onPrimary, fontWeight: 700 })]),
        k.text(`{{ fmt(${SUB}) }} so'm`, undefined, { color: c.onPrimary, fontWeight: 800 }),
      ], [{ type: "navigate", screen: "scr_cart" }]),
      `${CART_N} > 0`,
    ),
    tab("scr_home"),
  ], { background: c.bg });

  // ----- product page -----
  const optionRow: UINode[] = cfg.option
    ? [
        k.box({ gap: 8 }, [
          k.text(cfg.option.label, undefined, { fontSize: 13, fontWeight: 700, color: c.muted }),
          k.row({ gap: 8, flexWrap: "wrap" }, cfg.option.values.map((v) => k.chip(v, `state.opt == '${v}'`, [{ type: "setState", key: "opt", value: `'${v}'` }, { type: "haptic", style: "light" }], { minWidth: 48, justifyContent: "center" }))),
        ]),
      ]
    : [];
  const noteRow: UINode[] = cfg.note ? [k.field(cfg.note.label, k.input("note", cfg.note.placeholder, { multiline: true }, { borderRadius: R }))] : [];
  const item = k.screen("scr_item", "Mahsulot", [
    k.box({ position: "relative" }, [
      k.img("{{ state.sel.image }}", "1/1", { borderRadius: 0 }, "{{ state.sel.name }}"),
      k.iconBtn("arrow-left", [{ type: "back" }], { position: "absolute", top: 14, left: 14, background: "#ffffffee", border: "none", boxShadow: "0 4px 14px rgba(0,0,0,0.18)" }),
    ]),
    k.box({ padding: "18px 16px 8px", gap: 12, marginTop: -22, background: c.bg, borderRadius: "22px 22px 0 0", position: "relative" }, [
      k.row({ justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, [
        k.box({ gap: 6, flex: 1 }, [
          k.when(k.badge("{{ state.sel.tag }}", { background: c.primary + "1f", color: c.primary }), "!empty(state.sel.tag)"),
          k.text("{{ state.sel.name }}", "h2", { fontSize: 24 }, true),
        ]),
        k.text("{{ fmt(state.sel.price) }} so'm", undefined, { fontWeight: 800, fontSize: 20, color: c.primary, whiteSpace: "nowrap" }),
      ]),
      k.text("{{ state.sel.desc }}", undefined, { color: c.muted, lineHeight: 1.55 }),
      ...optionRow,
      ...noteRow,
    ]),
    k.spacer(),
    k.row({ position: "sticky", bottom: 0, gap: 12, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", background: c.bg, borderTop: `1px solid ${c.line}`, zIndex: 5 }, [
      k.stepper("qty"),
      k.btn(
        "Savatga · {{ fmt(state.sel.price * state.qty) }}",
        [
          { type: "append", key: "cart", value: "{ id: state.sel.id, name: state.sel.name, price: state.sel.price, qty: state.qty, image: state.sel.image, opt: state.opt, note: state.note }" },
          { type: "haptic", style: "success" },
          { type: "back" },
        ],
        { flex: 1, padding: "15px 12px", borderRadius: 999, fontSize: 16, whiteSpace: "nowrap" },
      ),
    ]),
  ], { background: c.bg });

  // ----- cart -----
  const summary = (withFee: boolean) =>
    k.card([
      k.row({ justifyContent: "space-between" }, [k.text("Mahsulotlar", undefined, { color: c.muted }), k.text(`{{ fmt(${SUB}) }} so'm`)]),
      ...(withFee
        ? [k.row({ justifyContent: "space-between" }, [k.text("Yetkazib berish", undefined, { color: c.muted }), k.text(`{{ ${FEE} == 0 ? 'Bepul' : fmt(${FEE}) + ' so‘m' }}`)])]
        : []),
      k.box({ height: 1, background: c.line }, []),
      k.row({ justifyContent: "space-between" }, [k.text("Jami", "h3"), k.text(`{{ fmt(${withFee ? TOTAL : SUB}) }} so'm`, "h3", { color: c.primary })]),
    ]);
  const cart = k.screen("scr_cart", "Savat", [
    k.body([
      k.row({ gap: 10 }, [k.iconBtn("arrow-left", [{ type: "back" }]), k.text("Savat", "h2", {}, true)]),
      k.when(
        k.box({ alignItems: "center", gap: 10, padding: "48px 24px", textAlign: "center" }, [
          k.box({ width: 84, height: 84, borderRadius: 42, background: c.primary + "14", alignItems: "center", justifyContent: "center" }, [k.icon("shopping-bag", 38, c.primary, "duotone")]),
          k.text(cfg.words.emptyCart, "h3"),
          k.text("Katalogdan o'zingizga yoqqanini tanlang", undefined, { color: c.muted }),
          k.btn("Katalogga o'tish", [{ type: "navigate", screen: "scr_home" }], { borderRadius: 999, padding: "12px 22px", marginTop: 6 }),
        ]),
        `${CART_N} == 0`,
      ),
      k.list(
        "state.cart",
        [
          k.row({ gap: 12, padding: 10, background: c.surface, borderRadius: R, border: `1px solid ${c.line}` }, [
            k.img("{{ item.image }}", "1/1", { width: 64, height: 64, borderRadius: R - 4, flex: "none" }),
            k.box({ flex: 1, gap: 2, minWidth: 0 }, [
              k.text("{{ item.name }}", "h3", { fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
              k.when(k.muted("{{ item.opt }}", { fontSize: 12 }), "!empty(item.opt)"),
              k.text("{{ item.qty }} × {{ fmt(item.price) }} so'm", undefined, { fontWeight: 700, color: c.primary, fontSize: 14 }),
            ]),
            k.box({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", background: c.bg, flex: "none", cursor: "pointer" }, [k.icon("trash", 18, c.muted)], [{ type: "removeAt", key: "cart", index: "index" }, { type: "haptic", style: "light" }]),
          ]),
        ],
        { gap: 10 },
      ),
      k.when(summary(false), `${CART_N} > 0`),
    ]),
    k.spacer(),
    k.when(
      k.row({ position: "sticky", bottom: 70, margin: "0 16px 10px", zIndex: 4 }, [
        k.btn(`Rasmiylashtirish · {{ fmt(${SUB}) }} so'm`, [{ type: "navigate", screen: "scr_checkout" }], { flex: 1, padding: "15px 16px", borderRadius: 999, fontSize: 16, boxShadow: `0 10px 28px ${c.primary}66` }),
      ]),
      `${CART_N} > 0`,
    ),
    tab("scr_cart"),
  ], { background: c.bg });

  // ----- checkout -----
  const seg = (label: string, value: string, ic: string) =>
    k.row({ flex: 1, justifyContent: "center", gap: 6, padding: "12px 8px", borderRadius: R, cursor: "pointer", fontWeight: 700, transition: "all .15s",
      background: `{{ state.mode == '${value}' ? '${c.primary}' : '${c.surface}' }}`,
      color: `{{ state.mode == '${value}' ? '${c.onPrimary}' : '${c.text}' }}`,
      border: `{{ state.mode == '${value}' ? '1px solid ${c.primary}' : '1px solid ${c.line}' }}`,
    }, [k.icon(ic, 18, "currentColor"), k.text(label, undefined, { color: "inherit", fontWeight: 700, fontSize: 14 })], [{ type: "setState", key: "mode", value: `'${value}'` }, { type: "haptic", style: "light" }]);
  const invalid = `${CART_N} == 0 || len(state.phone) < 9 || len(state.name) < 2 || (state.mode == 'delivery' && len(state.address) < 5)`;
  const checkout = k.screen("scr_checkout", "Rasmiylashtirish", [
    k.body([
      k.row({ gap: 10 }, [k.iconBtn("arrow-left", [{ type: "back" }]), k.text("Buyurtma", "h2", {}, true)]),
      k.row({ gap: 8 }, [seg("Yetkazib berish", "delivery", "truck"), seg("Olib ketish", "pickup", "storefront")]),
      k.field("Ismingiz", k.input("name", "Ismingiz", {}, { borderRadius: R })),
      k.field("Telefon", k.input("phone", "+998 90 123 45 67", { inputType: "tel" }, { borderRadius: R })),
      k.when(k.field("Manzil", k.input("address", "Ko'cha, uy, mo'ljal", { multiline: true }, { borderRadius: R })), "state.mode == 'delivery'"),
      k.when(k.card([k.row({ gap: 8 }, [k.icon("storefront", 20, c.primary, "duotone"), k.text(cfg.info.address, undefined, { fontWeight: 600 })]), k.muted(cfg.info.hours)]), "state.mode == 'pickup'"),
      k.field("Izoh (ixtiyoriy)", k.input("comment", "Qo'shimcha istaklar", { multiline: true }, { borderRadius: R })),
      k.box({ gap: 8 }, [
        k.text("To'lov usuli", undefined, { fontSize: 13, fontWeight: 600, color: c.muted }),
        k.row({ gap: 8, flexWrap: "wrap" }, [
          k.chip("Naqd pul", "state.pay == 'cash'", [{ type: "setState", key: "pay", value: "'cash'" }]),
          k.chip("Click", "state.pay == 'click'", [{ type: "setState", key: "pay", value: "'click'" }]),
          k.chip("Payme", "state.pay == 'payme'", [{ type: "setState", key: "pay", value: "'payme'" }]),
        ]),
      ]),
      summary(true),
    ]),
    k.spacer(),
    k.row({ position: "sticky", bottom: 0, padding: "12px 16px calc(12px + env(safe-area-inset-bottom))", background: c.bg, borderTop: `1px solid ${c.line}`, zIndex: 5 }, [
      k.btn(
        `Tasdiqlash · {{ fmt(${TOTAL}) }} so'm`,
        [
          {
            type: "if",
            cond: invalid,
            then: [{ type: "haptic", style: "error" }, { type: "alert", text: "Ism, telefon raqam" + (cfg.deliveryFee >= 0 ? " va manzilni" : "") + " to'ldiring" }],
            else: [
              {
                type: "dbInsert",
                collection: "orders",
                value: `{ items: state.cart, total: ${TOTAL}, mode: state.mode, address: state.address, phone: state.phone, name: state.name, pay: state.pay, note: state.comment, status: 'new' }`,
                saveIdTo: "orderId",
              },
              {
                type: "notifyOwner",
                text: "🆕 Buyurtma #{{ last }}\n{{ state.name }}, {{ state.phone }}\n{{ join(map(state.cart, 'name')) }}\nJami: {{ fmt(" + TOTAL + ") }} so'm\n{{ state.mode == 'delivery' ? 'Yetkazish: ' + state.address : 'Olib ketish' }}\nTo'lov: {{ state.pay }}",
              },
              { type: "if", cond: "state.pay == 'click'", then: [{ type: "pay", provider: "click", amount: TOTAL, description: "Buyurtma" }], else: [] },
              { type: "if", cond: "state.pay == 'payme'", then: [{ type: "pay", provider: "payme", amount: TOTAL, description: "Buyurtma" }], else: [] },
              { type: "haptic", style: "success" },
              { type: "setState", key: "cart", value: "[]" },
              { type: "navigate", screen: "scr_done" },
            ],
          },
        ],
        { flex: 1, padding: "15px 16px", borderRadius: 999, fontSize: 16 },
      ),
    ]),
  ], { background: c.bg });

  // ----- done -----
  const done = k.screen("scr_done", "Tayyor", [
    k.box({ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28, textAlign: "center", minHeight: 520 }, [
      k.box({ width: 104, height: 104, borderRadius: 52, background: "#2f9e4418", alignItems: "center", justifyContent: "center" }, [k.icon("check-circle", 64, "#2f9e44", "fill")]),
      k.text("Rahmat! Buyurtma qabul qilindi", "h2", {}, true),
      k.text("Buyurtma raqami: #{{ state.orderId }}", undefined, { color: c.muted }),
      k.text("Tez orada operator siz bilan bog'lanadi.", undefined, { color: c.muted }),
      k.btn("Buyurtmalarim", [{ type: "navigate", screen: "scr_orders" }], { borderRadius: 999, padding: "13px 26px", marginTop: 10 }),
      k.btn("Bosh sahifaga", [{ type: "navigate", screen: "scr_home" }], { borderRadius: 999 }, "ghost"),
    ]),
  ], { background: c.bg });

  // ----- orders -----
  const statusText = "item.status == 'accepted' ? 'Qabul qilindi' : item.status == 'delivered' ? 'Yetkazildi' : item.status == 'cancelled' ? 'Bekor qilindi' : 'Yangi'";
  const statusColor = "item.status == 'accepted' ? '#1c7ed6' : item.status == 'delivered' ? '#2f9e44' : item.status == 'cancelled' ? '#e03131' : '#f08c00'";
  const orders = k.screen("scr_orders", "Buyurtmalar", [
    k.body([
      k.text("Buyurtmalarim", "h2", {}, true),
      k.list(
        "collections.orders",
        [
          k.card([
            k.row({ justifyContent: "space-between" }, [
              k.text("#{{ item._number }}", "h3"),
              k.badge(`{{ ${statusText} }}`, { background: `{{ ${statusColor} }}22`, color: `{{ ${statusColor} }}` }),
            ]),
            k.text("{{ join(map(item.items, 'name')) }}", undefined, { color: c.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
            k.row({ justifyContent: "space-between" }, [k.muted("{{ date(item._at) }}"), k.text("{{ fmt(item.total) }} so'm", undefined, { fontWeight: 800, color: c.primary })]),
          ]),
        ],
        { gap: 10 },
        "Hali buyurtma yo'q. Birinchisini bering!",
      ),
    ]),
    k.spacer(),
    tab("scr_orders"),
  ], { background: c.bg });

  // ----- info -----
  const infoRow = (ic: string, label: string, value: string, e?: Action[]) =>
    k.row({ gap: 12, padding: "12px 14px", background: c.surface, borderRadius: R, border: `1px solid ${c.line}`, cursor: e ? "pointer" : "default" }, [
      k.box({ width: 40, height: 40, borderRadius: 20, background: c.primary + "14", alignItems: "center", justifyContent: "center", flex: "none" }, [k.icon(ic, 20, c.primary, "duotone")]),
      k.box({ gap: 1, flex: 1, minWidth: 0 }, [k.muted(label, { fontSize: 12 }), k.text(value, undefined, { fontWeight: 600 })]),
      ...(e ? [k.icon("caret-right", 18, c.muted)] : []),
    ], e);
  const info = k.screen("scr_info", "Ma'lumot", [
    k.hero(cfg.hero.image, 150, [k.text(cfg.name, "h1", { color: "#fff", ...(cfg.heading ? { fontFamily: cfg.heading } : {}) })]),
    k.body([
      k.text(cfg.info.about, undefined, { color: c.muted, lineHeight: 1.55 }),
      infoRow("clock", "Ish vaqti", cfg.info.hours),
      infoRow("map-pin", "Manzil", cfg.info.address),
      infoRow("phone", "Telefon", cfg.info.phone, [{ type: "openLink", url: `tel:${cfg.info.phone.replace(/\s/g, "")}` }]),
      infoRow("paper-plane-tilt", "Telegram", cfg.info.telegram, [{ type: "openLink", url: `https://t.me/${cfg.info.telegram.replace("@", "")}` }]),
      infoRow("truck", "Yetkazib berish", `${cfg.deliveryFee ? `${cfg.deliveryFee.toLocaleString("en-US").replace(/,/g, " ")} so'm` : "Bepul"}, ${cfg.freeFrom.toLocaleString("en-US").replace(/,/g, " ")} so'mdan yuqori buyurtmada bepul`),
    ]),
    k.spacer(),
    tab("scr_info"),
  ], { background: c.bg });

  return {
    name: cfg.name,
    theme: { primary: c.primary, background: c.bg, text: c.text, radius: R, font: cfg.font },
    state: { cart: [], cat: "all", sel: {}, qty: 1, opt: cfg.option?.initial ?? "", note: "", mode: "delivery", pay: "cash", name: "", phone: "", address: "", comment: "", orderId: "" },
    collections: [
      { name: "categories", label: "Bo'limlar", mode: "static", fields: [{ name: "id", type: "text" }, { name: "name", type: "text", label: "Nomi" }], data: cfg.categories },
      {
        name: "products",
        label: "Mahsulotlar",
        mode: "static",
        fields: [
          { name: "id", type: "text" },
          { name: "name", type: "text", label: "Nomi" },
          { name: "price", type: "money", label: "Narxi" },
          { name: "category", type: "relation", ref: "categories", label: "Bo'lim" },
          { name: "image", type: "image", label: "Rasm" },
          { name: "desc", type: "text", label: "Tavsif" },
          { name: "tag", type: "text", label: "Belgi" },
        ],
        data: cfg.products.map((p) => ({ ...p })),
      },
      {
        name: "orders",
        label: "Buyurtmalar",
        mode: "records",
        fields: [
          { name: "items", type: "list", label: "Mahsulotlar" },
          { name: "total", type: "money", label: "Jami" },
          { name: "mode", type: "select", options: ["delivery", "pickup"], label: "Usul" },
          { name: "name", type: "text", label: "Mijoz" },
          { name: "phone", type: "phone", label: "Telefon" },
          { name: "address", type: "text", label: "Manzil" },
          { name: "pay", type: "select", options: ["cash", "click", "payme"], label: "To'lov" },
          { name: "note", type: "text", label: "Izoh" },
          { name: "status", type: "select", options: ["new", "accepted", "delivered", "cancelled"], label: "Holat" },
        ],
      },
    ],
    screens: [home, item, cart, checkout, done, orders, info],
    bot: {
      welcomeText: cfg.bot.welcome,
      buttonText: cfg.bot.button,
      messages: [{ id: "katalog", text: cfg.bot.ask, buttons: [[{ text: cfg.bot.button, app: true }]] }],
      commands: [{ command: "menu", description: "Katalogni ochish", to: "katalog" }],
      keywords: [{ match: "narx", to: "katalog" }],
      ownerAlerts: [{ collection: "orders", acceptText: "✅ Buyurtmangiz qabul qilindi. Tez orada tayyor bo'ladi.", rejectText: "❌ Kechirasiz, buyurtmani qabul qila olmaymiz. Operator siz bilan bog'lanadi." }],
    },
  };
}
