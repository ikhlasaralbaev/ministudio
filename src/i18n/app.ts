// Interface copy for the signed-in app (shell, dashboard, login) in four languages.
// Studio, settings, data and admin interiors are still Uzbek-only. Keep every language in the shape of `uz`.
import type { Locale } from "./config";

const uz = {
  tagline: "Promptdan Telegram Mini App’gacha",
  nav: { projects: "Loyihalar", studio: "Studio", settings: "Sozlamalar", data: "Ma’lumotlar", schema: "Tuzilma", admin: "Admin", signOut: "Chiqish", language: "Til", project: "Loyiha" },
  banner: { admin: "Admin rejimi: siz {email} loyihasidasiz. Harakatlaringiz jurnalga yoziladi.", suspended: "Loyiha administrator tomonidan to‘xtatilgan: ilova va bot foydalanuvchilar uchun ishlamaydi.", owner: "egasi" },
  dash: {
    newTitle: "Yangi loyiha", newHint: "Nom bering → bot token va kalitlarni kiriting → prompt yozing → tahrirlang → publish.",
    placeholder: "Masalan: Lazzat Kafe", create: "Yaratish", creating: "Yaratilmoqda…", loading: "Yuklanmoqda…",
    mine: "Mening loyihalarim", member: "Men a’zo bo‘lgan loyihalar", empty: "Hali loyiha yo‘q. Birinchisini yarating.",
    screens: "{n} ekran", blank: "bo‘sh", edit: "Tahrirlash", view: "Ko‘rish", suspended: "To‘xtatilgan",
    published: "v{n} e’lon qilingan", unpublished: "e’lon qilinmagan", del: "O‘chirish",
    confirm: "“{name}” loyihasi, uning buyurtmalari va to‘lovlari butunlay o‘chiriladi. Qaytarib bo‘lmaydi.\n\nTasdiqlash uchun loyiha nomini yozing:",
    mismatch: "Nom mos kelmadi, loyiha o‘chirilmadi.",
  },
  login: { failed: "Kirish rad etildi. Akkauntingiz bloklangan bo‘lishi mumkin.", google: "Google bilan kirish", redirecting: "Yo‘naltirilmoqda…", back: "Bosh sahifa" },
};

export type AppDict = typeof uz;

const en: AppDict = {
  tagline: "From a prompt to a Telegram Mini App",
  nav: { projects: "Projects", studio: "Studio", settings: "Settings", data: "Data", schema: "Schema", admin: "Admin", signOut: "Sign out", language: "Language", project: "Project" },
  banner: { admin: "Admin mode: you are inside {email}’s project. Your actions are logged.", suspended: "This project was suspended by an administrator: the app and bot are offline for users.", owner: "the owner" },
  dash: {
    newTitle: "New project", newHint: "Name it → add the bot token and keys → write a prompt → edit → publish.",
    placeholder: "For example: Lazzat Cafe", create: "Create", creating: "Creating…", loading: "Loading…",
    mine: "My projects", member: "Projects I’m a member of", empty: "No projects yet. Create your first one.",
    screens: "{n} screens", blank: "empty", edit: "Can edit", view: "View only", suspended: "Suspended",
    published: "v{n} published", unpublished: "not published", del: "Delete",
    confirm: "Project “{name}”, its orders and payments will be deleted permanently. This cannot be undone.\n\nType the project name to confirm:",
    mismatch: "The name did not match, the project was not deleted.",
  },
  login: { failed: "Sign-in was rejected. Your account may be blocked.", google: "Sign in with Google", redirecting: "Redirecting…", back: "Home" },
};

const ru: AppDict = {
  tagline: "От промпта до Telegram Mini App",
  nav: { projects: "Проекты", studio: "Студия", settings: "Настройки", data: "Данные", schema: "Структура", admin: "Админ", signOut: "Выйти", language: "Язык", project: "Проект" },
  banner: { admin: "Режим админа: вы в проекте {email}. Ваши действия записываются в журнал.", suspended: "Проект приостановлен администратором: приложение и бот для пользователей не работают.", owner: "владельца" },
  dash: {
    newTitle: "Новый проект", newHint: "Назовите → укажите токен бота и ключи → напишите промпт → отредактируйте → опубликуйте.",
    placeholder: "Например: Кафе «Лаззат»", create: "Создать", creating: "Создаём…", loading: "Загрузка…",
    mine: "Мои проекты", member: "Проекты, где я участник", empty: "Проектов пока нет. Создайте первый.",
    screens: "экранов: {n}", blank: "пусто", edit: "Редактор", view: "Просмотр", suspended: "Приостановлен",
    published: "v{n} опубликован", unpublished: "не опубликован", del: "Удалить",
    confirm: "Проект «{name}», его заказы и платежи будут удалены навсегда. Отменить нельзя.\n\nДля подтверждения введите название проекта:",
    mismatch: "Название не совпало, проект не удалён.",
  },
  login: { failed: "Вход отклонён. Возможно, ваш аккаунт заблокирован.", google: "Войти через Google", redirecting: "Перенаправляем…", back: "На главную" },
};

const kaa: AppDict = {
  tagline: "Promptdan Telegram Mini App’qa shekem",
  nav: { projects: "Joybarlar", studio: "Studio", settings: "Sazlawlar", data: "Mag‘lıwmatlar", schema: "Dúzilis", admin: "Admin", signOut: "Shıǵıw", language: "Til", project: "Joybar" },
  banner: { admin: "Admin rejimi: siz {email} joybarındasız. Háreketlerińiz jurnalǵa jazıladı.", suspended: "Joybar administrator tárepinen toqtatılǵan: ilova hám bot paydalanıwshılar ushın islemeydi.", owner: "iyesi" },
  dash: {
    newTitle: "Taza joybar", newHint: "Atın beriń → bot token hám kilitlerdi kiritiń → prompt jazıń → tártipleń → publish.",
    placeholder: "Mısalı: Lázzet Kafe", create: "Jaratıw", creating: "Jaratılmaqta…", loading: "Júklenbekte…",
    mine: "Meniń joybarlarım", member: "Men aǵza bolǵan joybarlar", empty: "Házirshe joybar joq. Birinshisin jaratıń.",
    screens: "{n} ekran", blank: "bos", edit: "Tártiplew", view: "Kóriw", suspended: "Toqtatılǵan",
    published: "v{n} járiyalanǵan", unpublished: "járiyalanbaǵan", del: "Óshiriw",
    confirm: "“{name}” joybarı, onıń buyırtpaları hám tólemleri pútkilley óshiriledi. Qaytarıp bolmaydı.\n\nRastlaw ushın joybar atın jazıń:",
    mismatch: "Atı sáykes kelmedi, joybar óshirilmedi.",
  },
  login: { failed: "Kiriw ret etildi. Akkauntıńız bloklanǵan bolıwı múmkin.", google: "Google menen kiriw", redirecting: "Jónetilmekte…", back: "Bas bet" },
};

export const APP_DICT: Record<Locale, AppDict> = { uz, en, ru, kaa };

export function fmt(s: string, vars?: Record<string, string | number>) {
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s;
}
