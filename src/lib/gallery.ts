import type { AppDoc } from "./types";
import { bakeryShop, cafeShop, fashionShop, flowerShop } from "./gallery/shops";
import { barberService, beautyService, carService, courseService } from "./gallery/services";
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

/* ---------- the catalog ---------- */

const BUILDERS: Record<string, () => AppDoc> = {
  cafe: cafeShop,
  flowers: flowerShop,
  fashion: fashionShop,
  bakery: bakeryShop,
  barber: barberService,
  courses: courseService,
  carservice: carService,
  beauty: beautyService,
};

export function isTemplateId(id: unknown): id is string {
  return typeof id === "string" && Object.hasOwn(BUILDERS, id);
}

/** A fresh document (ids are unique per call site, so every project gets its own copy). */
export function buildTemplate(id: string): AppDoc | null {
  return isTemplateId(id) ? BUILDERS[id]() : null;
}
