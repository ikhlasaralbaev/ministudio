// Public landing page copy in four languages. Keep every language in the same shape as `uz`.
import type { Locale } from "./config";

export interface HomeDict {
  meta: { title: string; description: string };
  nav: { studio: string; features: string; bots: string; ship: string; login: string; start: string; cabinet: string };
  pill: { tag: string; text: string };
  h1a: string;
  h1b: string;
  lede: string;
  placeholder: string;
  create: string;
  chips: { icon: string; label: string; text: string }[];
  studio: { h2: string; lead: string; tabs: { id: string; label: string; icon: string; url: string; cap: string }[]; frame: string };
  features: {
    h2: string; lead: string;
    pay: { t: string; p: string; sent: string; rejected: string; server: string; cur: string };
    chat: { t: string; p: string };
    data: { t: string; p: string; cols: [string, string, string] };
    team: { t: string; p: string; roles: [string, string, string] };
  };
  bots: { h2: string; lead: string; items: { icon: string; name: string; desc: string; tags: string[] }[] };
  ship: { h2: string; lead: string; stats: [string, string][]; cta: string; term: { k: "cmd" | "dm" | "ok" | "live"; text: string }[] };
  cta: { h2: string; p: string; btn: string };
  footer: { blurb: string; product: string; language: string; privacy: string };
}

const uz: HomeDict = {
  meta: { title: "MiniStudio: Telegram ilovalari yaratish platformasi", description: "Biznesingizni tasvirlang: AI menyu, savat, to‘lov va bot bilan ishlaydigan Telegram Mini App yaratadi." },
  nav: { studio: "Studio", features: "Imkoniyatlar", bots: "Botlar", ship: "Publish", login: "Kirish", start: "Bepul boshlash", cabinet: "Kabinet" },
  pill: { tag: "Yangi", text: "Opus 5.5 va Sonnet 5.5 qo‘llab-quvvatlanadi" },
  h1a: "Telegram ilovalari uchun",
  h1b: "yaratish platformasi",
  lede: "Biznesingizni tasvirlang: AI menyu, savat, to‘lov va bot bilan ishlaydigan Mini App yaratadi. Tahrirlang va bir bosishda ishga tushiring.",
  placeholder: "Qanday ilova yaratamiz? Masalan: Nukusdagi gul do‘koni uchun katalog, yetkazib berish va Click to‘lovi",
  create: "Yaratish",
  chips: [
    { icon: "Coffee", label: "Kafe", text: "Kafe uchun menyu, savat va yetkazib berish" },
    { icon: "Scissors", label: "Sartaroshxona", text: "Sartaroshxonaga xizmat, usta va vaqt tanlab yozilish" },
    { icon: "GraduationCap", label: "O‘quv markazi", text: "Kurslar katalogi va ro‘yxatdan o‘tish formasi" },
    { icon: "Wallet", label: "Hisob-kitob", text: "Daromad va xarajatlarni yuritadigan hisob-kitob daftari" },
    { icon: "Wrench", label: "Avtoservis", text: "Avtoservisga navbat va narxlar ro‘yxati" },
  ],
  studio: {
    h2: "Butun kabinet bir joyda",
    lead: "Quyidagi panel jonli: sahifani aylantirsangiz, u bo‘limlarni o‘zi almashtiradi. Istasangiz o‘zingiz ham bosib ko‘ring.",
    frame: "MiniStudio paneli",
    tabs: [
      { id: "chat", label: "Chat", icon: "ChatTeardropText", url: "studio", cap: "Biznesingizni yozing: AI ekranlar, ranglar va mantiqni yaratadi. Har so‘rovda sarflangan token ko‘rinib turadi." },
      { id: "edit", label: "Tahrirlash", icon: "CursorClick", url: "studio/advanced", cap: "Telefondagi elementni tanlang va nima o‘zgarishini yozing. Advanced rejimda qatlamlar va xususiyatlar qo‘lda." },
      { id: "data", label: "Ma’lumotlar", icon: "Database", url: "data", cap: "Bot foydalanuvchilari, buyurtmalar va to‘lovlar. Qidiring, filtrlang va bir bosishda Excel’ga yuklab oling." },
      { id: "team", label: "Jamoa", icon: "UsersThree", url: "team", cap: "Hamkasblarni qo‘shing: kimdir faqat ko‘radi, kimdir tahrirlaydi, kimdir a’zolarni boshqaradi." },
      { id: "admin", label: "Admin", icon: "ShieldCheck", url: "admin", cap: "Platforma admini: foydalanuvchilar, bloklash, loyihalar va barcha harakatlar jurnali." },
    ],
  },
  features: {
    h2: "Ilova qurish uchun kerak bo‘lgan hamma narsa bir joyda",
    lead: "G‘oyadan jonli botgacha: yaratish, tahrirlash, to‘lov, ma’lumot va jamoa.",
    pay: { t: "Click va Payme to‘lovlari", p: "Summa har doim serverda katalog narxidan qayta hisoblanadi. Mijoz uni o‘zgartira olmaydi.", sent: "mijoz yubordi", rejected: "rad etildi", server: "server hisobladi", cur: "so‘m" },
    chat: { t: "Gaplashib tahrirlang", p: "Elementni bosing va yozing. Qolganini AI qiladi." },
    data: { t: "Mijoz ma’lumoti sizda", p: "Buyurtmalar va foydalanuvchilar. Bir bosishda Excel.", cols: ["Buyurtma", "Mijoz", "Summa"] },
    team: { t: "Jamoa va rollar", p: "Hamkasblarni qo‘shing: kimdir ko‘radi, kimdir tahrirlaydi.", roles: ["Ega", "Tahrirlaydi", "Ko‘radi"] },
  },
  bots: {
    h2: "Har qanday Telegram bot uchun",
    lead: "Namunalar: ularning har biri bitta jumla bilan boshlangan.",
    items: [
      { icon: "Storefront", name: "onlayn-dokon", desc: "Katalog, savat, Click va Payme", tags: ["click", "payme", "savat"] },
      { icon: "CalendarCheck", name: "bron-bot", desc: "Xizmat, usta va bo‘sh vaqtlar", tags: ["bron", "vaqt"] },
      { icon: "GraduationCap", name: "oquv-markazi", desc: "Kurslar va ariza formasi", tags: ["kurs", "ariza"] },
      { icon: "Wallet", name: "hisob-kitob", desc: "Daromad va xarajat tarixi", tags: ["moliya", "tarix"] },
      { icon: "ForkKnife", name: "restoran-menyu", desc: "Buyurtma va yetkazib berish", tags: ["menyu", "yetkazish"] },
      { icon: "Megaphone", name: "lid-yigish", desc: "Mijoz ma’lumotlari Excel’ga", tags: ["lid", "excel"] },
    ],
  },
  ship: {
    h2: "Yozdingiz, Publish bosdingiz — ishlayapti",
    lead: "Server, domen, HTTPS va bot ulanishi haqida o‘ylab o‘tirmaysiz. Publish hammasini sizning o‘rningizga qiladi.",
    stats: [["30s", "Tasvirlash"], ["1m", "Tahrirlash"], ["1×", "Publish"]],
    cta: "Bepul boshlash",
    term: [
      { k: "cmd", text: "ministudio publish lazzat-kafe" },
      { k: "dm", text: "Ilova tekshirilmoqda..." },
      { k: "ok", text: "Hujjat tekshirildi: 3 ekran" },
      { k: "ok", text: "Bot ulandi @lazzat_kafe_bot" },
      { k: "ok", text: "To‘lov: Click, Payme" },
      { k: "ok", text: "HTTPS va webhook sozlandi" },
      { k: "live", text: "Jonli https://t.me/lazzat_kafe_bot" },
    ],
  },
  cta: { h2: "Birinchi ilovangizni bugun yarating", p: "Google bilan kiring va biznesingizni tasvirlang.", btn: "Google bilan davom etish" },
  footer: { blurb: "Telegram Mini App’lar yaratish platformasi.", product: "Mahsulot", language: "Til", privacy: "Hozircha bepul" },
};

const en: HomeDict = {
  meta: { title: "MiniStudio: a builder for Telegram apps", description: "Describe your business and AI builds a Telegram Mini App with menu, cart, payments and a bot." },
  nav: { studio: "Studio", features: "Features", bots: "Bots", ship: "Publish", login: "Sign in", start: "Start free", cabinet: "Dashboard" },
  pill: { tag: "New", text: "Opus 5.5 and Sonnet 5.5 supported" },
  h1a: "The builder for",
  h1b: "Telegram apps",
  lede: "Describe your business: AI builds a Mini App with menu, cart, payments and a bot. Edit it and launch in one click.",
  placeholder: "What are we building? For example: a flower shop in Nukus with a catalog, delivery and Click payments",
  create: "Create",
  chips: [
    { icon: "Coffee", label: "Cafe", text: "A cafe with a menu, cart and delivery" },
    { icon: "Scissors", label: "Barbershop", text: "A barbershop with services, barbers and time-slot booking" },
    { icon: "GraduationCap", label: "Learning center", text: "A course catalog with a sign-up form" },
    { icon: "Wallet", label: "Finance", text: "A ledger that tracks income and expenses" },
    { icon: "Wrench", label: "Car service", text: "A car service with a queue and a price list" },
  ],
  studio: {
    h2: "Your whole dashboard in one place",
    lead: "The panel below is live: it switches sections as you scroll. Click around yourself if you like.",
    frame: "MiniStudio dashboard",
    tabs: [
      { id: "chat", label: "Chat", icon: "ChatTeardropText", url: "studio", cap: "Describe your business: AI builds screens, colors and logic. Tokens spent on every request stay visible." },
      { id: "edit", label: "Editing", icon: "CursorClick", url: "studio/advanced", cap: "Pick an element on the phone and say what should change. Advanced mode gives you layers and properties by hand." },
      { id: "data", label: "Data", icon: "Database", url: "data", cap: "Bot users, orders and payments. Search, filter and export to Excel in one click." },
      { id: "team", label: "Team", icon: "UsersThree", url: "team", cap: "Add teammates: some only view, some edit, some manage members." },
      { id: "admin", label: "Admin", icon: "ShieldCheck", url: "admin", cap: "Platform admin: users, blocking, projects and a log of every action." },
    ],
  },
  features: {
    h2: "Everything you need to build an app",
    lead: "From idea to a live bot: build, edit, payments, data and team.",
    pay: { t: "Click and Payme payments", p: "The amount is always recomputed on the server from catalog prices. The customer cannot change it.", sent: "customer sent", rejected: "rejected", server: "server computed", cur: "UZS" },
    chat: { t: "Edit by chatting", p: "Select an element and type. AI does the rest." },
    data: { t: "Customer data is yours", p: "Orders and users. Excel in one click.", cols: ["Order", "Customer", "Total"] },
    team: { t: "Team and roles", p: "Add teammates: some view, some edit.", roles: ["Owner", "Can edit", "View only"] },
  },
  bots: {
    h2: "For any Telegram bot",
    lead: "Samples: each of them started from a single sentence.",
    items: [
      { icon: "Storefront", name: "online-shop", desc: "Catalog, cart, Click and Payme", tags: ["click", "payme", "cart"] },
      { icon: "CalendarCheck", name: "booking-bot", desc: "Services, staff and free slots", tags: ["booking", "time"] },
      { icon: "GraduationCap", name: "learning-center", desc: "Courses and an application form", tags: ["courses", "forms"] },
      { icon: "Wallet", name: "finance-ledger", desc: "Income and expense history", tags: ["finance", "history"] },
      { icon: "ForkKnife", name: "restaurant-menu", desc: "Orders and delivery", tags: ["menu", "delivery"] },
      { icon: "Megaphone", name: "lead-capture", desc: "Customer data straight to Excel", tags: ["leads", "excel"] },
    ],
  },
  ship: {
    h2: "Write it, hit Publish, it’s live",
    lead: "No servers, domains, HTTPS or bot wiring to think about. Publish does all of it for you.",
    stats: [["30s", "Describe"], ["1m", "Edit"], ["1×", "Publish"]],
    cta: "Start free",
    term: [
      { k: "cmd", text: "ministudio publish lazzat-cafe" },
      { k: "dm", text: "Checking the app..." },
      { k: "ok", text: "Document valid: 3 screens" },
      { k: "ok", text: "Bot connected @lazzat_cafe_bot" },
      { k: "ok", text: "Payments: Click, Payme" },
      { k: "ok", text: "HTTPS and webhook configured" },
      { k: "live", text: "Live https://t.me/lazzat_cafe_bot" },
    ],
  },
  cta: { h2: "Build your first app today", p: "Sign in with Google and describe your business.", btn: "Continue with Google" },
  footer: { blurb: "A platform for building Telegram Mini Apps.", product: "Product", language: "Language", privacy: "Free for now" },
};

const ru: HomeDict = {
  meta: { title: "MiniStudio: платформа для Telegram-приложений", description: "Опишите бизнес, а ИИ создаст Telegram Mini App с меню, корзиной, оплатой и ботом." },
  nav: { studio: "Студия", features: "Возможности", bots: "Боты", ship: "Публикация", login: "Войти", start: "Начать бесплатно", cabinet: "Кабинет" },
  pill: { tag: "Новое", text: "Поддерживаются Opus 5.5 и Sonnet 5.5" },
  h1a: "Платформа для создания",
  h1b: "Telegram-приложений",
  lede: "Опишите бизнес: ИИ создаст Mini App с меню, корзиной, оплатой и ботом. Отредактируйте и запустите одним нажатием.",
  placeholder: "Какое приложение создаём? Например: цветочный магазин в Нукусе с каталогом, доставкой и оплатой Click",
  create: "Создать",
  chips: [
    { icon: "Coffee", label: "Кафе", text: "Меню, корзина и доставка для кафе" },
    { icon: "Scissors", label: "Барбершоп", text: "Услуги, мастера и запись на время для барбершопа" },
    { icon: "GraduationCap", label: "Учебный центр", text: "Каталог курсов и форма записи" },
    { icon: "Wallet", label: "Финансы", text: "Тетрадь учёта доходов и расходов" },
    { icon: "Wrench", label: "Автосервис", text: "Очередь и прайс-лист для автосервиса" },
  ],
  studio: {
    h2: "Весь кабинет в одном месте",
    lead: "Панель ниже живая: она сама переключает разделы при прокрутке. Можете нажимать и сами.",
    frame: "Панель MiniStudio",
    tabs: [
      { id: "chat", label: "Чат", icon: "ChatTeardropText", url: "studio", cap: "Опишите бизнес: ИИ создаст экраны, цвета и логику. Потраченные токены видны по каждому запросу." },
      { id: "edit", label: "Правка", icon: "CursorClick", url: "studio/advanced", cap: "Выберите элемент на телефоне и напишите, что изменить. В режиме Advanced слои и свойства настраиваются вручную." },
      { id: "data", label: "Данные", icon: "Database", url: "data", cap: "Пользователи бота, заказы и платежи. Ищите, фильтруйте и выгружайте в Excel одним нажатием." },
      { id: "team", label: "Команда", icon: "UsersThree", url: "team", cap: "Добавляйте коллег: одни только смотрят, другие редактируют, третьи управляют участниками." },
      { id: "admin", label: "Админ", icon: "ShieldCheck", url: "admin", cap: "Админ платформы: пользователи, блокировка, проекты и журнал всех действий." },
    ],
  },
  features: {
    h2: "Всё для создания приложения в одном месте",
    lead: "От идеи до живого бота: создание, правка, оплата, данные и команда.",
    pay: { t: "Оплата Click и Payme", p: "Сумма всегда пересчитывается на сервере по ценам каталога. Клиент не может её изменить.", sent: "клиент отправил", rejected: "отклонено", server: "сервер посчитал", cur: "сум" },
    chat: { t: "Правьте в диалоге", p: "Выберите элемент и напишите. Остальное сделает ИИ." },
    data: { t: "Данные клиентов у вас", p: "Заказы и пользователи. Excel одним нажатием.", cols: ["Заказ", "Клиент", "Сумма"] },
    team: { t: "Команда и роли", p: "Добавляйте коллег: одни смотрят, другие редактируют.", roles: ["Владелец", "Редактор", "Просмотр"] },
  },
  bots: {
    h2: "Для любого Telegram-бота",
    lead: "Примеры: каждый начался с одной фразы.",
    items: [
      { icon: "Storefront", name: "интернет-магазин", desc: "Каталог, корзина, Click и Payme", tags: ["click", "payme", "корзина"] },
      { icon: "CalendarCheck", name: "бот-записи", desc: "Услуги, мастера и свободное время", tags: ["запись", "время"] },
      { icon: "GraduationCap", name: "учебный-центр", desc: "Курсы и форма заявки", tags: ["курсы", "заявка"] },
      { icon: "Wallet", name: "учёт-финансов", desc: "История доходов и расходов", tags: ["финансы", "история"] },
      { icon: "ForkKnife", name: "меню-ресторана", desc: "Заказ и доставка", tags: ["меню", "доставка"] },
      { icon: "Megaphone", name: "сбор-лидов", desc: "Данные клиентов в Excel", tags: ["лиды", "excel"] },
    ],
  },
  ship: {
    h2: "Написали, нажали «Опубликовать», работает",
    lead: "Не думайте о сервере, домене, HTTPS и подключении бота. Публикация сделает всё за вас.",
    stats: [["30с", "Описание"], ["1м", "Правка"], ["1×", "Публикация"]],
    cta: "Начать бесплатно",
    term: [
      { k: "cmd", text: "ministudio publish lazzat-cafe" },
      { k: "dm", text: "Проверяем приложение..." },
      { k: "ok", text: "Документ проверен: 3 экрана" },
      { k: "ok", text: "Бот подключён @lazzat_cafe_bot" },
      { k: "ok", text: "Оплата: Click, Payme" },
      { k: "ok", text: "HTTPS и вебхук настроены" },
      { k: "live", text: "Работает https://t.me/lazzat_cafe_bot" },
    ],
  },
  cta: { h2: "Создайте первое приложение сегодня", p: "Войдите через Google и опишите свой бизнес.", btn: "Продолжить через Google" },
  footer: { blurb: "Платформа для создания Telegram Mini App.", product: "Продукт", language: "Язык", privacy: "Пока бесплатно" },
};

const kaa: HomeDict = {
  meta: { title: "MiniStudio: Telegram ilovaların jaratıw platforması", description: "Biznesińizdi súwretleń: AI menyu, sebet, tólem hám bot menen islewshi Telegram Mini App jaratadı." },
  nav: { studio: "Studio", features: "Imkaniyatlar", bots: "Botlar", ship: "Publish", login: "Kiriw", start: "Biypul baslaw", cabinet: "Kabinet" },
  pill: { tag: "Taza", text: "Opus 5.5 hám Sonnet 5.5 qollap-quwatlanadı" },
  h1a: "Telegram ilovaları ushın",
  h1b: "jaratıw platforması",
  lede: "Biznesińizdi súwretleń: AI menyu, sebet, tólem hám bot menen islewshi Mini App jaratadı. Dúzetiń hám bir basıwda iske túsiriń.",
  placeholder: "Qanday ilova jaratamız? Mısalı: Nókistegi gúl dúkanı ushın katalog, jetkizip beriw hám Click tólemi",
  create: "Jaratıw",
  chips: [
    { icon: "Coffee", label: "Kafe", text: "Kafe ushın menyu, sebet hám jetkizip beriw" },
    { icon: "Scissors", label: "Shashtarazxana", text: "Shashtarazxanaǵa xızmet, sheber hám waqıt tańlap jazılıw" },
    { icon: "GraduationCap", label: "Oqıw orayı", text: "Kurslar katalogı hám dizimnen ótiw forması" },
    { icon: "Wallet", label: "Esap-kitap", text: "Kirim hám shıǵımlardı júrgiziwshi esap-kitap dápteri" },
    { icon: "Wrench", label: "Avtoservis", text: "Avtoservisge nawbet hám bahalar dizimi" },
  ],
  studio: {
    h2: "Pútkil kabinet bir jerde",
    lead: "Tómendegi panel janlı: sahifani aylandırsańız, ol bólimlerdi ózi almastıradı. Qáleseńiz ózińiz de basıp kóriń.",
    frame: "MiniStudio paneli",
    tabs: [
      { id: "chat", label: "Chat", icon: "ChatTeardropText", url: "studio", cap: "Biznesińizdi jazıń: AI ekranlar, reńler hám logikanı jaratadı. Hár sorawda jumsalǵan token kórinip turadı." },
      { id: "edit", label: "Dúzetiw", icon: "CursorClick", url: "studio/advanced", cap: "Telefondaǵı elementti tańlań hám ne ózgeriwi kerekligin jazıń. Advanced rejiminde qatlamlar hám qásiyetler qolda." },
      { id: "data", label: "Maǵlıwmatlar", icon: "Database", url: "data", cap: "Bot paydalanıwshıları, buyırtpalar hám tólemler. Izleń, filtrleń hám bir basıwda Excel’ge júkleń." },
      { id: "team", label: "Topar", icon: "UsersThree", url: "team", cap: "Hámkárlerińizdi qosıń: kimdur tek kóredi, kimdur dúzetedi, kimdur aǵzalardı basqaradı." },
      { id: "admin", label: "Admin", icon: "ShieldCheck", url: "admin", cap: "Platforma admini: paydalanıwshılar, bloklaw, joybarlar hám barlıq háreketler jurnalı." },
    ],
  },
  features: {
    h2: "Ilova qurıw ushın kerek hámme nárse bir jerde",
    lead: "Ideyadan janlı botqa shekem: jaratıw, dúzetiw, tólem, maǵlıwmat hám komanda.",
    pay: { t: "Click hám Payme tólemleri", p: "Summa hárdayım serverde katalog bahasınan qayta esaplanadı. Klient onı ózgerte almaydı.", sent: "klient jiberdi", rejected: "ret etildi", server: "server esapladı", cur: "swm" },
    chat: { t: "Sóylesip dúzetiń", p: "Elementti basıń hám jazıń. Qalǵanın AI isleydi." },
    data: { t: "Klient maǵlıwmatı sizde", p: "Buyırtpalar hám paydalanıwshılar. Bir basıwda Excel.", cols: ["Buyırtpa", "Klient", "Summa"] },
    team: { t: "Topar hám rollar", p: "Hámkárlerińizdi qosıń: kimdur kóredi, kimdur dúzetedi.", roles: ["Iyesi", "Dúzetedi", "Kóredi"] },
  },
  bots: {
    h2: "Hár qanday Telegram bot ushın",
    lead: "Úlgiler: olardıń hár biri bir gápten baslanǵan.",
    items: [
      { icon: "Storefront", name: "onlayn-dúkan", desc: "Katalog, sebet, Click hám Payme", tags: ["click", "payme", "sebet"] },
      { icon: "CalendarCheck", name: "bron-bot", desc: "Xızmet, sheber hám bos waqıtlar", tags: ["bron", "waqıt"] },
      { icon: "GraduationCap", name: "oqıw-orayı", desc: "Kurslar hám arza forması", tags: ["kurs", "arza"] },
      { icon: "Wallet", name: "esap-kitap", desc: "Kirim hám shıǵım tariyxı", tags: ["finans", "tariyx"] },
      { icon: "ForkKnife", name: "restoran-menyu", desc: "Buyırtpa hám jetkizip beriw", tags: ["menyu", "jetkiziw"] },
      { icon: "Megaphone", name: "lid-jıynaw", desc: "Klient maǵlıwmatları Excel’ge", tags: ["lid", "excel"] },
    ],
  },
  ship: {
    h2: "Jazdıńız, Publish basdıńız — islep tur",
    lead: "Server, domen, HTTPS hám bot ulanıwı haqqında oylanbaysız. Publish hámmesin sizdiń ornıńızǵa isleydi.",
    stats: [["30s", "Súwretlew"], ["1m", "Dúzetiw"], ["1×", "Publish"]],
    cta: "Biypul baslaw",
    term: [
      { k: "cmd", text: "ministudio publish lazzat-kafe" },
      { k: "dm", text: "Ilova tekserilmekte..." },
      { k: "ok", text: "Hújjet tekserildi: 3 ekran" },
      { k: "ok", text: "Bot ulandı @lazzat_kafe_bot" },
      { k: "ok", text: "Tólem: Click, Payme" },
      { k: "ok", text: "HTTPS hám webhook sazlandı" },
      { k: "live", text: "Janlı https://t.me/lazzat_kafe_bot" },
    ],
  },
  cta: { h2: "Birinshi ilovańızdı búgin jaratıń", p: "Google menen kiriń hám biznesińizdi súwretleń.", btn: "Google menen dawam etiw" },
  footer: { blurb: "Telegram Mini App’lar jaratıw platforması.", product: "Ónim", language: "Til", privacy: "Házirshe biypul" },
};

export const HOME: Record<Locale, HomeDict> = { uz, en, ru, kaa };
