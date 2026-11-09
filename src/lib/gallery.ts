import type { AppDoc } from "./types";
import { bakeryShop, cafeShop, fashionShop, flowerShop } from "./gallery/shops";
import { barberService, beautyService, carService, courseService } from "./gallery/services";
import { electronicsShop, bookShop, groceryShop, pharmacyShop, pizzaShop, sushiShop } from "./gallery/shops2";
import { cleaningService, dentalService, gymService, photoService, spaService, vetService } from "./gallery/services2";
import type { Locale } from "../i18n/config";
import { translateDoc } from "./gallery/translate";

/**
 * Ready-made starting points shown on the dashboard: one tap creates a project from them (no AI cost), then the person
 * edits with AI as usual. Two shapes: a catalog with a cart (shops, cafes) and a list of services with a request form.
 */
export type TemplateGroup = "food" | "shop" | "beauty" | "health" | "services";

export interface TemplateMeta {
  id: string;
  group: TemplateGroup;
  /** Phosphor icon component name (resolved on the client) */
  icon: string;
  label: Record<Locale, string>;
  hint: Record<Locale, string>;
}

const L = (uz: string, ru: string, en: string, kaa: string): Record<Locale, string> => ({ uz, ru, en, kaa });

export const TEMPLATES: TemplateMeta[] = [
  { id: "cafe", group: "food", icon: "Coffee", label: L("Kafe", "Кафе", "Cafe", "Kafe"), hint: L("Menyu, savat, yetkazib berish", "Меню, корзина, доставка", "Menu, cart, delivery", "Menyu, sebet, jetkizip beriw") },
  { id: "flowers", group: "shop", icon: "FlowerTulip", label: L("Gul do‘koni", "Цветочный магазин", "Flower shop", "Gúl dúkanı"), hint: L("Buketlar katalogi va buyurtma", "Каталог букетов и заказ", "Bouquet catalog and orders", "Buketler katalogı hám buyırtpa") },
  { id: "fashion", group: "shop", icon: "TShirt", label: L("Kiyim do‘koni", "Магазин одежды", "Clothing store", "Kiyim dúkanı"), hint: L("Kiyimlar katalogi va savat", "Каталог одежды и корзина", "Clothing catalog and cart", "Kiyimler katalogı hám sebet") },
  { id: "bakery", group: "food", icon: "Cake", label: L("Qandolatxona", "Кондитерская", "Bakery", "Qandolatxana"), hint: L("Tortlar va shirinliklar", "Торты и сладости", "Cakes and sweets", "Tortlar hám tátliler") },
  { id: "barber", group: "beauty", icon: "Scissors", label: L("Sartaroshxona", "Барбершоп", "Barbershop", "Shashtarazxana"), hint: L("Xizmatlar va yozilish", "Услуги и запись", "Services and booking", "Xızmetler hám jazılıw") },
  { id: "courses", group: "services", icon: "GraduationCap", label: L("O‘quv markazi", "Учебный центр", "Learning center", "Oqıw orayı"), hint: L("Kurslar va ariza", "Курсы и заявка", "Courses and sign-up", "Kurslar hám arza") },
  { id: "carservice", group: "services", icon: "Wrench", label: L("Avtoservis", "Автосервис", "Car service", "Avtoservis"), hint: L("Xizmat narxlari va navbat", "Цены и запись в очередь", "Prices and appointments", "Xızmet bahaları hám nawbet") },
  { id: "beauty", group: "beauty", icon: "Sparkle", label: L("Go‘zallik saloni", "Салон красоты", "Beauty salon", "Kelbet salonı"), hint: L("Xizmatlar va vaqtga yozilish", "Услуги и запись на время", "Services and time booking", "Xızmetler hám waqıtqa jazılıw") },
  { id: "pizza", group: "food", icon: "Pizza", label: L("Pitsa", "Пиццерия", "Pizzeria", "Pitstseriya"), hint: L("Menyu, o‘lcham va yetkazish", "Меню, размер и доставка", "Menu, size and delivery", "Menyu, ólshem hám jetkizip beriw") },
  { id: "sushi", group: "food", icon: "Fish", label: L("Suši", "Суши", "Sushi", "Sushi"), hint: L("Rollar, setlar va buyurtma", "Роллы, сеты и заказ", "Rolls, sets and orders", "Rollar, setler hám buyırtpa") },
  { id: "grocery", group: "food", icon: "Basket", label: L("Oziq-ovqat", "Продукты", "Grocery", "Azıq-awqat"), hint: L("Sabzavot, meva va yetkazish", "Овощи, фрукты и доставка", "Produce and delivery", "Sabzavat, miywe hám jetkizip beriw") },
  { id: "electronics", group: "shop", icon: "DeviceMobile", label: L("Texnika do‘koni", "Магазин техники", "Electronics store", "Texnika dúkanı"), hint: L("Telefon, noutbuk, aksessuar", "Телефоны, ноутбуки, аксессуары", "Phones, laptops, accessories", "Telefon, noutbuk, aksessuar") },
  { id: "books", group: "shop", icon: "BookOpen", label: L("Kitob do‘koni", "Книжный магазин", "Bookstore", "Kitap dúkanı"), hint: L("Kitoblar katalogi va buyurtma", "Каталог книг и заказ", "Book catalog and orders", "Kitaplar katalogı hám buyırtpa") },
  { id: "pharmacy", group: "health", icon: "Pill", label: L("Dorixona", "Аптека", "Pharmacy", "Dorıxana"), hint: L("Vitamin va parvarish", "Витамины и уход", "Vitamins and care", "Vitamin hám párwarish") },
  { id: "gym", group: "beauty", icon: "Barbell", label: L("Sport zal", "Спортзал", "Gym", "Sport zal"), hint: L("Mashg‘ulot va abonement", "Тренировки и абонемент", "Workouts and memberships", "Shınıǵıw hám abonement") },
  { id: "dental", group: "health", icon: "Tooth", label: L("Stomatologiya", "Стоматология", "Dental clinic", "Stomatologiya"), hint: L("Qabulga yozilish", "Запись на приём", "Book an appointment", "Qabılawǵa jazılıw") },
  { id: "photo", group: "services", icon: "Camera", label: L("Foto studiya", "Фотостудия", "Photo studio", "Foto studiya"), hint: L("Paketlar va suratga yozilish", "Пакеты и запись на съёмку", "Packages and booking", "Paketler hám suwretke jazılıw") },
  { id: "cleaning", group: "services", icon: "Broom", label: L("Tozalash xizmati", "Клининг", "Cleaning service", "Tazalaw xızmeti"), hint: L("Tozalash turi va buyurtma", "Виды уборки и заказ", "Cleaning types and orders", "Tazalaw túri hám buyırtpa") },
  { id: "spa", group: "beauty", icon: "FlowerLotus", label: L("Spa va massaj", "Спа и массаж", "Spa and massage", "Spa hám massaj"), hint: L("Muolajalar va vaqtga yozilish", "Процедуры и запись", "Treatments and booking", "Procedurar hám waqıtqa jazılıw") },
  { id: "vet", group: "health", icon: "PawPrint", label: L("Veterinariya", "Ветеринария", "Veterinary clinic", "Veterinariya"), hint: L("Qabul va emlash", "Приём и вакцинация", "Visits and vaccination", "Qabıllaw hám emlew") },
];

/** Filter chips of the template page, in display order. */
export const GROUPS: { id: TemplateGroup; label: Record<Locale, string> }[] = [
  { id: "food", label: L("Ovqat", "Еда", "Food", "Awqat") },
  { id: "shop", label: L("Do‘konlar", "Магазины", "Shops", "Dúkanlar") },
  { id: "beauty", label: L("Go‘zallik va sport", "Красота и спорт", "Beauty and fitness", "Kelbet hám sport") },
  { id: "health", label: L("Salomatlik", "Здоровье", "Health", "Densawlıq") },
  { id: "services", label: L("Xizmatlar", "Услуги", "Services", "Xızmetler") },
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
  pizza: pizzaShop,
  sushi: sushiShop,
  grocery: groceryShop,
  electronics: electronicsShop,
  books: bookShop,
  pharmacy: pharmacyShop,
  gym: gymService,
  dental: dentalService,
  photo: photoService,
  cleaning: cleaningService,
  spa: spaService,
  vet: vetService,
};

export function isTemplateId(id: unknown): id is string {
  return typeof id === "string" && Object.hasOwn(BUILDERS, id);
}

/** A fresh document (ids are unique per call site, so every project gets its own copy), with its text in the given language. */
export function buildTemplate(id: string, locale: Locale = "uz"): AppDoc | null {
  return isTemplateId(id) ? translateDoc(BUILDERS[id](), locale) : null;
}
