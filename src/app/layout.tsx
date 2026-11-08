import type { Metadata } from "next";
import { getLocale } from "@/i18n/server";
import { LOCALE_LABEL } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/client";
import { MotionProvider } from "@/components/MotionProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniStudio — Telegram Mini App builder",
  description: "Promptdan Telegram Mini App'gacha",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    // telegram-web-app.js (loaded beforeInteractive on /app/*) writes --tg-viewport-* CSS vars onto <html>
    // before React hydrates. Expected, so ignore attribute differences on this one element only.
    <html
      lang={LOCALE_LABEL[locale].html}
      suppressHydrationWarning
    >
      <body>
        <LocaleProvider locale={locale}>
          <MotionProvider>{children}</MotionProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
