import type { AppDoc } from "../types";
import { unsplash as u } from "./kit";
import { serviceApp } from "./service";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
const DAYS = ["Bugun", "Ertaga", "Indinga", "Juma", "Shanba", "Yakshanba"];
const SLOTS = (from: number, to: number, busy: string[] = []) =>
  Array.from({ length: to - from + 1 }, (_, i) => {
    const time = `${String(from + i).padStart(2, "0")}:00`;
    return { id: `t${i + 1}`, time, ...(busy.includes(time) ? { busy: true } : {}) };
  });
const NOUNS = { service: "Xizmat", services: "Xizmatlar", master: "Mutaxassis", masters: "Mutaxassislar", day: "Kun", time: "Vaqt", cta: "Yozilish", mine: "Yozuvlarim", done: "Yozuv qabul qilindi!", doneSub: "Tez orada tasdiqlaymiz." };

export const gymService = (): AppDoc =>
  serviceApp({
    name: "Iron Fit",
    palette: { primary: "#f08c00", bg: "#0e0f11", text: "#f4f2ee", surface: "#18191c", line: "#2a2c31", onPrimary: "#14100a", muted: "#a3a29d" },
    radius: 14,
    font: SANS,
    hero: { image: u("1571902943202-507ec2618e8f", 1000), kicker: "Iron Fit", title: "Kuchli tana bugundan boshlanadi", sub: "Zamonaviy trenajyorlar, shaxsiy murabbiy va guruh mashg'ulotlari.", cta: "Mashg'ulotga yozilish", rating: "4.9 · 500 dan ortiq a'zo" },
    nouns: { ...NOUNS, service: "Dastur", services: "Dasturlar", master: "Murabbiy", masters: "Murabbiylar", day: "Kun", time: "Mashg'ulot vaqti", cta: "Mashg'ulotga yozilish", mine: "Mashg'ulotlarim", done: "Yozuv qabul qilindi!", doneSub: "Murabbiy tasdiqlash uchun bog'lanadi." },
    highlights: [["barbell", "Zamonaviy trenajyorlar"], ["users-three", "Guruh mashg'ulotlari"], ["medal", "Tajribali murabbiylar"]],
    services: [
      { id: "s1", name: "Sinov mashg'uloti", price: 40000, duration: "60 daqiqa", image: u("1534438327276-14e5300c3a48", 400), desc: "Tanishuv: zalni ko'rish va murabbiy bilan reja", tag: "Yangi" },
      { id: "s2", name: "Shaxsiy mashg'ulot", price: 120000, duration: "60 daqiqa", image: u("1517836357463-d25dfeac3438", 400), desc: "Murabbiy bilan yakka, maqsadingizga mos dastur", tag: "Hit" },
      { id: "s3", name: "Guruh mashg'uloti", price: 50000, duration: "50 daqiqa", image: u("1576678927484-cc907957088c", 400), desc: "Kardio va kuch mashqlari, 10 kishigacha" },
      { id: "s4", name: "Oylik abonement", price: 350000, duration: "30 kun", image: u("1623874514711-0f321325f318", 400), desc: "Zalga cheksiz kirish va savol-javoblar" },
    ],
    masters: [
      { id: "m1", name: "Timur", role: "Kuch mashqlari", rating: "4.9" },
      { id: "m2", name: "Dilnoza", role: "Fitnes va kardio", rating: "5.0" },
      { id: "m3", name: "Anvar", role: "Funksional trening", rating: "4.8" },
    ],
    reviews: [
      { id: "r1", name: "Sanjar", text: "3 oyda 8 kg ortiqcha vazn tashladim. Timur aka dasturni aniq tuzib berdi." },
      { id: "r2", name: "Madina", text: "Zal toza, trenajyorlar yangi, guruh mashg'ulotlari juda qiziq." },
      { id: "r3", name: "Bunyod", text: "Onlayn yozilish qulay, navbat kutmayman. Tavsiya qilaman." },
    ],
    days: DAYS,
    slots: SLOTS(7, 21, ["09:00", "18:00", "19:00"]),
    gallery: [u("1757924284732-4189190321cf", 500), u("1778828494354-9b717d36dc99", 500), u("1722925541142-5db2668ca492", 500)],
    info: { hours: "Har kuni 06:00 – 23:00", address: "Nukus sh., Sport ko'chasi 9", phone: "+998 90 600 70 80", about: "Iron Fit: zamonaviy zal va tajribali murabbiylar. Sinov mashg'ulotiga yoziling.", telegram: "@ironfit_nukus" },
    bot: { welcome: "Assalomu alaykum! Iron Fit mashg'ulotiga yozilish uchun pastdagi tugmani bosing 💪", button: "Yozilish", ask: "Iron Fit: yozilish 👇" },
  });

export const dentalService = (): AppDoc =>
  serviceApp({
    name: "Oq Tabassum",
    palette: { primary: "#1098ad", bg: "#f3fafc", text: "#0f2630", surface: "#ffffff", line: "#d5eaf0", onPrimary: "#ffffff", muted: "#5f808b" },
    radius: 20,
    font: SANS,
    heading: SERIF,
    hero: { image: u("1629909613654-28e377c37b09", 1000), kicker: "Oq Tabassum · Stomatologiya", title: "Tabassumingiz bizga muhim", sub: "Og'riqsiz davolash, zamonaviy uskunalar va ishga kafolat.", cta: "Qabulga yozilish", rating: "4.9 · 700 dan ortiq bemor" },
    nouns: { ...NOUNS, service: "Davolash turi", services: "Xizmatlar", master: "Shifokor", masters: "Shifokorlar", day: "Kun", time: "Qabul vaqti", cta: "Qabulga yozilish", mine: "Qabullarim", done: "Qabul band qilindi!", doneSub: "Administrator vaqtni tasdiqlash uchun bog'lanadi." },
    highlights: [["shield-check", "Ishga kafolat"], ["sparkle", "Og'riqsiz davolash"], ["heart", "Bolalar uchun alohida"]],
    priceFrom: true,
    services: [
      { id: "s1", name: "Ko'rik va maslahat", price: 50000, duration: "30 daqiqa", image: u("1606811971618-4486d14f3f99", 400), desc: "Tishlar holati va davolash rejasi", tag: "Yangi" },
      { id: "s2", name: "Kariesni davolash", price: 250000, duration: "45 daqiqa", image: u("1598256989800-fe5f95da9787", 400), desc: "Og'riqsiz, sifatli plomba bilan", tag: "Hit" },
      { id: "s3", name: "Professional tozalash", price: 300000, duration: "60 daqiqa", image: u("1677026010083-78ec7f1b84ed", 400), desc: "Tosh va karashni ultratovush bilan tozalash" },
      { id: "s4", name: "Tishlarni oqartirish", price: 900000, duration: "75 daqiqa", image: u("1489278353717-f64c6ee8a4d2", 400), desc: "Xavfsiz, 8 tonggacha oqarish" },
    ],
    masters: [
      { id: "m1", name: "Dr. Gulnora", role: "Terapevt", rating: "5.0" },
      { id: "m2", name: "Dr. Jasur", role: "Ortoped", rating: "4.9" },
    ],
    reviews: [
      { id: "r1", name: "Malika", text: "Birinchi marta qo'rqmay keldim. Hech narsa og'rimadi, shifokor hammasini tushuntirib berdi." },
      { id: "r2", name: "Rustam", text: "Tozalash va oqartirish: natija zo'r, narx ham halol." },
      { id: "r3", name: "Nargiza", text: "Bolamni olib keldim, shifokor juda mehribon. Rahmat." },
    ],
    days: DAYS,
    slots: SLOTS(9, 18, ["11:00", "15:00"]),
    gallery: [u("1777331903190-341a3dd0441b", 500), u("1762625570087-6d98fca29531", 500), u("1771442873038-dda05b6ca447", 500)],
    extra: { label: "Shikoyat", placeholder: "Qisqacha yozing (ixtiyoriy)" },
    info: { hours: "Du–Sha 09:00 – 19:00", address: "Nukus sh., Tinchlik ko'chasi 22", phone: "+998 93 250 60 70", about: "Oq Tabassum: ko'rik, davolash, tozalash va oqartirish. Qabulga oldindan yoziling.", telegram: "@oqtabassum" },
    bot: { welcome: "Assalomu alaykum! Oq Tabassum qabuliga yozilish uchun pastdagi tugmani bosing 🦷", button: "Qabulga yozilish", ask: "Oq Tabassum 👇" },
  });

export const photoService = (): AppDoc =>
  serviceApp({
    name: "Lumen Studio",
    palette: { primary: "#e8e0d2", bg: "#101010", text: "#f3efe8", surface: "#1a1a1a", line: "#2b2b2b", onPrimary: "#141414", muted: "#a8a39a" },
    radius: 10,
    font: SANS,
    heading: SERIF,
    hero: { image: u("1471341971476-ae15ff5dd4ea", 1000), kicker: "Lumen Studio", title: "Lahzalaringizni saqlaymiz", sub: "Portret, oilaviy va tijorat suratga olish. Tayyor suratlar 3 kunda.", cta: "Suratga yozilish", rating: "5.0 · 180 dan ortiq buyurtma" },
    nouns: { ...NOUNS, service: "Suratga olish", services: "Paketlar", master: "Fotograf", masters: "Fotograflar", day: "Kun", time: "Vaqt", cta: "Suratga yozilish", mine: "Buyurtmalarim", done: "So'rov qabul qilindi!", doneSub: "Fotograf tafsilotlarni kelishish uchun bog'lanadi." },
    highlights: [["camera", "Professional jihozlar"], ["image", "Retush kiritilgan"], ["clock", "3 kunda tayyor"]],
    priceFrom: true,
    services: [
      { id: "s1", name: "Portret", price: 350000, duration: "1 soat", image: u("1768818928341-3b31b8965c6d", 400), desc: "20 ta retushlangan surat, studiyada", tag: "Hit" },
      { id: "s2", name: "Oilaviy surat", price: 600000, duration: "1.5 soat", image: u("1777322615136-2f1d5d636cc4", 400), desc: "4 kishigacha, 30 ta retushlangan surat" },
      { id: "s3", name: "Mahsulot suratga olish", price: 450000, duration: "2 soat", image: u("1767130298927-2df12c33e5d6", 400), desc: "Do'kon va kataloglar uchun, 15 mahsulot" },
      { id: "s4", name: "To'y va tadbirlar", price: 1800000, duration: "6 soat", image: u("1786325492063-8967ed6ad88d", 400), desc: "Suratga olish, 150 ta surat va albom", tag: "Premium" },
    ],
    masters: [
      { id: "m1", name: "Sherzod", role: "Portret", rating: "5.0" },
      { id: "m2", name: "Kamola", role: "Oilaviy va tadbirlar", rating: "4.9" },
    ],
    reviews: [
      { id: "r1", name: "Zuhra", text: "Portret juda tabiiy chiqdi. Fotograf qanday turishni ko'rsatib turdi." },
      { id: "r2", name: "Eldor", text: "Do'konim uchun mahsulot suratlari tayyor bo'ldi: sotuv sezilarli oshdi." },
      { id: "r3", name: "Feruza", text: "Oilaviy suratlarimiz uchun rahmat, hammaga yoqdi." },
    ],
    days: DAYS,
    slots: SLOTS(10, 19, ["12:00", "16:00"]),
    gallery: [u("1768818928341-3b31b8965c6d", 500), u("1767130298927-2df12c33e5d6", 500), u("1786325492057-e45a9aea8c8a", 500)],
    extra: { label: "Istak", placeholder: "Qanday suratlar kerak? (ixtiyoriy)" },
    info: { hours: "Har kuni 10:00 – 20:00", address: "Nukus sh., Dosnazarov ko'chasi 41", phone: "+998 97 123 45 67", about: "Lumen Studio: portret, oilaviy, tijorat va to'y suratlari. Paketni tanlang va vaqtni band qiling.", telegram: "@lumenstudio" },
    bot: { welcome: "Assalomu alaykum! Lumen Studio'da suratga yozilish uchun pastdagi tugmani bosing 📸", button: "Yozilish", ask: "Lumen Studio 👇" },
  });

export const cleaningService = (): AppDoc =>
  serviceApp({
    name: "Toza Uy",
    palette: { primary: "#12b886", bg: "#f2fbf8", text: "#0e2a22", surface: "#ffffff", line: "#d3efe5", onPrimary: "#ffffff", muted: "#5f857a" },
    radius: 20,
    font: SANS,
    hero: { image: u("1758273238415-01ec03d9ef27", 1000), kicker: "Toza Uy · Tozalash xizmati", title: "Uyingiz toza, vaqtingiz sizniki", sub: "Tajribali xodimlar, o'z jihoz va vositalar. Natijaga kafolat.", cta: "Tozalashga buyurtma", rating: "4.9 · 400 dan ortiq buyurtma" },
    nouns: { ...NOUNS, service: "Tozalash turi", services: "Xizmatlar", master: "Brigada", masters: "Brigadalar", day: "Kun", time: "Boshlanish vaqti", cta: "Buyurtma berish", mine: "Buyurtmalarim", done: "Buyurtma qabul qilindi!", doneSub: "Operator manzil va narxni tasdiqlash uchun bog'lanadi." },
    highlights: [["sparkle", "Ekologik vositalar"], ["shield-check", "Natijaga kafolat"], ["clock", "O'z vaqtida keladi"]],
    priceFrom: true,
    services: [
      { id: "s1", name: "Kundalik tozalash", price: 250000, duration: "3 soat", image: u("1758272422155-d898efd14f81", 400), desc: "Changyutish, artish va polni yuvish", tag: "Hit" },
      { id: "s2", name: "Bosh tozalash", price: 550000, duration: "6 soat", image: u("1686178827149-6d55c72d81df", 400), desc: "Barcha xonalar, oshxona va hammom: chuqur tozalash" },
      { id: "s3", name: "Ta'mirdan keyin", price: 750000, duration: "8 soat", image: u("1740657254989-42fe9c3b8cce", 400), desc: "Qurilish changi va dog'lardan tozalash" },
      { id: "s4", name: "Oshxona tozalash", price: 180000, duration: "2 soat", image: u("1757387240036-d7eb9b096c40", 400), desc: "Plita, shkaflar va texnikani yog'dan tozalash" },
    ],
    masters: [
      { id: "m1", name: "1-brigada", role: "Kvartiralar", rating: "4.9" },
      { id: "m2", name: "2-brigada", role: "Hovli va ofislar", rating: "4.8" },
    ],
    reviews: [
      { id: "r1", name: "Shahlo", text: "Bosh tozalashdan keyin uy yangidek bo'ldi. Brigada juda tartibli ishladi." },
      { id: "r2", name: "Odilbek", text: "Ta'mirdan keyingi changni aniq tozalashdi, rahmat." },
      { id: "r3", name: "Laylo", text: "Narx oldindan aytildi, qo'shimcha pul so'rashmadi." },
    ],
    days: DAYS,
    slots: SLOTS(8, 16, ["10:00", "13:00"]),
    gallery: [u("1758273238415-01ec03d9ef27", 500), u("1773579305267-8d75e0af5be4", 500), u("1646980241033-cd7abda2ee88", 500)],
    extra: { label: "Manzil va xona soni", placeholder: "Manzil, necha xonali (masalan: 3 xonali)" },
    info: { hours: "Har kuni 08:00 – 20:00", address: "Nukus sh., Xalqlar do'stligi ko'chasi 15", phone: "+998 91 410 20 30", about: "Toza Uy: kvartira, hovli va ofislarni tozalash. Xizmat turini tanlang, qulay vaqtni belgilang.", telegram: "@tozauy" },
    bot: { welcome: "Assalomu alaykum! Toza Uy'ga buyurtma berish uchun pastdagi tugmani bosing 🧹", button: "Buyurtma", ask: "Toza Uy 👇" },
  });

export const spaService = (): AppDoc =>
  serviceApp({
    name: "Lotus Spa",
    palette: { primary: "#7a8f5a", bg: "#f8f7f1", text: "#242a1c", surface: "#ffffff", line: "#e6e5d6", onPrimary: "#ffffff", muted: "#7f8470" },
    radius: 22,
    font: SANS,
    heading: SERIF,
    hero: { image: u("1600334089648-b0d9d3028eb2", 1000), kicker: "Lotus Spa", title: "Tanangiz va ruhingiz dam oladi", sub: "Massaj, issiq toshlar va sauna. Shoshilmasdan, sokin muhitda.", cta: "Vaqtga yozilish", rating: "4.9 · 260 dan ortiq sharh" },
    nouns: { ...NOUNS, service: "Muolaja", services: "Muolajalar", master: "Mutaxassis", masters: "Mutaxassislar", day: "Kun", time: "Vaqt", cta: "Vaqtga yozilish", mine: "Yozuvlarim", done: "Yozuv qabul qilindi!", doneSub: "Tez orada tasdiqlaymiz. 10 daqiqa oldin kelishingizni so'raymiz." },
    highlights: [["flower-lotus", "Sokin muhit"], ["leaf", "Tabiiy yog'lar"], ["heart", "Individual yondashuv"]],
    services: [
      { id: "s1", name: "Klassik massaj", price: 180000, duration: "60 daqiqa", image: u("1741522509438-a120c0bb5e88", 400), desc: "Orqa va bo'yin, charchoqni oladi", tag: "Hit" },
      { id: "s2", name: "Issiq toshlar bilan", price: 260000, duration: "75 daqiqa", image: u("1696841212541-449ca29397cc", 400), desc: "Chuqur dam olish, mushaklarni yumshatadi" },
      { id: "s3", name: "Aromaterapiya", price: 220000, duration: "60 daqiqa", image: u("1515377905703-c4788e51af15", 400), desc: "Efir yog'lari bilan, stressni kamaytiradi" },
      { id: "s4", name: "Sauna va dam olish", price: 150000, duration: "90 daqiqa", image: u("1761470575018-135c213340eb", 400), desc: "Sauna, choy va dam olish xonasi", tag: "Yangi" },
    ],
    masters: [
      { id: "m1", name: "Shirin", role: "Massaj terapevti", rating: "5.0" },
      { id: "m2", name: "Oysha", role: "Aroma-terapevt", rating: "4.9" },
    ],
    reviews: [
      { id: "r1", name: "Dildora", text: "Ish haftasidan keyin ajoyib dam oldim. Shirin opa qo'li yengil." },
      { id: "r2", name: "Kamoliddin", text: "Issiq toshlar bilan massaj: yelkamdagi og'riq ketdi." },
      { id: "r3", name: "Nodira", text: "Sokin joy, toza va chiroyli. Do'stlarimga ham tavsiya qildim." },
    ],
    days: DAYS,
    slots: SLOTS(10, 20, ["13:00", "17:00"]),
    gallery: [u("1757689314932-bec6e9c39e51", 500), u("1772915022472-ffc1df2d6051", 500), u("1786359410265-86e20d5da810", 500)],
    info: { hours: "Har kuni 10:00 – 22:00", address: "Nukus sh., Gulshan ko'chasi 8", phone: "+998 90 700 88 99", about: "Lotus Spa: massaj, aromaterapiya va sauna. Muolajani tanlang va qulay vaqtga yoziling.", telegram: "@lotusspa" },
    bot: { welcome: "Assalomu alaykum! Lotus Spa'ga yozilish uchun pastdagi tugmani bosing 🌿", button: "Yozilish", ask: "Lotus Spa 👇" },
  });

export const vetService = (): AppDoc =>
  serviceApp({
    name: "Do'st Vet",
    palette: { primary: "#f76707", bg: "#fff8f2", text: "#2b1c12", surface: "#ffffff", line: "#f4e3d4", onPrimary: "#ffffff", muted: "#917a69" },
    radius: 22,
    font: SANS,
    hero: { image: u("1450778869180-41d0601e046e", 1000), kicker: "Do'st Vet · Veterinariya", title: "Do'stingiz sog'ligi ishonchli qo'llarda", sub: "Ko'rik, emlash va davolash: mushuk, it va boshqa hayvonlar uchun.", cta: "Qabulga yozilish", rating: "4.9 · 350 dan ortiq mijoz" },
    nouns: { ...NOUNS, service: "Xizmat", services: "Xizmatlar", master: "Veterinar", masters: "Veterinarlar", day: "Kun", time: "Qabul vaqti", cta: "Qabulga yozilish", mine: "Qabullarim", done: "Qabul band qilindi!", doneSub: "Klinika vaqtni tasdiqlash uchun bog'lanadi." },
    highlights: [["paw-print", "Barcha hayvonlar uchun"], ["shield-check", "Sifatli vaksinalar"], ["clock", "Tezkor qabul"]],
    priceFrom: true,
    services: [
      { id: "s1", name: "Umumiy ko'rik", price: 80000, duration: "30 daqiqa", image: u("1725409796872-8b41e8eca929", 400), desc: "Holatini baholash va maslahat", tag: "Hit" },
      { id: "s2", name: "Emlash", price: 120000, duration: "20 daqiqa", image: u("1770836037275-38b44e4b101f", 400), desc: "Vaksina va emlash daftari bilan" },
      { id: "s3", name: "Davolash va tahlillar", price: 200000, duration: "45 daqiqa", image: u("1630438994394-3deff7a591bf", 400), desc: "Tashxis, qon tahlili va davolash rejasi" },
      { id: "s4", name: "Tishlarni tozalash", price: 250000, duration: "60 daqiqa", image: u("1654895716780-b4664497420d", 400), desc: "Tosh va karashni olib tashlash" },
    ],
    masters: [
      { id: "m1", name: "Dr. Alisher", role: "Terapevt", rating: "4.9" },
      { id: "m2", name: "Dr. Shaxnoza", role: "Mushuk va itlar", rating: "5.0" },
    ],
    reviews: [
      { id: "r1", name: "Gulbahor", text: "Mushugimni emlatdik, shifokor juda sabrli. Hech qo'rqmadi." },
      { id: "r2", name: "Yusuf", text: "Itim kasal bo'lganda tez qabul qilishdi. Rahmat!" },
      { id: "r3", name: "Sevara", text: "Narx halol, hammasi tushuntirildi. Tavsiya qilaman." },
    ],
    days: DAYS,
    slots: SLOTS(9, 18, ["10:00", "14:00"]),
    gallery: [u("1623387641168-d9803ddd3f35", 500), u("1450778869180-41d0601e046e", 500), u("1596272875729-ed2ff7d6d9c5", 500)],
    extra: { label: "Hayvon", placeholder: "Turi va yoshi (masalan: mushuk, 2 yosh)" },
    info: { hours: "Har kuni 09:00 – 19:00", address: "Nukus sh., Yoshlik ko'chasi 27", phone: "+998 94 880 90 10", about: "Do'st Vet: ko'rik, emlash va davolash. Hayvoningiz uchun vaqt band qiling.", telegram: "@dostvet" },
    bot: { welcome: "Assalomu alaykum! Do'st Vet qabuliga yozilish uchun pastdagi tugmani bosing 🐾", button: "Qabulga yozilish", ask: "Do'st Vet 👇" },
  });
