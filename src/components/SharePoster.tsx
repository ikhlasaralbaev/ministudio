"use client";
import { useEffect, useState } from "react";
import { DownloadSimple, Link as LinkIcon, QrCode } from "@phosphor-icons/react";

/** The app's Telegram link as a QR code and a print-ready poster (PNG), for tables, windows and flyers. */
export function SharePoster({ botUsername, name, color = "#2a8bd1" }: { botUsername: string; name: string; color?: string }) {
  const link = `https://t.me/${botUsername}`;
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    void import("qrcode").then(({ default: QR }) =>
      QR.toDataURL(link, { margin: 1, width: 640, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } }).then((u) => live && setQr(u)),
    );
    return () => {
      live = false;
    };
  }, [link]);

  async function poster() {
    const W = 1080;
    const H = 1350;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    g.fillStyle = color;
    g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(255,255,255,0.10)";
    g.beginPath();
    g.arc(W - 120, 140, 260, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#ffffff";
    g.textAlign = "center";
    g.font = "700 76px system-ui, -apple-system, Segoe UI, sans-serif";
    wrap(g, name, W / 2, 190, W - 160, 88);
    g.font = "500 44px system-ui, -apple-system, Segoe UI, sans-serif";
    g.fillStyle = "rgba(255,255,255,0.92)";
    g.fillText("Telegram'da buyurtma bering", W / 2, 400);
    // the QR sits on a white card
    const card = 700;
    const x = (W - card) / 2;
    g.fillStyle = "#ffffff";
    round(g, x, 470, card, card, 36);
    g.fill();
    const img = new Image();
    img.src = qr;
    await img.decode();
    g.drawImage(img, x + 30, 500, card - 60, card - 60);
    g.fillStyle = "#ffffff";
    g.font = "600 54px system-ui, -apple-system, Segoe UI, sans-serif";
    g.fillText(`@${botUsername}`, W / 2, 1270);
    const a = document.createElement("a");
    a.download = `${botUsername}-qr.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel-2 p-3">
      <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt={`QR @${botUsername}`} className="h-full w-full" />
        ) : (
          <QrCode size={32} className="text-muted" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2 text-sm">
        <p className="truncate font-medium">t.me/{botUsername}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm" disabled={!qr} onClick={() => void poster()}>
            <DownloadSimple /> Plakat (PNG)
          </button>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              void navigator.clipboard.writeText(link).then(() => setCopied(true));
            }}
          >
            <LinkIcon /> {copied ? "Nusxalandi" : "Havolani nusxalash"}
          </button>
        </div>
      </div>
    </div>
  );
}

function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Centered text wrapped to a width (at most three lines). */
function wrap(g: CanvasRenderingContext2D, text: string, cx: number, y: number, maxW: number, lineH: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  lines.slice(0, 3).forEach((l, i) => g.fillText(l, cx, y + i * lineH));
}
