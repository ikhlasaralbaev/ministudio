"use client";
import { useEffect } from "react";
import Lenis from "lenis";

/** Scroll progress bar, staggered reveal on scroll and smooth (inertial) scrolling for the landing page. */
export function HomeEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lp");
    if (!root) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    root.classList.add("js");

    const els = [...root.querySelectorAll<HTMLElement>("h2,.lead,.bc,.bot,.cta,.term,.stats div,.hero .pill,.hero .prompt,.hero .ex")];
    els.forEach((e) => {
      e.classList.add("rv");
      e.style.setProperty("--d", Math.min([...(e.parentElement?.children ?? [])].indexOf(e), 6) * 70 + "ms");
    });
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add("in");
            io.unobserve(x.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" },
    );
    els.forEach((e) => io.observe(e));

    const bar = document.getElementById("topbar");
    const onScroll = () => {
      if (bar) bar.style.transform = `scaleX(${scrollY / (document.documentElement.scrollHeight - innerHeight || 1)})`;
    };
    addEventListener("scroll", onScroll, { passive: true });

    let lenis: Lenis | null = null;
    let raf = 0;
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.12, wheelMultiplier: 0.9, anchors: { offset: -72 } });
      const loop = (t: number) => {
        lenis?.raf(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      io.disconnect();
      removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      lenis?.destroy();
      root.classList.remove("js");
    };
  }, []);
  return <div id="topbar" aria-hidden />;
}
