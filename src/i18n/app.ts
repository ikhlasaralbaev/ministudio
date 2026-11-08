// Interface copy for the signed-in app (shell, dashboard, login) in four languages.
// Studio, settings, data and admin interiors are still Uzbek-only. Keep every language in the shape of `uz`.
import type { Locale } from "./config";

const uz = {
  tagline: "Promptdan Telegram Mini App’gacha",
  nav: { projects: "Loyihalar", studio: "Studio", settings: "Sozlamalar", data: "Ma’lumotlar", schema: "Tuzilma", admin: "Admin", signOut: "Chiqish", language: "Til", project: "Loyiha" },
  banner: { admin: "Admin rejimi: siz {email} loyihasidasiz. Harakatlaringiz jurnalga yoziladi.", suspended: "Loyiha administrator tomonidan to‘xtatilgan: ilova va bot foydalanuvchilar uchun ishlamaydi.", owner: "egasi" },
  dash: {
    ideaTitle: "Nima yaratamiz?", ideaHint: "Biznesingizni bir-ikki jumlada tasvirlang. AI ilovani o‘zi yaratadi, keyin bir bosishda e’lon qilasiz.",
    ideaPlaceholder: "Masalan: Nukusdagi gul do‘koni uchun katalog, yetkazib berish va Click to‘lovi", ideaCreate: "Ilovani yaratish", ideaCreating: "Yaratilmoqda…", loading: "Yuklanmoqda…",
    examples: ["Kafe uchun menyu, savat va yetkazib berish", "Sartaroshxonaga yozilish: xizmat, usta va vaqt", "O‘quv markazi: kurslar katalogi va ariza", "Kompyuter klubi: kabinalar va bron qilish"],
    mine: "Mening loyihalarim", member: "Men a’zo bo‘lgan loyihalar", empty: "Hali loyiha yo‘q. Birinchisini yarating.",
    screens: "{n} ekran", blank: "bo‘sh", edit: "Tahrirlash", view: "Ko‘rish", suspended: "To‘xtatilgan",
    published: "v{n} e’lon qilingan", unpublished: "e’lon qilinmagan", del: "O‘chirish",
    confirm: "“{name}” loyihasi, uning buyurtmalari va to‘lovlari butunlay o‘chiriladi. Qaytarib bo‘lmaydi.\n\nTasdiqlash uchun loyiha nomini yozing:",
    mismatch: "Nom mos kelmadi, loyiha o‘chirilmadi.",
  },
  build: {
    title: "Ilovangizni yaratyapman",
    hint: "Odatda 30–90 soniya. Sahifani yopmasangiz ham bo‘ladi — hammasi saqlanadi.",
    phrases: ["G‘oyangizni o‘ylab ko‘ryapman…", "Ekranlarni loyihalayapman…", "Ranglar va shriftlarni tanlayapman…", "Hammasini joy-joyiga qo‘yayapman…", "Ilova mantiqini pishiryapman…", "Ma’lumotlar va katalogni tayyorlayapman…", "Bezayapman…", "Hammasi joyidami, tekshiryapman…", "Deyarli tayyor…"],
  },
  tg: { title: "Telegramni ulang", hint: "Botda loyihalaringiz ham ko‘rinadi. Aks holda bot alohida akkaunt ochadi.", btn: "Telegramni ulash", waiting: "Telegramda «Start» va «Ha, ulash» tugmalarini bosing…" },
  login: { failed: "Kirish rad etildi. Akkauntingiz bloklangan bo‘lishi mumkin.", google: "Google bilan kirish", redirecting: "Yo‘naltirilmoqda…", back: "Bosh sahifa" },
};

export type AppDict = typeof uz;

const en: AppDict = {
  tagline: "From a prompt to a Telegram Mini App",
  nav: { projects: "Projects", studio: "Studio", settings: "Settings", data: "Data", schema: "Schema", admin: "Admin", signOut: "Sign out", language: "Language", project: "Project" },
  banner: { admin: "Admin mode: you are inside {email}’s project. Your actions are logged.", suspended: "This project was suspended by an administrator: the app and bot are offline for users.", owner: "the owner" },
  dash: {
    ideaTitle: "What are we building?", ideaHint: "Describe your business in a sentence or two. AI builds the app, then you publish it in one tap.",
    ideaPlaceholder: "For example: a flower shop in Nukus with a catalog, delivery and Click payments", ideaCreate: "Create the app", ideaCreating: "Creating…", loading: "Loading…",
    examples: ["A cafe with a menu, cart and delivery", "A barbershop: services, barbers and time-slot booking", "A learning center: course catalog and sign-up", "A gaming club: rooms and booking"],
    mine: "My projects", member: "Projects I’m a member of", empty: "No projects yet. Create your first one.",
    screens: "{n} screens", blank: "empty", edit: "Can edit", view: "View only", suspended: "Suspended",
    published: "v{n} published", unpublished: "not published", del: "Delete",
    confirm: "Project “{name}”, its orders and payments will be deleted permanently. This cannot be undone.\n\nType the project name to confirm:",
    mismatch: "The name did not match, the project was not deleted.",
  },
  build: {
    title: "Building your app",
    hint: "Usually 30–90 seconds. You can leave the page open — everything is saved.",
    phrases: ["Thinking through your idea…", "Establishing the screens…", "Mixing colors and fonts…", "Arranging everything neatly…", "Cooking up the app logic…", "Preparing the data and catalog…", "Adding polish…", "Double-checking everything…", "Almost there…"],
  },
  tg: { title: "Link Telegram", hint: "Your projects will show up in the bot too. Otherwise the bot opens a separate account.", btn: "Link Telegram", waiting: "Press “Start” and “Yes, link” in Telegram…" },
  login: { failed: "Sign-in was rejected. Your account may be blocked.", google: "Sign in with Google", redirecting: "Redirecting…", back: "Home" },
};

const ru: AppDict = {
  tagline: "От промпта до Telegram Mini App",
  nav: { projects: "Проекты", studio: "Студия", settings: "Настройки", data: "Данные", schema: "Структура", admin: "Админ", signOut: "Выйти", language: "Язык", project: "Проект" },
  banner: { admin: "Режим админа: вы в проекте {email}. Ваши действия записываются в журнал.", suspended: "Проект приостановлен администратором: приложение и бот для пользователей не работают.", owner: "владельца" },
  dash: {
    ideaTitle: "Что создаём?", ideaHint: "Опишите бизнес в паре фраз. ИИ сам создаст приложение, а вы опубликуете его одним нажатием.",
    ideaPlaceholder: "Например: цветочный магазин в Нукусе — каталог, доставка и оплата Click", ideaCreate: "Создать приложение", ideaCreating: "Создаём…", loading: "Загрузка…",
    examples: ["Кафе: меню, корзина и доставка", "Барбершоп: услуги, мастера и запись на время", "Учебный центр: каталог курсов и заявки", "Компьютерный клуб: кабины и бронирование"],
    mine: "Мои проекты", member: "Проекты, где я участник", empty: "Проектов пока нет. Создайте первый.",
    screens: "экранов: {n}", blank: "пусто", edit: "Редактор", view: "Просмотр", suspended: "Приостановлен",
    published: "v{n} опубликован", unpublished: "не опубликован", del: "Удалить",
    confirm: "Проект «{name}», его заказы и платежи будут удалены навсегда. Отменить нельзя.\n\nДля подтверждения введите название проекта:",
    mismatch: "Название не совпало, проект не удалён.",
  },
  build: {
    title: "Создаю ваше приложение",
    hint: "Обычно 30–90 секунд. Страницу можно не закрывать — всё сохранится.",
    phrases: ["Обдумываю вашу идею…", "Проектирую экраны…", "Подбираю цвета и шрифты…", "Раскладываю всё по полочкам…", "Варю логику приложения…", "Готовлю данные и каталог…", "Навожу красоту…", "Проверяю, всё ли на месте…", "Почти готово…"],
  },
  tg: { title: "Привяжите Telegram", hint: "Проекты будут видны и в боте. Иначе бот откроет отдельный аккаунт.", btn: "Привязать Telegram", waiting: "Нажмите «Start» и «Да, привязать» в Telegram…" },
  login: { failed: "Вход отклонён. Возможно, ваш аккаунт заблокирован.", google: "Войти через Google", redirecting: "Перенаправляем…", back: "На главную" },
};

const kaa: AppDict = {
  tagline: "Promptdan Telegram Mini App’qa shekem",
  nav: { projects: "Joybarlar", studio: "Studio", settings: "Sazlawlar", data: "Maǵlıwmatlar", schema: "Dúzilis", admin: "Admin", signOut: "Shıǵıw", language: "Til", project: "Joybar" },
  banner: { admin: "Admin rejimi: siz {email} joybarındasız. Háreketlerińiz jurnalǵa jazıladı.", suspended: "Joybar administrator tárepinen toqtatılǵan: ilova hám bot paydalanıwshılar ushın islemeydi.", owner: "iyesi" },
  dash: {
    ideaTitle: "Ne jaratamız?", ideaHint: "Biznesińizdi bir-eki gápte súwretleń. AI ilovanı ózi jaratadı, soń bir basıwda járiyalaysız.",
    ideaPlaceholder: "Mısalı: Nókistegi gúl dúkanı ushın katalog, jetkizip beriw hám Click tólemi", ideaCreate: "Ilovanı jaratıw", ideaCreating: "Jaratılmaqta…", loading: "Júklenbekte…",
    examples: ["Kafe ushın menyu, sebet hám jetkizip beriw", "Shashtarazxanaǵa jazılıw: xızmet, sheber hám waqıt", "Oqıw orayı: kurslar katalogı hám arza", "Kompyuter klubı: kabinalar hám bron"],
    mine: "Meniń joybarlarım", member: "Men aǵza bolǵan joybarlar", empty: "Házirshe joybar joq. Birinshisin jaratıń.",
    screens: "{n} ekran", blank: "bos", edit: "Dúzetiw", view: "Kóriw", suspended: "Toqtatılǵan",
    published: "v{n} járiyalanǵan", unpublished: "járiyalanbaǵan", del: "Óshiriw",
    confirm: "“{name}” joybarı, onıń buyırtpaları hám tólemleri pútkilley óshiriledi. Qaytarıp bolmaydı.\n\nRastlaw ushın joybar atın jazıń:",
    mismatch: "Atı sáykes kelmedi, joybar óshirilmedi.",
  },
  build: {
    title: "Ilovańızdı jaratıp atırman",
    hint: "Odatda 30–90 sekund. Betti jabıwdıń keregi joq — hámmesi saqlanadı.",
    phrases: ["Ideyańızdı oylap atırman…", "Ekranlardı joybarlap atırman…", "Reńler hám shriftlerdi tańlap atırman…", "Hámmesin ornı-ornına qoyıp atırman…", "Ilova logikasın pisirip atırman…", "Maǵlıwmat hám katalogtı tayarlap atırman…", "Bezep atırman…", "Hámmesi ornındama, tekserip atırman…", "Derlik tayın…"],
  },
  tg: { title: "Telegramdı ulań", hint: "Joybarlarıńız botta da kórinedi. Ápiwayı halda bot bólek akkaunt ashadı.", btn: "Telegramdı ulaw", waiting: "Telegramda «Start» hám «Awa, ulaw» túymelerin basıń…" },
  login: { failed: "Kiriw ret etildi. Akkauntıńız bloklanǵan bolıwı múmkin.", google: "Google menen kiriw", redirecting: "Jónetilmekte…", back: "Bas bet" },
};

export const APP_DICT: Record<Locale, AppDict> = { uz, en, ru, kaa };

export function fmt(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s;
}
