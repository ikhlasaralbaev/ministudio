import type { Action, UINode } from "../types";

/**
 * A small design kit for the template gallery: every helper returns a plain UINode with a unique id, so a template reads
 * like a layout description. Colors come from one palette object, so each template stays consistent with itself.
 */
export type S = Record<string, string | number>;

export interface Palette {
  primary: string;
  /** page background */
  bg: string;
  text: string;
  /** cards, inputs */
  surface: string;
  /** hairlines */
  line: string;
  /** text on the primary color */
  onPrimary: string;
  /** secondary text */
  muted: string;
}

export const unsplash = (id: string, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

export function kit(c: Palette, opts: { heading?: string } = {}) {
  let n = 0;
  const id = (p: string) => `${p}_${(++n).toString(36)}`;
  const heading: S = opts.heading ? { fontFamily: opts.heading } : {};
  const click = (e?: Action[]) => (e ? { events: { onClick: e } } : {});

  const box = (style: S, children: UINode[], e?: Action[], name?: string): UINode => ({ id: id("box"), type: "Box", ...(name ? { name } : {}), style, children, ...click(e) });
  const row = (style: S, children: UINode[], e?: Action[], name?: string): UINode => ({ id: id("row"), type: "Row", ...(name ? { name } : {}), style, children, ...click(e) });
  const text = (t: string, variant?: "h1" | "h2" | "h3" | "body" | "caption", style: S = {}, serif = false): UINode => ({
    id: id("txt"),
    type: "Text",
    props: { text: t, ...(variant ? { variant } : {}) },
    style: { ...(serif ? heading : {}), ...style },
  });
  const muted = (t: string, style: S = {}): UINode => text(t, "caption", { opacity: 1, color: c.muted, ...style });
  const icon = (name: string, size = 20, color: string = c.text, weight: "bold" | "fill" | "regular" | "duotone" = "bold", style: S = {}): UINode => ({
    id: id("ico"),
    type: "Icon",
    props: { name, size, color, weight },
    style,
  });
  const img = (src: string, aspect: string, style: S = {}, alt = ""): UINode => ({ id: id("img"), type: "Image", props: { src, alt, aspect }, style: { objectFit: "cover", ...style } });
  const btn = (t: string, e: Action[], style: S = {}, variant: "primary" | "secondary" | "ghost" = "primary"): UINode => ({
    id: id("btn"),
    type: "Button",
    props: { text: t, variant },
    style: variant === "primary" ? { background: c.primary, color: c.onPrimary, ...style } : style,
    events: { onClick: e },
  });
  const badge = (t: string, style: S = {}): UINode => ({ id: id("bdg"), type: "Badge", props: { text: t }, style });
  const list = (source: string, children: UINode[], style: S = {}, emptyText?: string, name?: string): UINode => ({
    id: id("lst"),
    type: "List",
    ...(name ? { name } : {}),
    props: { source, ...(emptyText ? { emptyText } : {}) },
    style,
    children,
  });
  const input = (bind: string, placeholder: string, extra: { inputType?: string; multiline?: boolean } = {}, style: S = {}): UINode => ({
    id: id("inp"),
    type: "Input",
    props: { bind, placeholder, ...extra },
    style: { background: c.surface, color: c.text, border: `1px solid ${c.line}`, ...style },
  });
  const spacer = (size?: number): UINode => ({ id: id("spc"), type: "Spacer", ...(size ? { props: { size } } : {}) });
  const when = (node: UINode, cond: string): UINode => ({ ...node, visibleIf: cond });
  const screen = (sid: string, name: string, children: UINode[], style: S = {}): UINode => ({
    id: sid,
    type: "Screen",
    name,
    props: { title: name },
    style: { padding: 0, gap: 0, ...style },
    children,
  });

  /** A padded column inside a screen (screens themselves have no padding so heroes can bleed to the edges). */
  const body = (children: UINode[], style: S = {}): UINode => box({ padding: "16px 16px 24px", gap: 14, ...style }, children);

  /** Round icon button (back, close...). */
  const iconBtn = (name: string, e: Action[], style: S = {}): UINode =>
    box({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", background: c.surface, border: `1px solid ${c.line}`, flex: "none", cursor: "pointer", ...style }, [icon(name, 20, c.text)], e);

  /** Section title with an optional right-hand action. */
  const sectionTitle = (t: string, right?: UINode): UINode =>
    row({ justifyContent: "space-between", alignItems: "baseline" }, [text(t, "h3", { fontSize: 18 }, true), ...(right ? [right] : [])]);

  /** Filled pill when selected, outlined when not (selection state is shown by text AND color). */
  const chip = (label: string, selectedExpr: string, e: Action[], extra: S = {}): UINode =>
    row(
      {
        padding: "9px 16px",
        borderRadius: 999,
        flex: "none",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
        transition: "all .15s",
        background: `{{ ${selectedExpr} ? '${c.primary}' : '${c.surface}' }}`,
        color: `{{ ${selectedExpr} ? '${c.onPrimary}' : '${c.text}' }}`,
        border: `{{ ${selectedExpr} ? '1px solid ${c.primary}' : '1px solid ${c.line}' }}`,
        ...extra,
      },
      [text(label, undefined, { fontSize: 14, fontWeight: 600, color: "inherit" })],
      e,
    );

  /** Bottom tab bar: tabs are [icon, label, screenId]; the active one is filled and in the primary color. */
  const tabBar = (tabs: [string, string, string][], active: string, badgeExpr?: Record<string, string>): UINode =>
    row(
      {
        position: "sticky",
        bottom: 0,
        gap: 0,
        padding: "8px 8px calc(8px + env(safe-area-inset-bottom))",
        background: c.surface,
        borderTop: `1px solid ${c.line}`,
        justifyContent: "space-around",
        zIndex: 5,
      },
      tabs.map(([ic, label, to]) =>
        box(
          { flex: 1, alignItems: "center", gap: 3, cursor: "pointer", position: "relative", opacity: to === active ? 1 : 0.55 },
          [
            icon(ic, 24, to === active ? c.primary : c.text, to === active ? "fill" : "bold"),
            text(label, undefined, { fontSize: 11, fontWeight: to === active ? 700 : 500, color: to === active ? c.primary : c.text }),
            ...(badgeExpr?.[to]
              ? [when(badge(`{{ ${badgeExpr[to]} }}`, { position: "absolute", top: -4, right: "calc(50% - 22px)", padding: "1px 6px", background: c.primary, color: c.onPrimary, fontSize: 10 }), `${badgeExpr[to]} > 0`)]
              : []),
          ],
          to === active ? [] : [{ type: "navigate", screen: to }],
        ),
      ),
    );

  /** A quantity stepper bound to a state number (min 1). */
  const stepper = (key: string): UINode =>
    row({ gap: 0, background: c.surface, border: `1px solid ${c.line}`, borderRadius: 999, overflow: "hidden", flex: "none" }, [
      box({ width: 44, height: 44, alignItems: "center", justifyContent: "center", cursor: "pointer" }, [icon("minus", 18)], [{ type: "setState", key, value: `max(1, state.${key} - 1)` }, { type: "haptic", style: "light" }]),
      text(`{{ state.${key} }}`, undefined, { minWidth: 28, textAlign: "center", fontWeight: 700, fontSize: 16 }),
      box({ width: 44, height: 44, alignItems: "center", justifyContent: "center", cursor: "pointer" }, [icon("plus", 18)], [{ type: "setState", key, value: `min(20, state.${key} + 1)` }, { type: "haptic", style: "light" }]),
    ]);

  /** Image with a dark gradient and text over it. */
  const hero = (src: string, height: number, inner: UINode[], style: S = {}): UINode => ({
    id: id("box"),
    type: "Box",
    name: "Hero",
    style: {
      position: "relative",
      minHeight: height,
      justifyContent: "flex-end",
      padding: 20,
      gap: 8,
      backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.72) 100%), url(${src})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      color: "#fff",
      ...style,
    },
    children: inner,
  });

  /** Label above a form field. */
  const field = (label: string, node: UINode, extra?: UINode): UINode => box({ gap: 6 }, [text(label, undefined, { fontSize: 13, fontWeight: 600, color: c.muted }), node, ...(extra ? [extra] : [])]);

  const card = (children: UINode[], style: S = {}, e?: Action[]): UINode => box({ background: c.surface, borderRadius: 16, border: `1px solid ${c.line}`, padding: 14, gap: 10, ...style }, children, e);

  /** A thin horizontally scrolling row (chips, avatars). */
  const scroller = (children: UINode[], style: S = {}): UINode => row({ overflowX: "auto", gap: 8, padding: "2px 16px 4px", margin: "0 -16px", scrollbarWidth: "none", ...style }, children);

  /** Icon + label + value row (contact details); tappable when it has an action. */
  const infoRow = (ic: string, label: string, value: string, e?: Action[]): UINode =>
    row({ gap: 12, padding: "12px 14px", background: c.surface, borderRadius: 14, border: `1px solid ${c.line}`, cursor: e ? "pointer" : "default" }, [
      box({ width: 40, height: 40, borderRadius: 20, background: c.primary + "14", alignItems: "center", justifyContent: "center", flex: "none" }, [icon(ic, 20, c.primary, "duotone")]),
      box({ gap: 1, flex: 1, minWidth: 0 }, [muted(label, { fontSize: 12 }), text(value, undefined, { fontWeight: 600 })]),
      ...(e ? [icon("caret-right", 18, c.muted)] : []),
    ], e);

  return { infoRow, box, row, text, muted, icon, img, btn, badge, list, input, spacer, when, screen, body, iconBtn, sectionTitle, chip, tabBar, stepper, hero, field, card, scroller, c };
}

export type Kit = ReturnType<typeof kit>;
