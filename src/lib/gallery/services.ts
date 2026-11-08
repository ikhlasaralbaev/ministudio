import type { AppDoc } from "../types";
import { unsplash as u } from "./kit";
import { serviceApp } from "./service";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Inter, system-ui, -apple-system, 'Segoe UI', sans-serif";
const DAYS = ["Bugun", "Ertaga", "Indinga", "Juma", "Shanba", "Yakshanba"];
const SLOTS = (busy: string[] = []) => ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"].map((time, i) => ({ id: `t${i + 1}`, time, ...(busy.includes(time) ? { busy: true } : {}) }));
const NOUNS = { service: "Xizmat", services: "Xizmatlar", master: "Usta", masters: "Ustalar", day: "Kun", time: "Vaqt", cta: "Band qilish", mine: "Yozuvlarim", done: "Yozuv qabul qilindi!", doneSub: "Tez orada tasdiqlaymiz. Kechikmaslikni unutmang." };

export const barberService = (): AppDoc =>
  serviceApp({
    name: "Barber House",
    palette: { primary: "#d6a35c", bg: "#0f0f10", text: "#f4efe6", surface: "#1a1a1c", line: "#2c2c30", onPrimary: "#14110c", muted: "#a09a8f" },
    radius: 16,
    font: SANS,
    hero: { image: u("1585747860715-2ba37e788b70", 1000), kicker: "Barber House", title: "Aniq soch, ishonchli uslub", sub: "Tajribali ustalar, navbatsiz: oldindan yoziling.", cta: "Yozilish", rating: "4.9 · 320 dan ortiq sharh" },
    nouns: NOUNS,
    highlights: [["clock", "Navbatsiz, aniq vaqtda"], ["scissors", "Tajribali ustalar"], ["sparkle", "Premium parvarish"]],
    services: [
      { id: "s1", name: "Soch olish", price: 60000, duration: "40 daqiqa", image: u("1503951914875-452162b0f3f1", 400), desc: "Yuvish, kesish va uslub berish", tag: "Hit" },
      { id: "s2", name: "Soqol dizayni", price: 40000, duration: "25 daqiqa", image: u("1621605815971-fbc98d665033", 400), desc: "Aniq shakl, issiq sochiq bilan" },
      { id: "s3", name: "Soch + soqol", price: 90000, duration: "60 daqiqa", image: u("1585747860715-2ba37e788b70", 400), desc: "To'liq paket, 10 000 so'm tejaysiz", tag: "Foydali" },
      { id: "s4", name: "Bolalar soch olish", price: 45000, duration: "30 daqiqa", image: u("1503951914875-452162b0f3f1", 401), desc: "12 yoshgacha, sabr bilan" },
    ],
    masters: [
      { id: "m1", name: "Aziz", role: "Katta barber", rating: "4.9" },
      { id: "m2", name: "Bekzod", role: "Barber", rating: "4.8" },
      { id: "m3", name: "Jasur", role: "Barber-stilist", rating: "4.9" },
    ],
    reviews: [
      { id: "r1", name: "Sardor", text: "Eng yaxshi barbershop shaharda. Aziz usta juda aniq ishlaydi, vaqtida qabul qilishdi." },
      { id: "r2", name: "Jahongir", text: "Onlayn yozilish juda qulay: kelganimda kutmadim, natija ajoyib." },
      { id: "r3", name: "Otabek", text: "Soqol dizayni zo'r chiqdi, muhit ham yoqdi. Doim shu yerga kelaman." },
    ],
    days: DAYS,
    slots: SLOTS(["12:00", "15:00"]),
    gallery: [u("1503951914875-452162b0f3f1", 500), u("1585747860715-2ba37e788b70", 500), u("1621605815971-fbc98d665033", 500)],
    info: { hours: "Har kuni 09:00 – 21:00", address: "Nukus sh., Berdaq ko'chasi 24", phone: "+998 90 555 12 34", about: "Barber House: klassik va zamonaviy soch turmaklari. Ustani va vaqtni tanlang, qolganini biz qilamiz.", telegram: "@barberhouse_nukus" },
    bot: { welcome: "Assalomu alaykum! Barber House'ga yozilish uchun pastdagi tugmani bosing ✂️", button: "Yozilish", ask: "Barber House: yozilish 👇" },
  });

export const beautyService = (): AppDoc =>
  serviceApp({
    name: "Nilufar Salon",
    palette: { primary: "#c2255c", bg: "#fff6f9", text: "#2a1520", surface: "#ffffff", line: "#f4dde6", onPrimary: "#ffffff", muted: "#98798a" },
    radius: 20,
    font: SANS,
    heading: SERIF,
    hero: { image: u("1521590832167-7bcbfaa6381f", 1000), kicker: "Nilufar Salon", title: "O'zingizga vaqt ajrating", sub: "Manikyur, soch, makiyaj: bir joyda.", cta: "Vaqtga yozilish", rating: "4.9 · 210 dan ortiq sharh" },
    nouns: NOUNS,
    highlights: [["heart", "Mehr bilan ishlaymiz"], ["sparkle", "Sifatli materiallar"], ["clock", "Qulay vaqt"]],
    services: [
      { id: "s1", name: "Manikyur", price: 70000, duration: "60 daqiqa", image: u("1604654894610-df63bc536371", 400), desc: "Gel-lak bilan, 50 dan ortiq rang", tag: "Hit" },
      { id: "s2", name: "Pedikyur", price: 90000, duration: "75 daqiqa", image: u("1604654894610-df63bc536371", 401), desc: "Spa parvarish va gel-lak" },
      { id: "s3", name: "Soch turmagi", price: 120000, duration: "60 daqiqa", image: u("1522337360788-8b13dee7a37e", 400), desc: "Bayram va kundalik turmaklar" },
      { id: "s4", name: "Makiyaj", price: 150000, duration: "70 daqiqa", image: u("1487412947147-5cebf100ffc2", 400), desc: "Kunduzgi va kechki, individual", tag: "Yangi" },
    ],
    masters: [
      { id: "m1", name: "Nilufar", role: "Stilist", rating: "5.0" },
      { id: "m2", name: "Madina", role: "Nail-usta", rating: "4.9" },
      { id: "m3", name: "Zarina", role: "Vizajist", rating: "4.9" },
    ],
    reviews: [
      { id: "r1", name: "Gulnora", text: "Manikyur juda toza va chiroyli chiqdi, 3 hafta turdi. Rahmat Madinaga!" },
      { id: "r2", name: "Dilfuza", text: "To'y uchun soch va makiyaj qildirdim: hammasi o'zim xohlagandek." },
      { id: "r3", name: "Aziza", text: "Qulay vaqt, mehribon ustalar va ajoyib muhit. Tavsiya qilaman." },
    ],
    days: DAYS,
    slots: SLOTS(["11:00", "16:00", "17:00"]),
    gallery: [u("1560066984-138dadb4c035", 500), u("1604654894610-df63bc536371", 500), u("1522337360788-8b13dee7a37e", 500)],
    info: { hours: "Har kuni 09:00 – 20:00", address: "Nukus sh., Dosnazarov ko'chasi 33", phone: "+998 93 444 56 78", about: "Nilufar Salon: go'zallik va parvarish. Xizmatni tanlang, qulay vaqtga yoziling.", telegram: "@nilufarsalon" },
    bot: { welcome: "Assalomu alaykum! Nilufar Salon'ga yozilish uchun pastdagi tugmani bosing 💅", button: "Yozilish", ask: "Nilufar Salon: yozilish 👇" },
  });

export const carService = (): AppDoc =>
  serviceApp({
    name: "Avto Servis",
    palette: { primary: "#e03131", bg: "#f4f5f7", text: "#14161a", surface: "#ffffff", line: "#e2e4ea", onPrimary: "#ffffff", muted: "#6d727c" },
    radius: 14,
    font: SANS,
    hero: { image: u("1486006920555-c77dcf18193c", 1000), kicker: "Avto Servis", title: "Mashinangiz ishonchli qo'llarda", sub: "Kompyuter diagnostika, ta'mirlash va kafolat.", cta: "Navbat olish", rating: "4.8 · 150 dan ortiq sharh" },
    nouns: { ...NOUNS, service: "Xizmat", cta: "Navbat olish", mine: "Navbatlarim", done: "Navbat qabul qilindi!", doneSub: "Usta siz bilan bog'lanib vaqtni tasdiqlaydi." },
    highlights: [["wrench", "Tajribali ustalar"], ["shield-check", "Ishga kafolat"], ["clock", "Vaqtida topshirish"]],
    priceFrom: true,
    services: [
      { id: "s1", name: "Kompyuter diagnostikasi", price: 150000, duration: "45 daqiqa", image: u("1486262715619-67b85e0b08d3", 400), desc: "Xatolarni o'qish va tahlil", tag: "Hit" },
      { id: "s2", name: "Moy almashtirish", price: 120000, duration: "30 daqiqa", image: u("1530046339160-ce3e530c7d2f", 400), desc: "Moy va filtr, ish haqi bilan" },
      { id: "s3", name: "G'ildirak balansirovkasi", price: 80000, duration: "40 daqiqa", image: u("1492144534655-ae79c964c9d7", 400), desc: "4 ta g'ildirak, to'liq tekshiruv" },
      { id: "s4", name: "Tormoz tizimi", price: 200000, duration: "60 daqiqa", image: u("1486006920555-c77dcf18193c", 400), desc: "Kolodka almashtirish va tekshirish" },
    ],
    masters: [
      { id: "m1", name: "Rustam", role: "Katta usta", rating: "4.9" },
      { id: "m2", name: "Sardor", role: "Diagnost", rating: "4.8" },
    ],
    reviews: [
      { id: "r1", name: "Bobur", text: "Diagnostika aniq chiqdi, keraksiz ish qilishmadi. Narx ham halol." },
      { id: "r2", name: "Alisher", text: "Moy almashtirishni 30 daqiqada qilib berishdi. Onlayn navbat juda qulay." },
      { id: "r3", name: "Sherzod", text: "Tormozni almashtirdilar, kafolat berishdi. Ishonch bilan tavsiya qilaman." },
    ],
    days: DAYS,
    slots: SLOTS(["10:00", "14:00"]),
    gallery: [u("1486262715619-67b85e0b08d3", 500), u("1530046339160-ce3e530c7d2f", 500), u("1503376780353-7e6692767b70", 500)],
    extra: { label: "Mashina", placeholder: "Mashina markasi va yili (masalan: Cobalt 2021)" },
    info: { hours: "Du–Sha 09:00 – 19:00", address: "Nukus sh., Sanoat ko'chasi 7", phone: "+998 97 111 22 33", about: "Avto Servis: diagnostika, ta'mirlash va texnik xizmat. Navbat oling, kutmasdan xizmat oling.", telegram: "@avtoservis_nukus" },
    bot: { welcome: "Assalomu alaykum! Avto Servis'ga navbat olish uchun pastdagi tugmani bosing 🔧", button: "Navbat olish", ask: "Avto Servis: navbat 👇" },
  });

export const courseService = (): AppDoc =>
  serviceApp({
    name: "Bilim Markazi",
    palette: { primary: "#6741d9", bg: "#f7f5fe", text: "#1d1636", surface: "#ffffff", line: "#e7e2f7", onPrimary: "#ffffff", muted: "#7a7396" },
    radius: 18,
    font: SANS,
    hero: { image: u("1522202176988-66273c2fd55f", 1000), kicker: "Bilim Markazi", title: "Bilim bilan kelajakni quring", sub: "Kuchli o'qituvchilar, kichik guruhlar, aniq natija.", cta: "Ariza qoldirish", rating: "4.9 · 400 dan ortiq bitiruvchi" },
    nouns: { service: "Kurs", services: "Kurslar", master: "O'qituvchi", masters: "O'qituvchilar", day: "Guruh jadvali", time: "Dars vaqti", cta: "Ariza yuborish", mine: "Arizalarim", done: "Ariza qabul qilindi!", doneSub: "Menejer tez orada siz bilan bog'lanadi." },
    highlights: [["chalkboard-teacher", "Tajribali o'qituvchilar"], ["users-three", "Kichik guruhlar"], ["certificate", "Sertifikat beriladi"]],
    services: [
      { id: "s1", name: "Ingliz tili", price: 450000, duration: "3 oy", image: u("1503676260728-1c00da094a0b", 400), desc: "Boshlang'ichdan IELTS gacha", tag: "Hit" },
      { id: "s2", name: "Rus tili", price: 400000, duration: "3 oy", image: u("1456513080510-7bf3a84b82f8", 400), desc: "Suhbat va grammatika, kundalik hayot uchun" },
      { id: "s3", name: "Dasturlash asoslari", price: 700000, duration: "4 oy", image: u("1517694712202-14dd9538aa97", 400), desc: "Python va web, loyihalar bilan", tag: "Yangi" },
      { id: "s4", name: "Matematika (DTM)", price: 500000, duration: "6 oy", image: u("1524178232363-1fb2b075b655", 400), desc: "Abituriyentlar uchun intensiv tayyorlov" },
    ],
    masters: [
      { id: "m1", name: "Dilnoza", role: "Ingliz tili, 7 yil", rating: "4.9" },
      { id: "m2", name: "Otabek", role: "Dasturlash, 5 yil", rating: "4.9" },
      { id: "m3", name: "Malika", role: "Matematika, 9 yil", rating: "5.0" },
    ],
    reviews: [
      { id: "r1", name: "Madina", text: "Ikki oyda gapira boshladim. Dilnoza opa juda yaxshi tushuntiradi." },
      { id: "r2", name: "Jasur", text: "Dasturlash kursidan keyin birinchi loyihamni o'zim yaratdim. Zo'r!" },
      { id: "r3", name: "Nodira", text: "DTM ga tayyorlandim va yuqori ball oldim. Rahmat butun jamoaga." },
    ],
    days: ["Du–Chor–Juma", "Se–Pay–Shanba", "Dam olish kunlari"],
    slots: [
      { id: "t1", time: "09:00" },
      { id: "t2", time: "11:00" },
      { id: "t3", time: "14:00", busy: true },
      { id: "t4", time: "16:00" },
      { id: "t5", time: "18:00" },
      { id: "t6", time: "19:30" },
    ],
    gallery: [u("1522202176988-66273c2fd55f", 500), u("1524178232363-1fb2b075b655", 500), u("1503676260728-1c00da094a0b", 500)],
    extra: { label: "Daraja", placeholder: "Hozirgi darajangiz (masalan: boshlang'ich)" },
    info: { hours: "Du–Sha 08:30 – 20:00", address: "Nukus sh., Ajiniyoz ko'chasi 15", phone: "+998 94 200 30 40", about: "Bilim Markazi: tillar, dasturlash va abituriyentlar uchun kurslar. Kurs va qulay vaqtni tanlang, ariza qoldiring.", telegram: "@bilim_markazi" },
    bot: { welcome: "Assalomu alaykum! Bilim Markazi kurslariga ariza qoldirish uchun pastdagi tugmani bosing 📚", button: "Ariza yuborish", ask: "Bilim Markazi: ariza 👇" },
  });
