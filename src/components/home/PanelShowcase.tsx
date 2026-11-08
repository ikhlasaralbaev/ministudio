"use client";
import { useEffect, useRef, useState } from "react";
import { LockSimple } from "@phosphor-icons/react";

const DW = 1180;
const DH = 680;

export interface PanelTab {
  id: string;
  label: string;
  url: string;
  cap: string;
  icon: React.ReactNode;
}

// What each step tells the embedded panel (public/demo/panel.html listens for these messages).
const MSG: Record<string, Record<string, unknown>> = {
  chat: { go: "studio", mode: "vibe", play: 1 },
  edit: { go: "studio", mode: "adv", select: "Narx" },
  data: { go: "data" },
  team: { go: "team" },
  admin: { go: "admin", tab: "j" },
};

/**
 * The live admin panel (an iframe of /demo/panel.html at a fixed 1180x680 design size, scaled to fit).
 * On desktop the section is pinned while scrolling steps through the tabs; below 900px it is tap-driven.
 */
export function PanelShowcase({ tabs, frame }: { tabs: PanelTab[]; frame: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const fw = useRef<HTMLDivElement>(null);
  const stick = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLParagraphElement>(null);
  const wb = useRef<HTMLDivElement>(null);
  const sentinels = useRef<(HTMLElement | null)[]>([]);
  const [cur, setCur] = useState(0);
  const ready = useRef(false);
  const pending = useRef(0);

  const post = (i: number) => frameRef.current?.contentWindow?.postMessage(MSG[tabs[i].id], "*");
  const mob = () => matchMedia("(max-width:899px)").matches;

  function fit() {
    const f = frameRef.current;
    const w = fw.current;
    const st = stick.current;
    if (!f || !w || !st) return;
    if (mob()) {
      w.style.width = w.style.height = "";
      f.style.transform = "";
      return;
    }
    const avW = st.querySelector(".w")!.clientWidth;
    const avH = st.clientHeight - (tabsRef.current?.offsetHeight ?? 0) - (capRef.current?.offsetHeight ?? 0) - (wb.current?.offsetHeight ?? 0) - 3 - 14 * 4 - 8;
    const s = Math.max(0.35, Math.min(1, avW / DW, avH / DH));
    w.style.width = DW * s + "px";
    w.style.height = DH * s + "px";
    f.style.transform = `scale(${s})`;
  }

  function show(i: number) {
    setCur(i);
    pending.current = i;
    if (ready.current) post(i);
  }

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((x) => x.isIntersecting && !mob() && show(Number((x.target as HTMLElement).dataset.k))),
      { rootMargin: "-50% 0px -50% 0px" },
    );
    sentinels.current.forEach((n) => n && io.observe(n));
    const ro = new ResizeObserver(fit);
    if (stick.current) ro.observe(stick.current);
    addEventListener("resize", fit);
    fit();
    // The iframe can finish loading before React hydrates (its onLoad is then never delivered).
    const doc = frameRef.current?.contentDocument;
    if (doc && doc.readyState === "complete" && doc.location.pathname.endsWith("panel.html")) {
      ready.current = true;
      post(pending.current);
    }
    return () => {
      io.disconnect();
      ro.disconnect();
      removeEventListener("resize", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(fit); // caption height changes with the active tab

  return (
    <div className="seq" id="seq">
      <div className="stick" ref={stick}>
        <div className="w">
          <div className="tabs5" ref={tabsRef} role="tablist">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={cur === i}
                className={cur === i ? "on" : ""}
                onClick={() => (mob() ? show(i) : sentinels.current[i]?.scrollIntoView({ block: "center", behavior: "smooth" }))}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <div className="winw">
            <div className="win">
              <div className="wb" ref={wb}>
                <i className="d" />
                <i className="d" />
                <i className="d" />
                <span className="url mono">
                  <LockSimple weight="bold" />
                  ministudio.uz/<b>{tabs[cur].url}</b>
                </span>
              </div>
              <div className="fw" ref={fw}>
                <iframe
                  ref={frameRef}
                  title={frame}
                  src="/demo/panel.html?embed=1&v=3#studio"
                  onLoad={() => {
                    ready.current = true;
                    post(pending.current);
                  }}
                  id="fr"
                />
              </div>
            </div>
          </div>
          <p className="cap" ref={capRef}>
            {tabs[cur].cap}
          </p>
          <div className="prog">
            <i style={{ width: `${(cur + 1) * 20}%` }} />
          </div>
        </div>
      </div>
      {tabs.map((t, i) => (
        <i key={t.id} className="sn" data-k={i} style={{ ["--k" as string]: i }} ref={(el) => void (sentinels.current[i] = el)} />
      ))}
    </div>
  );
}
