import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, CaretRight, GoogleLogo, MagnifyingGlass, PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr";
import { getLocale } from "@/i18n/server";
import { LOCALES, LOCALE_LABEL } from "@/i18n/config";
import { HOME } from "@/i18n/home";
import { LangSwitch } from "@/components/ui";
import { Icon } from "@/components/home/icon";
import { HomeEffects } from "@/components/home/HomeEffects";
import { PromptBox } from "@/components/home/PromptBox";
import { PanelShowcase } from "@/components/home/PanelShowcase";
import { Terminal } from "@/components/home/Terminal";
import { HomeTemplates } from "@/components/templates/HomeTemplates";

const TEMPLATES_NAV = { uz: "Shablonlar", ru: "Шаблоны", en: "Templates", kaa: "Úlgiler" } as const;
import "./landing.css";

export async function generateMetadata(): Promise<Metadata> {
  const d = HOME[await getLocale()];
  return { title: d.meta.title, description: d.meta.description };
}

export default async function Landing() {
  const locale = await getLocale();
  const d = HOME[locale];
  const signedIn = (await cookies()).getAll().some((c) => c.name.endsWith("better-auth.session_token"));
  const go = signedIn ? "/dashboard" : "/login";

  return (
    <div className="lp">
      <HomeEffects />
      <header className="top">
        <div className="w">
          <a className="logo" href="#top">
            <PaperPlaneTilt weight="fill" />
            MiniStudio
          </a>
          <nav>
            <a href="#templates">{TEMPLATES_NAV[locale]}</a>
            <a href="#studio">{d.nav.studio}</a>
            <a href="#features">{d.nav.features}</a>
            <a href="#bots">{d.nav.bots}</a>
            <a href="#ship">{d.nav.ship}</a>
          </nav>
          <span className="sp" />
          <div className="search">
            <MagnifyingGlass weight="bold" />
            <span>{d.nav.features}</span>
            <kbd className="mono">/</kbd>
          </div>
          <LangSwitch />
          {signedIn ? (
            <Link className="btn g" href="/dashboard">
              {d.nav.cabinet}
            </Link>
          ) : (
            <>
              <Link className="btn" href="/login">
                {d.nav.login}
              </Link>
              <Link className="btn g hide-sm" href="/login">
                {d.nav.start}
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="hero" id="top">
        <div className="w">
          <a className="pill" href="#studio">
            <b>{d.pill.tag}</b>
            {d.pill.text}
            <CaretRight weight="bold" />
          </a>
          <h1>
            {d.h1a} <span>{d.h1b}</span>
          </h1>
          <p className="lede">{d.lede}</p>
          <PromptBox
            placeholder={d.placeholder}
            create={d.create}
            href={go}
            langName={LOCALE_LABEL[locale].name}
            chips={d.chips.map((c) => ({ label: c.label, text: c.text, icon: <Icon name={c.icon} /> }))}
          />
        </div>
      </div>

      <HomeTemplates />

      <section id="studio">
        <div className="w">
          <h2>{d.studio.h2}</h2>
          <p className="lead">{d.studio.lead}</p>
        </div>
        <PanelShowcase
          frame={d.studio.frame}
          tabs={d.studio.tabs.map((t) => ({ id: t.id, label: t.label, url: t.url, cap: t.cap, icon: <Icon name={t.icon} /> }))}
        />
      </section>

      <section id="features">
        <div className="w">
          <h2>{d.features.h2}</h2>
          <p className="lead">{d.features.lead}</p>
          <div className="bento">
            <div className="bc s4">
              <span className="ic" style={{ color: "var(--accent)" }}><Icon name="CreditCard" size={22} /></span>
              <h3>{d.features.pay.t}</h3>
              <p>{d.features.pay.p}</p>
              <div className="code mono">
                <span className="c">{"// " + d.features.pay.sent}</span>
                <br />
                <span className="k">amount</span>: <span className="n">1000</span> <span className="c">{"// " + d.features.pay.rejected}</span>
                <br />
                <span className="c">{"// " + d.features.pay.server}</span>
                <br />
                <span className="k">amount</span>: <span className="n">76000</span> <span className="s">&quot;{d.features.pay.cur}&quot;</span>
              </div>
            </div>
            <div className="bc s2">
              <span className="ic" style={{ color: "var(--pur)" }}><Icon name="ChatTeardropText" size={22} /></span>
              <h3>{d.features.chat.t}</h3>
              <p>{d.features.chat.p}</p>
              <div className="tgs"><span>vibe</span><span>advanced</span></div>
            </div>
            <div className="bc s3">
              <span className="ic" style={{ color: "var(--primary-2)" }}><Icon name="Table" size={22} /></span>
              <h3>{d.features.data.t}</h3>
              <p>{d.features.data.p}</p>
              <div className="tbl">
                <div><span>{d.features.data.cols[0]}</span><span>{d.features.data.cols[1]}</span><span>{d.features.data.cols[2]}</span></div>
                <div><span className="mono">#1042</span><span>Dilnoza R.</span><span className="mono">76 000</span></div>
                <div><span className="mono">#1041</span><span>Javohir T.</span><span className="mono">41 000</span></div>
              </div>
            </div>
            <div className="bc s3">
              <span className="ic" style={{ color: "var(--warn)" }}><Icon name="UsersThree" size={22} /></span>
              <h3>{d.features.team.t}</h3>
              <p>{d.features.team.p}</p>
              <div className="tgs">{d.features.team.roles.map((r) => <span key={r}>{r}</span>)}</div>
              <div className="tgs" style={{ marginTop: 12 }}>
                <span className="okt">manageMembers</span>
                <span className="okt">deleteProject</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="bots" style={{ paddingTop: 0 }}>
        <div className="w">
          <h2>{d.bots.h2}</h2>
          <p className="lead">{d.bots.lead}</p>
          <div className="bots">
            {d.bots.items.map((b) => (
              <Link key={b.name} className="bot" href={go}>
                <div className="hd"><Icon name={b.icon} />{b.name}</div>
                <p>{b.desc}</p>
                <div className="tgs">{b.tags.map((x) => <span key={x}>{x}</span>)}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="ship" style={{ paddingTop: 0 }}>
        <div className="w two">
          <div>
            <h2>{d.ship.h2}</h2>
            <p className="lead" style={{ marginBottom: 0 }}>{d.ship.lead}</p>
            <div className="stats">
              {d.ship.stats.map(([b, s]) => (
                <div key={s}><b>{b}</b><span>{s}</span></div>
              ))}
            </div>
            <div style={{ marginTop: 34 }}>
              <Link className="btn g lg" href={go}>{d.ship.cta}<ArrowRight weight="bold" /></Link>
            </div>
          </div>
          <div className="term">
            <div className="tb"><i /><i /><i /></div>
            <Terminal lines={d.ship.term} />
          </div>
        </div>
      </section>

      <section style={{ paddingTop: 0 }}>
        <div className="w">
          <div className="cta">
            <h2>{d.cta.h2}</h2>
            <p>{d.cta.p}</p>
            <Link className="btn g lg" href="/login"><GoogleLogo weight="bold" />{d.cta.btn}</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="w">
          <div className="fg">
            <div>
              <a className="logo" href="#top"><PaperPlaneTilt weight="fill" />MiniStudio</a>
              <p>{d.footer.blurb}</p>
            </div>
            <div>
              <h4>{d.footer.product}</h4>
              <a href="#studio">{d.nav.studio}</a>
              <a href="#bots">{d.nav.bots}</a>
              <a href="#features">{d.nav.features}</a>
            </div>
            <div>
              <h4>{d.footer.language}</h4>
              {LOCALES.map((l) => <span key={l} className="fl2">{LOCALE_LABEL[l].name}</span>)}
            </div>
          </div>
          <div className="fb"><span>© MiniStudio</span><span>{d.footer.privacy}</span></div>
        </div>
      </footer>
    </div>
  );
}
