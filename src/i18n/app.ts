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
    templates: "Yoki tayyor shablondan boshlang",
    copy: "Nusxalash", importFile: "Fayldan import", importBad: "Importni bajarib bo‘lmadi",
  },
  build: {
    title: "Ilovangizni yaratyapman",
    hint: "Odatda 30–90 soniya. Sahifani yopmasangiz ham bo‘ladi — hammasi saqlanadi.",
    phrases: ["G‘oyangizni o‘ylab ko‘ryapman…", "Ekranlarni loyihalayapman…", "Ranglar va shriftlarni tanlayapman…", "Hammasini joy-joyiga qo‘yayapman…", "Ilova mantiqini pishiryapman…", "Ma’lumotlar va katalogni tayyorlayapman…", "Bezayapman…", "Hammasi joyidami, tekshiryapman…", "Deyarli tayyor…"],
  },
  tg: { title: "Telegramni ulang", hint: "Botda loyihalaringiz ham ko‘rinadi. Aks holda bot alohida akkaunt ochadi.", btn: "Telegramni ulash", waiting: "Telegramda «Start» va «Ha, ulash» tugmalarini bosing…" },
  notify: { title: "Tayyor", body: "AI so‘rovi bajarildi" },
  billing: {
    chipTitle: "Kreditlar balansi", empty: "Kredit yo‘q", title: "Kreditlar", balance: "Joriy balans", unit: "kredit",
    how: "AI so‘rovlari kreditga sarflanadi: oddiy ilova yaratish taxminan 5–10 kredit, kichik tahrir 1–2 kredit.",
    topupTitle: "Balansni to‘ldirish", topupSoon: "Onlayn to‘lov (Click, Payme) tez orada qo‘shiladi. Hozircha kreditni administrator qo‘shadi.",
    history: "Tarix", noHistory: "Hali harakat yo‘q.", back: "Loyihalar", unmetered: "Siz platforma administratorisiz: kreditlar hisoblanmaydi.",
    reasons: { grant: "Boshlang‘ich kredit", ai: "AI so‘rovi", topup: "To‘ldirish", admin: "Administrator" },
  },
  login: { failed: "Kirish rad etildi. Akkauntingiz bloklangan bo‘lishi mumkin.", telegramOpen: "Telegramni ochish", telegram: "Telegram orqali kirish", telegramWait: "Telegramda «Start» va «Ha, bu men» tugmalarini bosing…", telegramFail: "Kirish bajarilmadi. Qayta urinib ko‘ring.", google: "Google bilan kirish", redirecting: "Yo‘naltirilmoqda…", back: "Bosh sahifa" },
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
    templates: "Or start from a template",
    copy: "Duplicate", importFile: "Import from file", importBad: "Import failed",
  },
  build: {
    title: "Building your app",
    hint: "Usually 30–90 seconds. You can leave the page open — everything is saved.",
    phrases: ["Thinking through your idea…", "Establishing the screens…", "Mixing colors and fonts…", "Arranging everything neatly…", "Cooking up the app logic…", "Preparing the data and catalog…", "Adding polish…", "Double-checking everything…", "Almost there…"],
  },
  tg: { title: "Link Telegram", hint: "Your projects will show up in the bot too. Otherwise the bot opens a separate account.", btn: "Link Telegram", waiting: "Press “Start” and “Yes, link” in Telegram…" },
  notify: { title: "Done", body: "Your AI request finished" },
  billing: {
    chipTitle: "Credit balance", empty: "No credits", title: "Credits", balance: "Current balance", unit: "credits",
    how: "AI requests spend credits: building a typical app takes about 5–10 credits, a small edit 1–2.",
    topupTitle: "Top up", topupSoon: "Online payment (Click, Payme) is coming soon. For now an administrator adds credits.",
    history: "History", noHistory: "Nothing yet.", back: "Projects", unmetered: "You are a platform administrator: credits are not counted.",
    reasons: { grant: "Starting credits", ai: "AI request", topup: "Top-up", admin: "Administrator" },
  },
  login: { failed: "Sign-in was rejected. Your account may be blocked.", telegramOpen: "Open Telegram", telegram: "Sign in with Telegram", telegramWait: "Press “Start” and “Yes, it is me” in Telegram…", telegramFail: "Sign-in failed. Try again.", google: "Sign in with Google", redirecting: "Redirecting…", back: "Home" },
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
    templates: "Или начните с шаблона",
    copy: "Дублировать", importFile: "Импорт из файла", importBad: "Не удалось импортировать",
  },
  build: {
    title: "Создаю ваше приложение",
    hint: "Обычно 30–90 секунд. Страницу можно не закрывать — всё сохранится.",
    phrases: ["Обдумываю вашу идею…", "Проектирую экраны…", "Подбираю цвета и шрифты…", "Раскладываю всё по полочкам…", "Варю логику приложения…", "Готовлю данные и каталог…", "Навожу красоту…", "Проверяю, всё ли на месте…", "Почти готово…"],
  },
  tg: { title: "Привяжите Telegram", hint: "Проекты будут видны и в боте. Иначе бот откроет отдельный аккаунт.", btn: "Привязать Telegram", waiting: "Нажмите «Start» и «Да, привязать» в Telegram…" },
  notify: { title: "Готово", body: "Запрос к ИИ выполнен" },
  billing: {
    chipTitle: "Баланс кредитов", empty: "Нет кредитов", title: "Кредиты", balance: "Текущий баланс", unit: "кредитов",
    how: "ИИ-запросы тратят кредиты: создание обычного приложения — около 5–10 кредитов, небольшая правка — 1–2.",
    topupTitle: "Пополнение", topupSoon: "Онлайн-оплата (Click, Payme) скоро появится. Пока кредиты добавляет администратор.",
    history: "История", noHistory: "Пока ничего нет.", back: "Проекты", unmetered: "Вы администратор платформы: кредиты не списываются.",
    reasons: { grant: "Стартовые кредиты", ai: "ИИ-запрос", topup: "Пополнение", admin: "Администратор" },
  },
  login: { failed: "Вход отклонён. Возможно, ваш аккаунт заблокирован.", telegramOpen: "Открыть Telegram", telegram: "Войти через Telegram", telegramWait: "Нажмите «Start» и «Да, это я» в Telegram…", telegramFail: "Не удалось войти. Попробуйте ещё раз.", google: "Войти через Google", redirecting: "Перенаправляем…", back: "На главную" },
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
    templates: "Yamasa tayın úlgiden baslań",
    copy: "Nusqalaw", importFile: "Fayldan import", importBad: "Importtı orınlaw múmkin bolmadı",
  },
  build: {
    title: "Ilovańızdı jaratıp atırman",
    hint: "Odatda 30–90 sekund. Betti jabıwdıń keregi joq — hámmesi saqlanadı.",
    phrases: ["Ideyańızdı oylap atırman…", "Ekranlardı joybarlap atırman…", "Reńler hám shriftlerdi tańlap atırman…", "Hámmesin ornı-ornına qoyıp atırman…", "Ilova logikasın pisirip atırman…", "Maǵlıwmat hám katalogtı tayarlap atırman…", "Bezep atırman…", "Hámmesi ornındama, tekserip atırman…", "Derlik tayın…"],
  },
  tg: { title: "Telegramdı ulań", hint: "Joybarlarıńız botta da kórinedi. Ápiwayı halda bot bólek akkaunt ashadı.", btn: "Telegramdı ulaw", waiting: "Telegramda «Start» hám «Awa, ulaw» túymelerin basıń…" },
  notify: { title: "Tayın", body: "AI sorawı orınlandı" },
  billing: {
    chipTitle: "Kredit balansı", empty: "Kredit joq", title: "Kreditler", balance: "Házirgi balans", unit: "kredit",
    how: "AI sorawları kreditke jumsaladı: ápiwayı ilova jaratıw shama menen 5–10 kredit, kishi dúzetiw 1–2 kredit.",
    topupTitle: "Balansti toltırıw", topupSoon: "Onlayn tólem (Click, Payme) tezde qosıladı. Házirshe kreditti administrator qosadı.",
    history: "Tariyx", noHistory: "Házirshe háreket joq.", back: "Joybarlar", unmetered: "Siz platforma administratorısız: kreditler esaplanbaydı.",
    reasons: { grant: "Baslanǵısh kredit", ai: "AI sorawı", topup: "Toltırıw", admin: "Administrator" },
  },
  login: { failed: "Kiriw ret etildi. Akkauntıńız bloklanǵan bolıwı múmkin.", telegramOpen: "Telegramdı ashıw", telegram: "Telegram arqalı kiriw", telegramWait: "Telegramda «Start» hám «Awa, bul men» túymelerin basıń…", telegramFail: "Kiriw orınlanbadı. Qayta urınıp kóriń.", google: "Google menen kiriw", redirecting: "Jónetilmekte…", back: "Bas bet" },
};

export const APP_DICT: Record<Locale, AppDict> = { uz, en, ru, kaa };

export function fmt(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s;
}
