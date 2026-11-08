# MiniStudio design system ("Primer"-style, GitHub look)

Approved from `design/landing/h.html` (landing) and `design/landing/panel.html` (admin panel prototype).
The prototypes stay in `design/landing/` as reference; the real implementation lives in the Next app.

## Tokens (`src/app/globals.css`)
CSS variables on `:root`, dark by default, light via `prefers-color-scheme`; exposed to Tailwind through `@theme inline`.

| Token | Dark | Use |
|---|---|---|
| `bg` | #0d1117 | page |
| `panel` / `panel-2` / `panel-3` | #161b22 / #21262d / #2b3139 | surfaces, hover, scrollbars |
| `line` | #30363d | every border |
| `fg` / `muted` | #e6edf3 / #8b949e | text |
| `accent` / `accent-2` | #2f81f7 / #58a6ff | focus, selection, links |
| `primary` / `primary-2` | #238636 / #2ea043 | the one main action per view (green button) |
| `ok` `warn` `danger` `pur` `pink` | | status and highlights (use `text-ok`, `bg-danger/15`, never raw `red-500`) |

Radii are small (6/8/10/12px). Font is the system stack (`font-sans`, `font-mono`); no web fonts.
Never hard-code hex colors; use tokens (`text-fg`, `bg-panel`, `border-line`). `text-white` only on filled buttons.

## Component classes (`globals.css`)
`.btn` `.btn-primary` `.btn-danger` `.btn-lg` `.btn-sm`, `.card`, `.inp` (and `inputCls` in `ui.tsx`), `.tp` pill, `.lb` + `.lb-ok|warn|danger|accent|pur` labels, `.rise` (entry animation, `--i` stagger), `.ikat-loader` (weave loader), `.ms-skeleton` (sweep skeleton).

## Structure
- `src/components/shell/Shell.tsx`: top bar (logo, language switch, user) + sidebar with a sliding active indicator (`motion` `layoutId`). The sidebar collapses to an icon rail inside the studio. Used by `dashboard/`, `admin/` and `projects/[id]/` layouts.
- `ProjectNav` (in `ui.tsx`) is the per-project toolbar (name, actions, admin and suspension banners).
- Landing: `src/app/page.tsx` (server) + `src/components/home/*` (client islands) + `src/app/landing.css` (scoped under `.lp`).
  The live panel is `public/demo/panel.html` in an iframe: fixed 1180x680 design scaled to fit; scroll steps through tabs via `postMessage` (`go`, `mode`, `play`, `select`, `tab`). Icons are self-hosted in `public/demo/phosphor/`.

## Rules
- Icons: Phosphor only (`@phosphor-icons/react`; `/dist/ssr` in server components). No emoji.
- Motion: entry `.rise`, scroll reveal, springs for indicators; always respect `prefers-reduced-motion`.
- Loaders: `IkatLoader` for full-page, `.ms-skeleton` for content. No bare spinners or "Loading…" text.
- Languages: Karakalpak (`kaa`, Latin 2016), Uzbek, English, Russian. App copy: `src/i18n/app.ts` (`useT()`); landing copy: `src/i18n/home.ts`. Add every key to all four languages. Studio, settings, data and admin interiors are still Uzbek-only.
