import type { AppDoc } from "../types";
import { unsplash as u } from "./kit";
import { shopApp } from "./shop";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

export const cafeShop = (): AppDoc =>
  shopApp({
    name: "Lazzat Kafe",
    palette: { primary: "#e8590c", bg: "#fff8f3", text: "#1f1410", surface: "#ffffff", line: "#f1e3d9", onPrimary: "#ffffff", muted: "#8a7468" },
    radius: 18,
    font: SANS,
    layout: "list",
    hero: { image: u("1504674900247-0877df9cc836", 1000), kicker: "Lazzat Kafe", title: "Mazali taomlar, tez yetkazib berish", sub: "Har kuni yangi tayyorlanadi. 30 daqiqada eshigingizda.", cta: "Menyuni ko'rish" },
    perks: [["truck", "30 daqiqada yetkazamiz"], ["flame", "Har kuni yangi tayyorlanadi"], ["star", "4.9 mijozlar bahosi"]],
    categories: [
      { id: "taom", name: "Taomlar" },
      { id: "salat", name: "Salatlar" },
      { id: "ichimlik", name: "Ichimliklar" },
      { id: "shirin", name: "Shirinliklar" },
    ],
    products: [
      { id: "p1", name: "To'y oshi", price: 38000, category: "taom", image: u("1512058564366-18510be2db19", 700), desc: "Devzira guruchi, mol go'shti, sarimsoq va qo'ziqorin", tag: "Hit" },
      { id: "p2", name: "Lag'mon", price: 32000, category: "taom", image: u("1585032226651-759b368d7246", 700), desc: "Qo'lda cho'zilgan lag'mon, mol go'shti va yangi sabzavotlar" },
      { id: "p3", name: "Shashlik", price: 22000, category: "taom", image: u("1529193591184-b1d58069ecdd", 700), desc: "Mol go'shtidan, piyoz va yangi non bilan, 1 six" },
      { id: "p4", name: "Somsa", price: 9000, category: "taom", image: u("1601050690597-df0568f70950", 700), desc: "Tandirda pishgan, mol go'shtli, qatlamali xamir", tag: "Yangi" },
      { id: "p5", name: "Chizburger", price: 34000, category: "taom", image: u("1568901346375-23c9450c58cd", 700), desc: "Mol go'shtli kotlet, cheddar, yangi sabzavotlar" },
      { id: "p6", name: "Sezar salat", price: 28000, category: "salat", image: u("1546069901-ba9599a7e63c", 700), desc: "Tovuq filesi, parmezan, krutonlar va maxsus sous" },
      { id: "p7", name: "Grill salat", price: 26000, category: "salat", image: u("1540189549336-e6e99c3679fe", 700), desc: "Mavsumiy sabzavotlar, zaytun moyi va limon" },
      { id: "p8", name: "Latte", price: 18000, category: "ichimlik", image: u("1509042239860-f550ce710b93", 700), desc: "Yumshoq sutli kofe, latte art bilan", tag: "Hit" },
      { id: "p9", name: "Limonli muzli choy", price: 12000, category: "ichimlik", image: u("1556679343-c7306c1976bc", 700), desc: "Qora choy, limon va yalpiz" },
      { id: "p10", name: "Banan blinchik", price: 24000, category: "shirin", image: u("1567620905732-2d1ec7ab7445", 700), desc: "Issiq blinchiklar, banan va asal bilan" },
      { id: "p11", name: "Glazurli donat", price: 14000, category: "shirin", image: u("1551024601-bec78aea704b", 700), desc: "Shokolad glazur va rangli sepma" },
    ],
    deliveryFee: 12000,
    freeFrom: 120000,
    info: { hours: "Har kuni 10:00 – 23:00", address: "Nukus sh., Berdaq ko'chasi 12", phone: "+998 90 123 45 67", about: "Lazzat Kafe: oilaviy muhit, milliy va zamonaviy taomlar. Buyurtmani shu yerda bering, qolganini biz qilamiz.", telegram: "@lazzat_kafe" },
    bot: { welcome: "Assalomu alaykum! Lazzat Kafe menyusini ochish uchun pastdagi tugmani bosing 👇", button: "Menyu", ask: "Lazzat Kafe menyusi 👇" },
    words: { items: "ta taom", emptyCart: "Savat hozircha bo'sh" },
  });

export const flowerShop = (): AppDoc =>
  shopApp({
    name: "Gul Bazar",
    palette: { primary: "#d6336c", bg: "#fff7f9", text: "#2b1a20", surface: "#ffffff", line: "#f4dfe6", onPrimary: "#ffffff", muted: "#9a7c86" },
    radius: 22,
    font: SANS,
    heading: SERIF,
    layout: "grid",
    hero: { image: u("1563241527-3004b7be0ffd", 1000), kicker: "Gul Bazar · Nukus", title: "Har bir lahzaga o'z buketi", sub: "Yangi uzilgan gullar, 2 soatda yetkazib beramiz.", cta: "Buketlarni ko'rish" },
    perks: [["truck", "2 soatda yetkazib berish"], ["flower-tulip", "Yangi uzilgan gullar"], ["gift", "Bepul sovg'a kartochkasi"]],
    categories: [
      { id: "buket", name: "Buketlar" },
      { id: "atirgul", name: "Atirgullar" },
      { id: "mavsum", name: "Mavsumiy" },
    ],
    products: [
      { id: "p1", name: "Pion buketi", price: 420000, category: "buket", image: u("1563241527-3004b7be0ffd", 700), desc: "Yumshoq pushti pionlar va evkalipt. Eng nafis sovg'a.", tag: "Yangi" },
      { id: "p2", name: "Aralash bahor buketi", price: 350000, category: "buket", image: u("1487530811176-3780de880c2d", 700), desc: "Atirgul, ranunkulus va mavsumiy gullar uyg'unligi." },
      { id: "p3", name: "Yurak buketi", price: 480000, category: "buket", image: u("1526047932273-341f2a7631f9", 700), desc: "Sevgi izhori uchun: yurak shaklidagi buket.", tag: "Hit" },
      { id: "p4", name: "Qizil atirgullar, 25 dona", price: 520000, category: "atirgul", image: u("1494972308805-463bc619d34e", 700), desc: "Ekvador atirgullari, 60 sm, qadoqlangan.", tag: "Hit" },
      { id: "p5", name: "Kamalak atirgullar, 15 dona", price: 390000, category: "atirgul", image: u("1508610048659-a06b669e3321", 700), desc: "Noyob rangli atirgullar: yorqin va esda qoladigan." },
      { id: "p6", name: "Premium atirgul, 1 dona", price: 45000, category: "atirgul", image: u("1562690868-60bbe7293e94", 700), desc: "Bitta, lekin eng chiroylisi: uzun poyali qizil atirgul." },
      { id: "p7", name: "Lola buketi, 25 dona", price: 260000, category: "mavsum", image: u("1561181286-d3fee7d55364", 700), desc: "Bahor kayfiyati: qo'sh pushti lolalar." },
      { id: "p8", name: "Kungaboqar buketi", price: 280000, category: "mavsum", image: u("1455659817273-f96807779a8a", 700), desc: "Quyoshdek iliq kayfiyat uchun." },
      { id: "p9", name: "Dala gullari", price: 210000, category: "mavsum", image: u("1490750967868-88aa4486c946", 700), desc: "Yorqin sariq gullar: sodda va samimiy." },
    ],
    option: { label: "Qadoqlash", values: ["Oddiy", "Sovg‘a qutisi"], initial: "Oddiy" },
    note: { label: "Kartochka matni", placeholder: "Tug'ilgan kuning bilan, Madina!" },
    deliveryFee: 25000,
    freeFrom: 300000,
    info: { hours: "Har kuni 08:00 – 22:00", address: "Nukus sh., Qoraqalpog'iston ko'chasi 5", phone: "+998 91 555 01 02", about: "Gul Bazar: har kuni yangi uzilgan gullar. Buketni tanlang, kartochka matnini yozing, qolganini bizga qoldiring.", telegram: "@gulbazar_nukus" },
    bot: { welcome: "Assalomu alaykum! Gul Bazar katalogini ochish uchun pastdagi tugmani bosing 💐", button: "Buketlar", ask: "Gul Bazar buketlari 👇" },
    words: { items: "ta buket", emptyCart: "Savatingiz bo'sh" },
  });

export const fashionShop = (): AppDoc =>
  shopApp({
    name: "Moda Uyi",
    palette: { primary: "#1a1a1a", bg: "#fafafa", text: "#111111", surface: "#ffffff", line: "#e8e8ec", onPrimary: "#ffffff", muted: "#77777f" },
    radius: 14,
    font: SANS,
    layout: "grid",
    hero: { image: u("1445205170230-053b83016050", 1000), kicker: "Yangi kolleksiya", title: "Uslubingizni toping", sub: "Sifatli kiyimlar, 3 kunda yetkazib beramiz.", cta: "Kolleksiyani ko'rish" },
    perks: [["truck", "3 kunda yetkazish"], ["arrows-counter-clockwise", "14 kunda qaytarish"], ["shield-check", "Sifat kafolati"]],
    categories: [
      { id: "kiyim", name: "Kiyim" },
      { id: "poyabzal", name: "Poyabzal" },
    ],
    products: [
      { id: "p1", name: "Oversize futbolka", price: 149000, category: "kiyim", image: u("1576566588028-4147f3842f27", 700), desc: "100% paxta, erkin kesim. Kundalik kiyim uchun ideal.", tag: "Hit" },
      { id: "p2", name: "Grafik futbolka", price: 139000, category: "kiyim", image: u("1503342217505-b0a15ec3261c", 700), desc: "Yumshoq mato, yorqin print." },
      { id: "p3", name: "Klassik jinsi", price: 329000, category: "kiyim", image: u("1542272604-787c3835535d", 700), desc: "To'g'ri kesim, chidamli denim." },
      { id: "p4", name: "Charm kurtka", price: 899000, category: "kiyim", image: u("1551028719-00167b16eac5", 700), desc: "Ekologik charm, ichki astarli.", tag: "Yangi" },
      { id: "p5", name: "Trikotaj kofta", price: 359000, category: "kiyim", image: u("1434389677669-e08b4cac3105", 700), desc: "Yengil va issiq, bahor-kuz uchun." },
      { id: "p6", name: "Klassik kostyum", price: 1490000, category: "kiyim", image: u("1594938298603-c8148c4dae35", 700), desc: "Uch qismli, yupqa katak." },
      { id: "p7", name: "Rangli krossovka", price: 579000, category: "poyabzal", image: u("1560769629-975ec94e6a86", 700), desc: "Yengil taglik, kun bo'yi qulay.", tag: "Yangi" },
      { id: "p8", name: "Klassik kedlar", price: 449000, category: "poyabzal", image: u("1525966222134-fcfa99b8ae77", 700), desc: "Qalin taglik, bordo rang." },
      { id: "p9", name: "Qora sport krossovka", price: 619000, category: "poyabzal", image: u("1491553895911-0055eca6402d", 700), desc: "Yugurish va mashg'ulot uchun." },
      { id: "p10", name: "Poshnali tufli", price: 389000, category: "poyabzal", image: u("1519415943484-9fa1873496d4", 700), desc: "Nafis kechki ko'rinish uchun." },
    ],
    option: { label: "O'lcham", values: ["S", "M", "L", "XL"], initial: "M" },
    deliveryFee: 30000,
    freeFrom: 500000,
    info: { hours: "Har kuni 10:00 – 21:00", address: "Nukus sh., Amir Temur ko'chasi 40", phone: "+998 93 700 11 22", about: "Moda Uyi: erkak va ayollar uchun tanlangan kiyimlar. O'lchamni tanlang, buyurtma bering, uyingizga yetkazamiz.", telegram: "@modauyi" },
    bot: { welcome: "Assalomu alaykum! Moda Uyi katalogini ochish uchun pastdagi tugmani bosing 👇", button: "Katalog", ask: "Moda Uyi katalogi 👇" },
    words: { items: "ta mahsulot", emptyCart: "Savat bo'sh" },
  });

export const bakeryShop = (): AppDoc =>
  shopApp({
    name: "Shirin Tort",
    palette: { primary: "#a8552b", bg: "#fdf7f2", text: "#2a1810", surface: "#ffffff", line: "#f2e3d7", onPrimary: "#ffffff", muted: "#8c7365" },
    radius: 24,
    font: SANS,
    heading: SERIF,
    layout: "feature",
    hero: { image: u("1578985545062-69928b1d9587", 1000), kicker: "Shirin Tort · Qandolatxona", title: "Har bayramga o'z torti", sub: "Buyurtma bo'yicha, bugun pishirilgan.", cta: "Shirinliklarni ko'rish" },
    perks: [["cake", "Individual dizayn"], ["clock", "24 soat oldin buyurtma"], ["truck", "Shahar bo'ylab yetkazish"]],
    categories: [
      { id: "tort", name: "Tortlar" },
      { id: "pishiriq", name: "Pishiriqlar" },
      { id: "shirin", name: "Shirinliklar" },
    ],
    products: [
      { id: "p1", name: "Shokoladli tort", price: 220000, category: "tort", image: u("1578985545062-69928b1d9587", 900), desc: "Belgiyalik shokolad, yumshoq biskvit va shokolad kremi. 1 kg.", tag: "Hit" },
      { id: "p2", name: "Malinali tort", price: 240000, category: "tort", image: u("1565958011703-44f9829ba187", 900), desc: "Yangi malina, vanil kremi va yengil biskvit. 1 kg.", tag: "Yangi" },
      { id: "p3", name: "Kruassan, 4 dona", price: 48000, category: "pishiriq", image: u("1555507036-ab1f4038808a", 900), desc: "Sariyog'li, qatlamali, har tong yangi pishadi." },
      { id: "p4", name: "Hunarmand non", price: 28000, category: "pishiriq", image: u("1509440159596-0249088772ff", 900), desc: "Xamirturush asosida, urug'li qobiq bilan." },
      { id: "p5", name: "Cupcake to'plami, 6 dona", price: 90000, category: "shirin", image: u("1563729784474-d77dbb933a9e", 900), desc: "Aralash ta'mlar, krem va dekor bilan." },
      { id: "p6", name: "Pechenye, 12 dona", price: 55000, category: "shirin", image: u("1558961363-fa8fdf82db35", 900), desc: "Shokoladli bo'laklar bilan, issiq-issiq." },
      { id: "p7", name: "Donat to'plami, 4 dona", price: 64000, category: "shirin", image: u("1551024601-bec78aea704b", 900), desc: "Glazur va rangli sepma." },
      { id: "p8", name: "Banan blinchik", price: 36000, category: "shirin", image: u("1567620905732-2d1ec7ab7445", 900), desc: "Asal va banan bilan." },
    ],
    option: { label: "Qadoqlash", values: ["Oddiy", "Sovg‘a qutisi"], initial: "Oddiy" },
    note: { label: "Tortga yozuv (ixtiyoriy)", placeholder: "Tug'ilgan kun muborak, Ali!" },
    deliveryFee: 20000,
    freeFrom: 200000,
    info: { hours: "Har kuni 09:00 – 21:00", address: "Nukus sh., Dosnazarov ko'chasi 18", phone: "+998 94 321 00 99", about: "Shirin Tort: buyurtma bo'yicha tortlar va kundalik pishiriqlar. Tortga yozuv va dizayn istagingizni yozing.", telegram: "@shirintort" },
    bot: { welcome: "Assalomu alaykum! Shirin Tort shirinliklarini ko'rish uchun pastdagi tugmani bosing 🍰", button: "Shirinliklar", ask: "Shirin Tort katalogi 👇" },
    words: { items: "ta mahsulot", emptyCart: "Savat bo'sh" },
  });
