import type { AppDoc, UINode } from "./types";
import { cafeTemplate } from "./template";
import { barberTemplate, courseTemplate } from "./templates";
import type { Locale } from "../i18n/config";

/**
 * Ready-made starting points shown on the dashboard: one tap creates a project from them (no AI cost), then the person
 * edits with AI as usual. Two shapes: a catalog with a cart (shops, cafes) and a list of services with a request form.
 */
export interface TemplateMeta {
  id: string;
  /** Phosphor icon component name (resolved on the client) */
  icon: string;
  label: Record<Locale, string>;
  hint: Record<Locale, string>;
}

const L = (uz: string, ru: string, en: string, kaa: string): Record<Locale, string> => ({ uz, ru, en, kaa });

export const TEMPLATES: TemplateMeta[] = [
  { id: "cafe", icon: "Coffee", label: L("Kafe", "Кафе", "Cafe", "Kafe"), hint: L("Menyu, savat, yetkazib berish", "Меню, корзина, доставка", "Menu, cart, delivery", "Menyu, sebet, jetkizip beriw") },
  { id: "flowers", icon: "FlowerTulip", label: L("Gul do‘koni", "Цветочный магазин", "Flower shop", "Gúl dúkanı"), hint: L("Buketlar katalogi va buyurtma", "Каталог букетов и заказ", "Bouquet catalog and orders", "Buketler katalogı hám buyırtpa") },
  { id: "fashion", icon: "TShirt", label: L("Kiyim do‘koni", "Магазин одежды", "Clothing store", "Kiyim dúkanı"), hint: L("Kiyimlar katalogi va savat", "Каталог одежды и корзина", "Clothing catalog and cart", "Kiyimler katalogı hám sebet") },
  { id: "bakery", icon: "Cake", label: L("Qandolatxona", "Кондитерская", "Bakery", "Qandolatxana"), hint: L("Tortlar va shirinliklar", "Торты и сладости", "Cakes and sweets", "Tortlar hám tátliler") },
  { id: "barber", icon: "Scissors", label: L("Sartaroshxona", "Барбершоп", "Barbershop", "Shashtarazxana"), hint: L("Xizmatlar va yozilish", "Услуги и запись", "Services and booking", "Xızmetler hám jazılıw") },
  { id: "courses", icon: "GraduationCap", label: L("O‘quv markazi", "Учебный центр", "Learning center", "Oqıw orayı"), hint: L("Kurslar va ariza", "Курсы и заявка", "Courses and sign-up", "Kurslar hám arza") },
  { id: "carservice", icon: "Wrench", label: L("Avtoservis", "Автосервис", "Car service", "Avtoservis"), hint: L("Xizmat narxlari va navbat", "Цены и запись в очередь", "Prices and appointments", "Xızmet bahaları hám nawbet") },
  { id: "beauty", icon: "Sparkle", label: L("Go‘zallik saloni", "Салон красоты", "Beauty salon", "Kelbet salonı"), hint: L("Xizmatlar va vaqtga yozilish", "Услуги и запись на время", "Services and time booking", "Xızmetler hám waqıtqa jazılıw") },
];

/* ---------- catalog + cart (built from the cafe app) ---------- */

interface Shop {
  name: string;
  accent: string;
  bg: string;
  screenName: string;
  hello: string;
  noun: { empty: string; cartHint: string };
  items: { name: string; price: number; desc: string }[];
  welcome: string;
  button: string;
}

const without = (nodes: UINode[], id: string): UINode[] => nodes.filter((n) => n.id !== id).map((n) => (n.children ? { ...n, children: without(n.children, id) } : n));

function shop(s: Shop): AppDoc {
  let json = JSON.stringify(cafeTemplate(s.name));
  json = json.split("#e8590c").join(s.accent).split("#fff8f3").join(s.bg).split("232,89,12").join(hexToRgb(s.accent));
  const doc = JSON.parse(json) as AppDoc;
  doc.screens = doc.screens.map((scr) => ({ ...scr, children: without(scr.children ?? [], "img_product") }));
  const products = doc.collections.find((c) => c.name === "products")!;
  products.data = s.items.map((it, i) => ({ id: `p${i + 1}`, name: it.name, price: it.price, desc: it.desc, image: "" }));
  const menu = doc.screens[0];
  menu.name = s.screenName;
  if (menu.props) menu.props.title = s.screenName;
  const txt = JSON.stringify(doc)
    .split("Salom, {{ user.firstName }}! Nima buyurtma qilamiz?").join(s.hello)
    .split("Hozircha taomlar yo'q").join(s.noun.empty)
    .split("Savatga taom qo'shing va telefon raqamni kiriting").join(s.noun.cartHint)
    .split("Menyuga qaytish").join("Katalogga qaytish");
  const out = JSON.parse(txt) as AppDoc;
  out.bot = {
    ...out.bot!,
    welcomeText: s.welcome,
    buttonText: s.button,
    messages: [{ id: "menyu", text: `${s.name} 👇`, buttons: [[{ text: s.button, app: true }]] }],
  };
  return out;
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/* ---------- services + request form ---------- */

interface Service {
  name: string;
  accent: string;
  bg: string;
  hello: string;
  serviceWord: string;
  formTitle: string;
  items: { name: string; price: number; duration: string }[];
  welcome: string;
  button: string;
  whenHint: string;
  done: string;
}

function services(s: Service): AppDoc {
  const card = (id: string, children: UINode[]): UINode => ({ id, type: "Box", style: { background: "#ffffff", borderRadius: 18, padding: 14, gap: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }, children });
  return {
    name: s.name,
    theme: { primary: s.accent, background: s.bg, text: "#1b1b1f", radius: 16, font: "Inter, system-ui, sans-serif" },
    state: { service: "", name: "", phone: "", when: "", bookingId: "" },
    collections: [
      {
        name: "services",
        mode: "static",
        fields: [
          { name: "id", type: "string" },
          { name: "name", type: "string" },
          { name: "price", type: "number" },
          { name: "duration", type: "string" },
        ],
        data: s.items.map((it, i) => ({ id: `s${i + 1}`, ...it })),
      },
      {
        name: "bookings",
        mode: "records",
        fields: [
          { name: "service", type: "string" },
          { name: "name", type: "string" },
          { name: "phone", type: "string" },
          { name: "when", type: "string" },
        ],
      },
    ],
    screens: [
      {
        id: "scr_home",
        type: "Screen",
        name: "Xizmatlar",
        props: { title: s.name },
        children: [
          {
            id: "box_head",
            type: "Box",
            style: { gap: 2 },
            children: [
              { id: "txt_title", type: "Text", props: { text: s.name, variant: "h1" } },
              { id: "txt_sub", type: "Text", props: { text: s.hello, variant: "caption" } },
            ],
          },
          {
            id: "lst_services",
            type: "List",
            props: { source: "collections.services", emptyText: "Hozircha xizmatlar yo'q" },
            style: { gap: 12 },
            children: [
              card("box_service", [
                {
                  id: "row_service",
                  type: "Row",
                  style: { justifyContent: "space-between", alignItems: "center" },
                  children: [
                    {
                      id: "box_service_text",
                      type: "Box",
                      style: { gap: 2 },
                      children: [
                        { id: "txt_service_name", type: "Text", props: { text: "{{ item.name }}", variant: "h3" } },
                        { id: "txt_service_meta", type: "Text", props: { text: "{{ fmt(item.price) }} so'm · {{ item.duration }}", variant: "caption" } },
                      ],
                    },
                    {
                      id: "btn_pick",
                      type: "Button",
                      props: { text: "Yozilish" },
                      style: { padding: "10px 14px" },
                      events: { onClick: [{ type: "setState", key: "service", value: "item.name" }, { type: "haptic", style: "light" }, { type: "navigate", screen: "scr_form" }] },
                    },
                  ],
                },
              ]),
            ],
          },
        ],
      },
      {
        id: "scr_form",
        type: "Screen",
        name: s.formTitle,
        props: { title: s.formTitle },
        children: [
          {
            id: "row_form_head",
            type: "Row",
            children: [
              { id: "btn_back", type: "Button", props: { text: "←", variant: "ghost" }, style: { padding: "6px 10px" }, events: { onClick: [{ type: "back" }] } },
              { id: "txt_form_title", type: "Text", props: { text: s.formTitle, variant: "h2" } },
            ],
          },
          { id: "txt_chosen", type: "Text", props: { text: `${s.serviceWord}: {{ state.service }}`, variant: "h3" } },
          { id: "inp_name", type: "Input", props: { bind: "name", placeholder: "Ismingiz" } },
          { id: "inp_phone", type: "Input", props: { bind: "phone", placeholder: "Telefon raqam (+998...)", inputType: "tel" } },
          { id: "inp_when", type: "Input", props: { bind: "when", placeholder: s.whenHint } },
          { id: "spc_1", type: "Spacer" },
          {
            id: "btn_send",
            type: "Button",
            props: { text: "Yuborish" },
            style: { padding: "15px 16px" },
            events: {
              onClick: [
                {
                  type: "if",
                  cond: "len(state.phone) < 9 || len(state.name) < 2",
                  then: [{ type: "haptic", style: "error" }, { type: "alert", text: "Ismingiz va telefon raqamingizni kiriting" }],
                  else: [
                    { type: "dbInsert", collection: "bookings", value: "{ service: state.service, name: state.name, phone: state.phone, when: state.when, user: user }", saveIdTo: "bookingId" },
                    { type: "notifyOwner", text: "🆕 Yangi so'rov #{{ last }}\n{{ state.service }}\nIsm: {{ state.name }}\nTel: {{ state.phone }}\nVaqt: {{ state.when }}" },
                    { type: "haptic", style: "success" },
                    { type: "navigate", screen: "scr_done" },
                  ],
                },
              ],
            },
          },
        ],
      },
      {
        id: "scr_done",
        type: "Screen",
        name: "Tayyor",
        style: { justifyContent: "center", alignItems: "center", textAlign: "center" },
        children: [
          { id: "ico_done", type: "Icon", props: { name: "check-circle", size: 72, color: "#2f9e44", weight: "fill" } },
          { id: "txt_done", type: "Text", props: { text: s.done, variant: "h2" } },
          { id: "txt_done_sub", type: "Text", props: { text: "So'rov raqami: {{ state.bookingId }}", variant: "caption" } },
          { id: "btn_done_home", type: "Button", props: { text: "Xizmatlarga qaytish", variant: "secondary" }, events: { onClick: [{ type: "navigate", screen: "scr_home" }] } },
        ],
      },
    ],
    bot: {
      welcomeText: s.welcome,
      buttonText: s.button,
      messages: [{ id: "menyu", text: `${s.name} 👇`, buttons: [[{ text: s.button, app: true }]] }],
      commands: [{ command: "menu", description: "Ilovani ochish", to: "menyu" }],
      keywords: [{ match: "narx", to: "menyu" }],
      ownerAlerts: [{ collection: "bookings", acceptText: "✅ So'rovingiz qabul qilindi, tez orada bog'lanamiz.", rejectText: "❌ Kechirasiz, bu vaqtga yozib bo'lmaydi. Boshqa vaqt tanlang." }],
    },
  };
}

/* ---------- the catalog ---------- */

const BUILDERS: Record<string, () => AppDoc> = {
  cafe: () => cafeTemplate("Lazzat Kafe"),
  flowers: () =>
    shop({
      name: "Gul Bazar", accent: "#d6336c", bg: "#fff5f8", screenName: "Buketlar", hello: "Salom, {{ user.firstName }}! Qaysi buketni tanlaymiz?",
      noun: { empty: "Hozircha buketlar yo'q", cartHint: "Savatga buket qo'shing va telefon raqamni kiriting" },
      items: [
        { name: "Qizil atirgullar (15 dona)", price: 320000, desc: "Klassik sovg'a buketi" },
        { name: "Pion va ranunkulus", price: 410000, desc: "Mavsumiy yumshoq buket" },
        { name: "Lola buketi (25 dona)", price: 260000, desc: "Bahor kayfiyati" },
        { name: "Qutidagi gullar", price: 380000, desc: "Hadya qutisida, kartochka bilan" },
      ],
      welcome: "Assalomu alaykum! Gul Bazar katalogini ochish uchun pastdagi tugmani bosing 👇", button: "Katalog",
    }),
  fashion: () =>
    shop({
      name: "Moda Uyi", accent: "#1c7ed6", bg: "#f4f8fd", screenName: "Katalog", hello: "Salom, {{ user.firstName }}! Nima tanlaymiz?",
      noun: { empty: "Hozircha mahsulotlar yo'q", cartHint: "Savatga mahsulot qo'shing va telefon raqamni kiriting" },
      items: [
        { name: "Oversize futbolka", price: 129000, desc: "100% paxta, M–XL" },
        { name: "Klassik jinsi", price: 289000, desc: "To'g'ri kesim, 28–36" },
        { name: "Yengil kurtka", price: 459000, desc: "Shamoldan himoya, S–XL" },
        { name: "Sport krossovka", price: 399000, desc: "Yengil, 38–45" },
      ],
      welcome: "Assalomu alaykum! Moda Uyi katalogini ochish uchun pastdagi tugmani bosing 👇", button: "Katalog",
    }),
  bakery: () =>
    shop({
      name: "Shirin Tort", accent: "#a5522d", bg: "#fdf6f0", screenName: "Shirinliklar", hello: "Salom, {{ user.firstName }}! Bugun nima totamiz?",
      noun: { empty: "Hozircha shirinliklar yo'q", cartHint: "Savatga shirinlik qo'shing va telefon raqamni kiriting" },
      items: [
        { name: "Napoleon torti", price: 180000, desc: "1 kg, qatlamli krem" },
        { name: "Shokoladli tort", price: 210000, desc: "1 kg, belgiyalik shokolad" },
        { name: "Makaron to'plami", price: 95000, desc: "12 dona, aralash ta'mlar" },
        { name: "Kruassan (6 dona)", price: 60000, desc: "Har kuni yangi pishgan" },
      ],
      welcome: "Assalomu alaykum! Shirin Tort shirinliklarini ko'rish uchun pastdagi tugmani bosing 👇", button: "Shirinliklar",
    }),
  barber: () => barberTemplate("Barber House"),
  courses: () => courseTemplate("Bilim Markazi"),
  carservice: () =>
    services({
      name: "Avto Servis", accent: "#e03131", bg: "#fdf5f5", hello: "Salom, {{ user.firstName }}! Xizmatni tanlang va navbat oling.", serviceWord: "Xizmat", formTitle: "Navbat",
      items: [
        { name: "Moy almashtirish", price: 120000, duration: "30 daqiqa" },
        { name: "Kompyuter diagnostikasi", price: 150000, duration: "45 daqiqa" },
        { name: "G'ildirak balansirovkasi", price: 80000, duration: "40 daqiqa" },
        { name: "Tormoz kolodkalari", price: 200000, duration: "60 daqiqa" },
      ],
      welcome: "Assalomu alaykum! Avto Servis'ga navbat olish uchun pastdagi tugmani bosing 👇", button: "Navbat", whenHint: "Mashina rusumi va qulay vaqt", done: "Rahmat! Navbat so'rovingiz qabul qilindi",
    }),
  beauty: () =>
    services({
      name: "Nilufar Salon", accent: "#c2255c", bg: "#fff5f9", hello: "Salom, {{ user.firstName }}! Xizmatni tanlang va vaqtga yoziling.", serviceWord: "Xizmat", formTitle: "Yozilish",
      items: [
        { name: "Manikyur", price: 70000, duration: "60 daqiqa" },
        { name: "Pedikyur", price: 90000, duration: "75 daqiqa" },
        { name: "Soch turmagi", price: 120000, duration: "60 daqiqa" },
        { name: "Yuz tozalash", price: 150000, duration: "70 daqiqa" },
      ],
      welcome: "Assalomu alaykum! Nilufar Salon'ga yozilish uchun pastdagi tugmani bosing 👇", button: "Yozilish", whenHint: "Qulay vaqt (masalan: shanba 11:00)", done: "Rahmat! So'rovingiz qabul qilindi",
    }),
};

export function isTemplateId(id: unknown): id is string {
  return typeof id === "string" && Object.hasOwn(BUILDERS, id);
}

/** A fresh document (ids are unique per call site, so every project gets its own copy). */
export function buildTemplate(id: string): AppDoc | null {
  return isTemplateId(id) ? BUILDERS[id]() : null;
}
