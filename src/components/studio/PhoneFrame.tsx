"use client";
import type { Ref } from "react";
import { useX } from "@/i18n/client";

export const SCREEN_W = 390;
export const SCREEN_H = 844;
const BEZEL = 12;
export const FRAME_W = SCREEN_W + BEZEL * 2;
export const FRAME_H = SCREEN_H + BEZEL * 2;
const STATUS_H = 50;
const HEADER_H = 48;

/** True when a CSS color is light enough to need dark text on top of it. */
export function isLight(color: string): boolean {
  const m = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return true;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) > 0.4;
}

function StatusIcons({ color }: { color: string }) {
  return (
    <span className="flex items-center gap-[5px]" style={{ color }}>
      <svg width="18" height="11" viewBox="0 0 18 11" fill="currentColor" aria-hidden>
        <rect x="0" y="7" width="3" height="4" rx="1" />
        <rect x="5" y="5" width="3" height="6" rx="1" />
        <rect x="10" y="2.5" width="3" height="8.5" rx="1" />
        <rect x="15" y="0" width="3" height="11" rx="1" />
      </svg>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" aria-hidden>
        <path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.1-1.1A10 10 0 0 0 8 .7 10 10 0 0 0 .9 3.6L2 4.7a8.4 8.4 0 0 1 6-2.4Z" />
        <path d="M8 5.6c1.4 0 2.6.5 3.6 1.4l1.1-1.1A6.7 6.7 0 0 0 8 4a6.7 6.7 0 0 0-4.7 1.9L4.4 7c1-.9 2.2-1.4 3.6-1.4Z" />
        <path d="M8 8.2c.6 0 1.1.2 1.5.6L8 10.3 6.5 8.8c.4-.4.9-.6 1.5-.6Z" />
      </svg>
      <span className="relative ml-[1px] inline-block h-[12px] w-[25px] rounded-[4px] border border-current opacity-90">
        <span className="absolute inset-[1.5px] right-[5px] rounded-[2px] bg-current" />
        <span className="absolute -right-[3.5px] top-[3.5px] h-[4px] w-[1.5px] rounded-r bg-current" />
      </span>
    </span>
  );
}

/**
 * iPhone-style device frame with a Telegram Mini App header.
 * The scroll container (`scrollRef`) is the app viewport: 390 px wide, like a real phone.
 */
export function PhoneFrame({
  title,
  theme,
  scrollRef,
  scrollClassName = "",
  overlay,
  children,
}: {
  title: string;
  theme: { background: string; text: string; primary: string };
  scrollRef?: Ref<HTMLDivElement>;
  scrollClassName?: string;
  overlay?: React.ReactNode;
  children: React.ReactNode;
}) {
  const x = useX();
  const light = isLight(theme.background);
  const fg = light ? "#0b0b0f" : "#ffffff";
  return (
    <div className="relative" style={{ width: FRAME_W, height: FRAME_H }}>
      {/* side buttons */}
      <span className="absolute -left-[3px] top-[150px] h-[30px] w-[4px] rounded-l bg-[#2a2a31]" />
      <span className="absolute -left-[3px] top-[205px] h-[58px] w-[4px] rounded-l bg-[#2a2a31]" />
      <span className="absolute -left-[3px] top-[275px] h-[58px] w-[4px] rounded-l bg-[#2a2a31]" />
      <span className="absolute -right-[3px] top-[230px] h-[90px] w-[4px] rounded-r bg-[#2a2a31]" />

      {/* body */}
      <div
        className="absolute inset-0 rounded-[64px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.75),0_0_0_1px_#3b3b45,inset_0_0_0_1px_#4a4a55]"
        style={{ background: "linear-gradient(145deg,#2c2c34 0%,#141418 45%,#202027 100%)", padding: BEZEL }}
      >
        {/* screen */}
        <div
          className="relative h-full w-full overflow-hidden rounded-[52px] ring-1 ring-black"
          style={{ background: theme.background }}
        >
          {/* status bar */}
          <div
            className="relative z-10 flex items-center justify-between px-[30px] text-[15px] font-semibold tracking-tight"
            style={{ height: STATUS_H, color: fg, background: theme.background }}
          >
            <span className="w-[54px] pt-[2px] text-center">9:41</span>
            <StatusIcons color={fg} />
          </div>
          {/* dynamic island */}
          <div className="absolute left-1/2 top-[11px] z-20 h-[34px] w-[120px] -translate-x-1/2 rounded-full bg-black" />

          {/* telegram mini app header */}
          <div
            className="relative z-10 grid grid-cols-[72px_1fr_72px] items-center px-3"
            style={{ height: HEADER_H, background: theme.background, color: theme.text }}
          >
            <span className="text-[15px] font-medium" style={{ color: theme.primary }}>
              {x("Yopish")}
            </span>
            <span className="min-w-0 text-center leading-tight">
              <span className="block truncate text-[15px] font-semibold">{title}</span>
              <span className="block text-[11px] opacity-50">{x("mini ilova")}</span>
            </span>
            <span className="flex justify-end">
              <span
                className="grid h-7 w-7 place-items-center rounded-full text-[15px] leading-none"
                style={{ background: light ? "#0000000f" : "#ffffff1a", color: theme.text }}
              >
                ⋯
              </span>
            </span>
          </div>

          {/* app viewport */}
          <div
            ref={scrollRef}
            className={`phone-scroll relative overflow-y-auto ${scrollClassName}`}
            // a transform makes this box the containing block of position:fixed children, so an app screen that is
            // "fixed to the whole page" (a language chooser, a splash) stays inside the phone instead of covering the studio
            style={{ height: SCREEN_H - STATUS_H - HEADER_H, width: SCREEN_W, background: theme.background, transform: "translateZ(0)" }}
          >
            {children}
            {overlay}
          </div>

          {/* home indicator */}
          <div
            className="pointer-events-none absolute bottom-[8px] left-1/2 z-20 h-[5px] w-[134px] -translate-x-1/2 rounded-full"
            style={{ background: fg, opacity: 0.85 }}
          />
        </div>
      </div>
    </div>
  );
}
