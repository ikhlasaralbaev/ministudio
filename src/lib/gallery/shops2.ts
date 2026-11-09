import type { AppDoc } from "../types";
import { unsplash as u } from "./kit";
import { shopApp } from "./shop";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";

export const pizzaShop = (): AppDoc =>
  shopApp({
    name: "Pizza Fiesta",
    palette: { primary: "#d9480f", bg: "#fff9f4", text: "#241510", surface: "#ffffff", line: "#f3e2d6", onPrimary: "#ffffff", muted: "#8d7468" },
    radius: 20,
    font: SANS,
    layout: "feature",
    hero: { image: u("1513104890138-7c749659a591", 1000), kicker: "Pizza Fiesta", title: "Issiq pitsa, 30 daqiqada", sub: "Tandirda pishadi, issiq holda eshigingizgacha yetib boradi.", cta: "Menyuni ko'rish" },
    perks: [["truck", "30 daqiqada yetkazamiz"], ["flame", "Tandirda pishiriladi"], ["star", "4.9 mijozlar bahosi"]],
    categories: [
      { id: "pitsa", name: "Pitsalar" },
      { id: "yon", name: "Yon taomlar" },
      { id: "ichimlik", name: "Ichimliklar" },
    ],
    products: [
      { id: "p1", name: "Margarita", price: 62000, category: "pitsa", image: u("1574071318508-1cdbab80d002", 900), desc: "Pomidor sousi, mozzarella va yangi rayhon.", tag: "Hit" },
      { id: "p2", name: "Pepperoni", price: 78000, category: "pitsa", image: u("1534308983496-4fabb1a015ee", 900), desc: "Achchiq pepperoni, ko'p pishloq va oregano." },
      { id: "p3", name: "To'rt pishloq", price: 84000, category: "pitsa", image: u("1565299624946-b28f40a0ae38", 900), desc: "Mozzarella, cheddar, parmezan va dor blyu.", tag: "Yangi" },
      { id: "p4", name: "Qo'ziqorinli", price: 72000, category: "pitsa", image: u("1604382354936-07c5d9983bd3", 900), desc: "Shampinyon, zaytun, kolbasa va pishloq." },
      { id: "p5", name: "Sabzavotli", price: 68000, category: "pitsa", image: u("1593560708920-61dd98c46a4e", 900), desc: "Bolgar qalampiri, pomidor, zaytun va yashil barglar." },
      { id: "p6", name: "Sezar salat", price: 28000, category: "yon", image: u("1546069901-ba9599a7e63c", 900), desc: "Tovuq filesi, parmezan va krutonlar." },
      { id: "p7", name: "Chizburger", price: 34000, category: "yon", image: u("1568901346375-23c9450c58cd", 900), desc: "Mol go'shtli kotlet va cheddar." },
      { id: "p8", name: "Muzli limonli choy", price: 12000, category: "ichimlik", image: u("1556679343-c7306c1976bc", 900), desc: "Qora choy, limon va yalpiz." },
      { id: "p9", name: "Latte", price: 18000, category: "ichimlik", image: u("1509042239860-f550ce710b93", 900), desc: "Yumshoq sutli kofe." },
    ],
    option: { label: "O'lcham", values: ["25 sm", "30 sm", "36 sm"], initial: "30 sm" },
    deliveryFee: 12000,
    freeFrom: 150000,
    info: { hours: "Har kuni 10:00 – 00:00", address: "Nukus sh., Qirqqiz ko'chasi 5", phone: "+998 90 777 10 10", about: "Pizza Fiesta: tandirda pishiriladigan pitsalar. O'lchamni tanlang, qolganini biz qilamiz.", telegram: "@pizzafiesta" },
    bot: { welcome: "Assalomu alaykum! Pizza Fiesta menyusini ochish uchun pastdagi tugmani bosing 🍕", button: "Menyu", ask: "Pizza Fiesta menyusi 👇" },
    words: { items: "ta taom", emptyCart: "Savat hozircha bo'sh" },
  });

export const sushiShop = (): AppDoc =>
  shopApp({
    name: "Sakura Sushi",
    palette: { primary: "#e5484d", bg: "#0f1012", text: "#f5f2ee", surface: "#1a1b1e", line: "#2a2b30", onPrimary: "#ffffff", muted: "#a2a1a6" },
    radius: 18,
    font: SANS,
    layout: "grid",
    hero: { image: u("1579584425555-c3ce17fd4351", 1000), kicker: "Sakura Sushi", title: "Yaponcha ta'm, uyingizda", sub: "Yangi baliq, tez yetkazib berish va chiroyli qadoq.", cta: "Menyuni ko'rish" },
    perks: [["fish", "Har kuni yangi baliq"], ["truck", "45 daqiqada yetkazamiz"], ["gift", "Soya sousi va vasabi bepul"]],
    categories: [
      { id: "roll", name: "Rollar" },
      { id: "set", name: "Setlar" },
      { id: "issiq", name: "Issiq taomlar" },
    ],
    products: [
      { id: "p1", name: "Filadelfiya roll", price: 78000, category: "roll", image: u("1579584425555-c3ce17fd4351", 700), desc: "Losos, qaymoqli pishloq va bodring. 8 dona.", tag: "Hit" },
      { id: "p2", name: "Kaliforniya roll", price: 68000, category: "roll", image: u("1579871494447-9811cf80d66c", 700), desc: "Krab, avokado va ikra. 8 dona." },
      { id: "p3", name: "Alanga roll", price: 84000, category: "roll", image: u("1761314025679-1bc4e2f6f7fe", 700), desc: "Gorelkada pishirilgan, achchiq sous bilan.", tag: "Yangi" },
      { id: "p4", name: "Losos suši", price: 54000, category: "roll", image: u("1781478990255-f4f61976a1dc", 700), desc: "Yangi losos va guruch. 6 dona." },
      { id: "p5", name: "Samurai set", price: 249000, category: "set", image: u("1770164520620-a5612325635b", 700), desc: "Uch xil roll va suši, 32 dona, 2-3 kishiga.", tag: "Foydali" },
      { id: "p6", name: "Mini set", price: 139000, category: "set", image: u("1553621042-f6e147245754", 700), desc: "Ikki xil roll, 16 dona, 1-2 kishiga." },
      { id: "p7", name: "Wok tovuq bilan", price: 52000, category: "issiq", image: u("1585032226651-759b368d7246", 700), desc: "Udon lag'mon, sabzavot va teriyaki sousi." },
    ],
    option: { label: "Qo'shimcha", values: ["Oddiy", "Achchiq sous", "Ko‘proq imbir"], initial: "Oddiy" },
    deliveryFee: 15000,
    freeFrom: 200000,
    info: { hours: "Har kuni 11:00 – 23:30", address: "Nukus sh., Dosnazarov ko'chasi 60", phone: "+998 91 222 33 44", about: "Sakura Sushi: yangi tayyorlangan rollar va setlar. Buyurtma bering, biz qadoqlab yetkazamiz.", telegram: "@sakurasushi" },
    bot: { welcome: "Assalomu alaykum! Sakura Sushi menyusini ochish uchun pastdagi tugmani bosing 🍣", button: "Menyu", ask: "Sakura Sushi menyusi 👇" },
    words: { items: "ta taom", emptyCart: "Savat hozircha bo'sh" },
  });

export const groceryShop = (): AppDoc =>
  shopApp({
    name: "Yashil Bozor",
    palette: { primary: "#2b8a3e", bg: "#f6fbf5", text: "#14231a", surface: "#ffffff", line: "#dcebd9", onPrimary: "#ffffff", muted: "#6a806f" },
    radius: 18,
    font: SANS,
    layout: "list",
    hero: { image: u("1542838132-92c53300491e", 1000), kicker: "Yashil Bozor", title: "Yangi mahsulotlar, uyingizgacha", sub: "Fermer sabzavot va mevalari, ertalab terilib, kuni bilan yetkaziladi.", cta: "Xarid qilish" },
    perks: [["truck", "Kunlik yetkazib berish"], ["leaf", "Fermer mahsulotlari"], ["shield-check", "Sifat kafolati"]],
    categories: [
      { id: "sabzavot", name: "Sabzavotlar" },
      { id: "meva", name: "Mevalar" },
      { id: "toplam", name: "To'plamlar" },
    ],
    products: [
      { id: "p1", name: "Aralash sabzavot to'plami", price: 45000, category: "toplam", image: u("1597362925123-77861d3fbac7", 700), desc: "Pomidor, bodring, sabzi va piyoz: 3 kg.", tag: "Hit" },
      { id: "p2", name: "Brokkoli va gul karam", price: 24000, category: "sabzavot", image: u("1590779033100-9f60a05a013d", 700), desc: "Yangi, qattiq boshchalar. 1 kg." },
      { id: "p3", name: "Sabzi va ko'k piyoz", price: 12000, category: "sabzavot", image: u("1471193945509-9ad0617afabf", 700), desc: "Shirin sabzi va yangi ko'k piyoz. 1 kg." },
      { id: "p4", name: "Mavsumiy sabzavotlar", price: 28000, category: "sabzavot", image: u("1518843875459-f738682238a6", 700), desc: "Bugun yig'ilgan, aralash. 2 kg." },
      { id: "p5", name: "Mevalar savati", price: 85000, category: "meva", image: u("1607349913338-fca6f7fc42d0", 700), desc: "Olma, nok, uzum va mandarin: 4 kg.", tag: "Foydali" },
      { id: "p6", name: "Mevalar va sabzavotlar", price: 62000, category: "toplam", image: u("1557844352-761f2565b576", 700), desc: "Haftalik oilaviy to'plam, 6 kg." },
      { id: "p7", name: "Fermer to'plami", price: 98000, category: "toplam", image: u("1579113800032-c38bd7635818", 700), desc: "Tanlangan sabzavotlar, 8 kg.", tag: "Yangi" },
    ],
    option: { label: "Qadoq", values: ["Qog‘oz xalta", "Savat"], initial: "Qog‘oz xalta" },
    note: { label: "Izoh (ixtiyoriy)", placeholder: "Masalan: pishmagan pomidor bo'lsin" },
    deliveryFee: 10000,
    freeFrom: 100000,
    info: { hours: "Har kuni 08:00 – 21:00", address: "Nukus sh., Bozor ko'chasi 3", phone: "+998 94 555 66 77", about: "Yashil Bozor: fermerlardan to'g'ridan-to'g'ri yangi mahsulotlar. Buyurtma bering, bugun yetkazamiz.", telegram: "@yashilbozor" },
    bot: { welcome: "Assalomu alaykum! Yashil Bozor mahsulotlarini ko'rish uchun pastdagi tugmani bosing 🥦", button: "Xarid", ask: "Yashil Bozor 👇" },
    words: { items: "ta mahsulot", emptyCart: "Savat bo'sh" },
  });

export const electronicsShop = (): AppDoc =>
  shopApp({
    name: "Texno Market",
    palette: { primary: "#3b5bdb", bg: "#f5f7fb", text: "#101828", surface: "#ffffff", line: "#e3e8f2", onPrimary: "#ffffff", muted: "#6b7587" },
    radius: 16,
    font: SANS,
    layout: "grid",
    hero: { image: u("1519335553051-96f1218cd5fa", 1000), kicker: "Texno Market", title: "Zamonaviy texnika, halol narx", sub: "Telefon, noutbuk va aksessuarlar. Kafolat va bo'lib to'lash.", cta: "Katalogni ochish" },
    perks: [["shield-check", "12 oy kafolat"], ["truck", "Kunlik yetkazib berish"], ["certificate", "Original mahsulotlar"]],
    categories: [
      { id: "telefon", name: "Telefon va soat" },
      { id: "kompyuter", name: "Kompyuter" },
      { id: "aksessuar", name: "Aksessuarlar" },
    ],
    products: [
      { id: "p1", name: "Smartfon Pro", price: 7490000, category: "telefon", image: u("1519335553051-96f1218cd5fa", 700), desc: "6.1 dyuym ekran, tezkor protsessor va yaxshi kamera.", tag: "Hit" },
      { id: "p2", name: "Aqlli soat", price: 1890000, category: "telefon", image: u("1519335553051-96f1218cd5fa", 701), desc: "Qadam, yurak urishi va xabarnomalar." },
      { id: "p3", name: "Noutbuk Air 13", price: 9890000, category: "kompyuter", image: u("1636115305669-9096bffe87fd", 700), desc: "Yengil, 13 dyuym, kun bo'yi ishlaydigan batareya.", tag: "Yangi" },
      { id: "p4", name: "Noutbuk Work 15", price: 8290000, category: "kompyuter", image: u("1639915008614-7b6797823861", 700), desc: "Ofis va o'qish uchun, katta ekran." },
      { id: "p5", name: "Simsiz quloqchin", price: 690000, category: "aksessuar", image: u("1577048724846-cd9ff1dcacef", 700), desc: "Shovqinni kamaytirish va 30 soat musiqa." },
      { id: "p6", name: "Quloqchin va telefon g'ilofi", price: 420000, category: "aksessuar", image: u("1515940175183-6798529cb860", 700), desc: "Oq quloqchin va himoya g'ilofi to'plami." },
      { id: "p7", name: "Portativ kolonka", price: 540000, category: "aksessuar", image: u("1618166080964-cdb5843979b0", 700), desc: "Suv o'tkazmaydi, 12 soat ishlaydi." },
      { id: "p8", name: "Zaryad va quvvat bloki", price: 190000, category: "aksessuar", image: u("1526406915894-7bcd65f60845", 700), desc: "Tez zaryadlash, bir nechta qurilma uchun." },
    ],
    option: { label: "Xotira", values: ["128 GB", "256 GB", "512 GB"], initial: "128 GB" },
    deliveryFee: 30000,
    freeFrom: 1000000,
    info: { hours: "Har kuni 09:00 – 20:00", address: "Nukus sh., Amir Temur ko'chasi 78", phone: "+998 93 300 40 50", about: "Texno Market: original texnika, kafolat va yetkazib berish. Narx va mavjudligini shu yerdan bilib oling.", telegram: "@texnomarket" },
    bot: { welcome: "Assalomu alaykum! Texno Market katalogini ochish uchun pastdagi tugmani bosing 📱", button: "Katalog", ask: "Texno Market katalogi 👇" },
    words: { items: "ta mahsulot", emptyCart: "Savat bo'sh" },
  });

export const bookShop = (): AppDoc =>
  shopApp({
    name: "Kitob Olami",
    palette: { primary: "#8a5a2b", bg: "#faf6ef", text: "#2a1d12", surface: "#ffffff", line: "#eadfcd", onPrimary: "#ffffff", muted: "#8a7a67" },
    radius: 14,
    font: SANS,
    heading: SERIF,
    layout: "grid",
    hero: { image: u("1462392627162-2baa2b3518a8", 1000), kicker: "Kitob Olami", title: "Yaxshi kitob, yaxshi kun", sub: "Badiiy, o'quv va bolalar kitoblari: tez yetkazib beramiz.", cta: "Kitoblarni ko'rish" },
    perks: [["book-open", "10 000+ kitob"], ["truck", "Shahar bo'ylab yetkazish"], ["gift", "Sovg'a qadoqlash"]],
    categories: [
      { id: "badiiy", name: "Badiiy" },
      { id: "oquv", name: "O'quv" },
      { id: "bolalar", name: "Bolalar" },
    ],
    products: [
      { id: "p1", name: "O'tkan kunlar", price: 69000, category: "badiiy", image: u("1643250048998-7ffa83ae2c63", 700), desc: "Abdulla Qodiriy, o'zbek adabiyoti klassikasi.", tag: "Hit" },
      { id: "p2", name: "Mehrobdan chayon", price: 58000, category: "badiiy", image: u("1462392627162-2baa2b3518a8", 701), desc: "Abdulla Qodiriy, tarixiy roman." },
      { id: "p3", name: "Alkimyogar", price: 64000, category: "badiiy", image: u("1601469090980-fc95e8d95544", 700), desc: "Paulo Koelo, orzu sari sayohat haqida.", tag: "Yangi" },
      { id: "p4", name: "Ingliz tili grammatikasi", price: 85000, category: "oquv", image: u("1566131807516-e3b3cd1a89d1", 700), desc: "Mashqlar va javoblar bilan, boshlang'ich va o'rta daraja." },
      { id: "p5", name: "Matematika masalalari", price: 72000, category: "oquv", image: u("1571688144157-25db897a81ad", 700), desc: "Maktab o'quvchilari uchun to'plam." },
      { id: "p6", name: "Ertaklar to'plami", price: 52000, category: "bolalar", image: u("1536965764833-5971e0abed7c", 700), desc: "Rasmli, katta shriftda. 4 yoshdan." },
      { id: "p7", name: "Bolalar ensiklopediyasi", price: 98000, category: "bolalar", image: u("1700906010457-c7a565935b81", 700), desc: "Hayvonlar, kosmos va tabiat haqida." },
    ],
    option: { label: "Qadoq", values: ["Oddiy", "Sovg‘a uchun"], initial: "Oddiy" },
    note: { label: "Sovg'a yozuvi (ixtiyoriy)", placeholder: "Tug'ilgan kuning bilan!" },
    deliveryFee: 15000,
    freeFrom: 150000,
    info: { hours: "Har kuni 10:00 – 20:00", address: "Nukus sh., Berdaq ko'chasi 51", phone: "+998 91 700 80 90", about: "Kitob Olami: badiiy, o'quv va bolalar kitoblari. Buyurtma bering, uyingizga yetkazamiz.", telegram: "@kitobolami" },
    bot: { welcome: "Assalomu alaykum! Kitob Olami katalogini ochish uchun pastdagi tugmani bosing 📚", button: "Kitoblar", ask: "Kitob Olami 👇" },
    words: { items: "ta kitob", emptyCart: "Savat bo'sh" },
  });

export const pharmacyShop = (): AppDoc =>
  shopApp({
    name: "Salomat Dorixona",
    palette: { primary: "#0c8599", bg: "#f2fafb", text: "#0f2428", surface: "#ffffff", line: "#d6ecef", onPrimary: "#ffffff", muted: "#5f7f86" },
    radius: 16,
    font: SANS,
    layout: "list",
    hero: { image: u("1584017911766-d451b3d0e843", 1000), kicker: "Salomat Dorixona", title: "Sog'liq uchun hamma narsa bir joyda", sub: "Vitaminlar, parvarish va kundalik dori vositalari. Tez yetkazish.", cta: "Katalogni ochish" },
    perks: [["truck", "60 daqiqada yetkazish"], ["shield-check", "Sertifikatli mahsulotlar"], ["clock", "Har kuni ishlaymiz"]],
    categories: [
      { id: "vitamin", name: "Vitaminlar" },
      { id: "parvarish", name: "Parvarish" },
      { id: "kundalik", name: "Kundalik" },
    ],
    products: [
      { id: "p1", name: "Vitamin C, 60 dona", price: 48000, category: "vitamin", image: u("1607619056574-7b8d3ee536b2", 700), desc: "Immunitetni qo'llab-quvvatlaydi. Kuniga 1 dona.", tag: "Hit" },
      { id: "p2", name: "Multivitamin kompleks", price: 89000, category: "vitamin", image: u("1512069772995-ec65ed45afd6", 700), desc: "13 vitamin va 10 mineral, 30 dona." },
      { id: "p3", name: "Omega-3, 90 kapsula", price: 124000, category: "vitamin", image: u("1584017911766-d451b3d0e843", 700), desc: "Yurak va miya uchun baliq moyi.", tag: "Yangi" },
      { id: "p4", name: "D3 vitamini tomchi", price: 56000, category: "vitamin", image: u("1559087316-6b27308e53f6", 700), desc: "Bolalar va kattalar uchun, 20 ml." },
      { id: "p5", name: "Namlovchi krem", price: 72000, category: "parvarish", image: u("1597121870960-7b5391b88b84", 700), desc: "Kunduzgi parvarish, sezgir teri uchun." },
      { id: "p6", name: "Gigiyena to'plami", price: 64000, category: "kundalik", image: u("1528272252360-5efd274e36fb", 700), desc: "Qo'l uchun sovun, antiseptik va sochiqlar." },
      { id: "p7", name: "Tomoq uchun pastilkalar", price: 28000, category: "kundalik", image: u("1592323818181-f9b967ff537c", 700), desc: "Asal va limon ta'mi, 24 dona." },
    ],
    deliveryFee: 12000,
    freeFrom: 120000,
    info: { hours: "Har kuni 08:00 – 22:00", address: "Nukus sh., Tinchlik ko'chasi 14", phone: "+998 90 880 70 60", about: "Salomat Dorixona: vitaminlar va parvarish vositalari. Retsept talab qilinadigan dorilar uchun dorixonaga murojaat qiling.", telegram: "@salomatdorixona" },
    bot: { welcome: "Assalomu alaykum! Salomat Dorixona katalogini ochish uchun pastdagi tugmani bosing 💊", button: "Katalog", ask: "Salomat Dorixona 👇" },
    words: { items: "ta mahsulot", emptyCart: "Savat bo'sh" },
  });
