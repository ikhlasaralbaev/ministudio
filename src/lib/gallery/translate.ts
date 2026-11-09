import type { AppDoc } from "../types";
import type { Locale } from "../../i18n/config";
import CATALOG from "../../i18n/tpl";

/**
 * Templates are written in Uzbek. A template created while another language is selected gets its text translated
 * from a catalog keyed by the Uzbek string (the same idea as the platform's own `x()`): the same string is translated the same
 * way everywhere, so a category chip and the filter expression that compares against it stay in step.
 * Anything missing from the catalog stays Uzbek. Names of people and brands are listed with "=" (kept as they are).
 */
export type TplEntry = [kaa: string, en: string, ru: string];
const IDX: Record<Exclude<Locale, "uz">, number> = { kaa: 0, en: 1, ru: 2 };

/** keys whose value is never text: ids, links, colors, expressions' targets, enums */
const SKIP = new Set([
  "id", "type", "style", "image", "src", "url", "icon", "color", "primary", "background", "font", "aspect", "variant", "weight",
  "mode", "source", "bind", "collection", "screen", "key", "provider", "to", "ref", "inputType", "saveIdTo", "bookingId", "orderId", "command", "match",
  "visibleIf", "cond", "amount", "index",
]);
/** keys whose value is an expression: only its quoted literals are text */
const EXPR = new Set(["value", "initial"]);

const isTechnical = (s: string) =>
  !/\p{L}/u.test(s) || /^[a-z][A-Za-z0-9_.\-]*$/.test(s) || /^(https?:|#|data:|@\w+$)/.test(s) || /^[\d:.,\s/+-]+$/.test(s) || /^\d+ ?(GB|sm)$/.test(s) || /^[A-Z]{1,3}$/.test(s);

type Look = (uz: string) => string;
interface Ctx {
  /** the translation of a string (recorded as "needed" when extracting) */
  look: Look;
  /** a whole-string catalog entry if there is one (never counts as "needed"): lets a template be reordered for a language */
  exact: (uz: string) => string | undefined;
}

function inExpr(s: string, c: Ctx): string {
  return s.replace(/'([^'\\]*)'/g, (m, lit: string) => (isTechnical(lit) ? m : `'${c.look(lit)}'`));
}

function inTemplate(s: string, c: Ctx): string {
  return s
    .split(/(\{\{[\s\S]*?\}\})/)
    .map((part) => {
      if (part.startsWith("{{")) return inExpr(part, c);
      const t = part.trim();
      if (!t || isTechnical(t)) return part;
      return part.replace(t, c.look(t));
    })
    .join("");
}

function tx(s: string, key: string, c: Ctx): string {
  if (isTechnical(s)) return s;
  if (s.includes("{{")) return c.exact(s) ?? inTemplate(s, c);
  if (EXPR.has(key)) return inExpr(s, c);
  return c.look(s);
}

function mapDoc<T>(v: T, key: string, c: Ctx): T {
  if (typeof v === "string") return tx(v, key, c) as T;
  if (Array.isArray(v)) return v.map((x) => mapDoc(x, key, c)) as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = SKIP.has(k) ? x : mapDoc(x, k, c);
    return out as T;
  }
  return v;
}

/** Every Uzbek string of a template that needs a translation (used to keep the catalog complete). */
export function templateStrings(doc: AppDoc): Set<string> {
  const found = new Set<string>();
  mapDoc(doc, "", {
    look: (s) => (byRule(s, 0) === null && found.add(s), s),
    exact: () => undefined,
  });
  return found;
}

const UNIT: Record<string, [kaa: string, en: string, ru: string]> = {
  daqiqa: ["minut", "min", "мин"],
  soat: ["saat", "h", "ч"],
  oy: ["ay", "months", "мес"],
  kun: ["kún", "days", "дн"],
};
const REVIEWS: Record<string, [string, string, string]> = {
  sharh: ["sholıw", "reviews", "отзывов"],
  mijoz: ["klient", "clients", "клиентов"],
  bemor: ["pasient", "patients", "пациентов"],
  bitiruvchi: ["pitkeriwshi", "graduates", "выпускников"],
  buyurtma: ["buyırtpa", "orders", "заказов"],
  "a'zo": ["aǵza", "members", "участников"],
};
const STREET: Record<string, [string, string, string]> = {
  Berdaq: ["Berdaq", "Berdaq", "Бердаха"],
  Dosnazarov: ["Dosnazarov", "Dosnazarov", "Досназарова"],
  "Amir Temur": ["Amir Temur", "Amir Temur", "Амира Темура"],
  Ajiniyoz: ["Ájiniyaz", "Ajiniyoz", "Ажинияза"],
  Qirqqiz: ["Qırqqız", "Qirqqiz", "Кыркыз"],
  "Qoraqalpog'iston": ["Qaraqalpaqstan", "Karakalpakstan", "Каракалпакстан"],
  Sport: ["Sport", "Sport", "Спортивная"],
  Sanoat: ["Ónersip", "Industrial", "Промышленная"],
  Bozor: ["Bazar", "Market", "Рыночная"],
  Tinchlik: ["Tınıshlıq", "Peace", "Мира"],
  Yoshlik: ["Jaslıq", "Youth", "Молодёжная"],
  Gulshan: ["Gúlshan", "Gulshan", "Гулшан"],
  "Xalqlar do'stligi": ["Xalıqlar dostlıǵı", "Friendship of Peoples", "Дружбы народов"],
};
const NUM = "[\\d\\s]+";

/** Strings built from numbers (hours, durations, ratings, delivery terms): translated by pattern, not one by one. */
function byRule(s: string, i: number): string | null {
  let m = s.match(/^(\d+(?:\.\d+)?) (daqiqa|soat|oy|kun)$/);
  if (m) return `${m[1]} ${UNIT[m[2]][i]}`;
  m = s.match(/^(Har kuni|Du–Sha) (.+)$/);
  if (m && /^[\d:]/.test(m[2])) return `${[["Hár kúni", "Du–Sh"], ["Daily", "Mon–Sat"], ["Ежедневно", "Пн–Сб"]][i][m[1] === "Har kuni" ? 0 : 1]} ${m[2]}`;
  m = s.match(/^([\d.]+) · (\d+) dan ortiq (sharh|mijoz|bemor|bitiruvchi|buyurtma|a'zo)$/);
  if (m) return `${m[1]} · ${m[2]}+ ${REVIEWS[m[3]][i]}`;
  m = s.match(new RegExp(`^(${NUM}) so'm, (${NUM}) so'mdan yuqori buyurtmada bepul$`));
  if (m) return [`${m[1]} sum, ${m[2]} sumnan joqarı buyırtpada biypul`, `${m[1]} UZS, free for orders over ${m[2]} UZS`, `${m[1]} сум, бесплатно при заказе от ${m[2]} сум`][i];
  m = s.match(/^Telefon: (.+)$/);
  if (m) return `${["Telefon", "Phone", "Телефон"][i]}: ${m[1]}`;
  m = s.match(/^Nukus sh\., (.+) ko'chasi (\d+)$/);
  if (m) {
    const st = STREET[m[1]]?.[i] ?? m[1];
    return [`Nókis q., ${st} kóshesi ${m[2]}`, `${m[2]} ${st} St., Nukus`, `г. Нукус, ул. ${st}, ${m[2]}`][i];
  }
  return null;
}

export function translateDoc(doc: AppDoc, locale: Locale): AppDoc {
  if (locale === "uz") return doc;
  const i = IDX[locale];
  const entry = (s: string) => (CATALOG as Record<string, TplEntry>)[s]?.[i];
  return mapDoc(doc, "", {
    look: (s) => {
      const t = entry(s);
      if (t) return t === "=" ? s : t;
      return byRule(s, i) ?? s;
    },
    exact: (s) => {
      const t = entry(s);
      return t && t !== "=" ? t : undefined;
    },
  });
}
