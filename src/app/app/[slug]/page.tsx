import Script from "next/script";
import type { Metadata, Viewport } from "next";
import { MiniApp } from "@/components/MiniApp";

export const metadata: Metadata = { title: "Mini App" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <MiniApp slug={slug} />
    </>
  );
}
