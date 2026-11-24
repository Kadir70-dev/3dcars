"use client";
// English / Italian for the whole site. Keys are the English strings themselves, so a missing
// translation just shows the English text. The choice is remembered in this browser.
import { createContext, createElement, Fragment, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ElementType, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { IT, PATTERNS, TITLE_SUFFIX } from "./it";

export type Lang = "en" | "it";
type Vars = Record<string, string | number>;

const KEY = "autovivo-lang";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

/** Pure lookup, also usable outside React. `{name}` placeholders are filled from `vars`. */
export function translate(lang: Lang, s: string, vars?: Vars): string {
  let out = s;
  if (lang === "it") {
    out = IT[s] ?? s;
    if (out === s) for (const [re, fn] of PATTERNS) { const m = re.exec(s); if (m) { out = fn(m); break; } }
  }
  return vars ? out.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`)) : out;
}

// The choice lives in localStorage; the server snapshot is English so hydration never disagrees.
let current: Lang | null = null;
const subs = new Set<() => void>();
function read(): Lang {
  if (current === null) {
    try { current = localStorage.getItem(KEY) === "it" ? "it" : "en"; } catch { current = "en"; }
  }
  return current;
}
const subscribe = (cb: () => void) => { subs.add(cb); return () => { subs.delete(cb); }; };
function store(l: Lang) {
  current = l;
  try { localStorage.setItem(KEY, l); } catch { /* storage unavailable */ }
  subs.forEach((f) => f());
}

export function LangProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(subscribe, read, (): Lang => "en");
  const setLang = useCallback((l: Lang) => store(l), []);
  const pathname = usePathname();

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // Page titles come from the server in English; keep the tab title in the chosen language.
  useEffect(() => {
    const el = document.querySelector("title");
    if (!el) return;
    const apply = () => {
      if (lang !== "it") return;
      const cur = document.title;
      const base = cur.endsWith(TITLE_SUFFIX) ? cur.slice(0, -TITLE_SUFFIX.length) : cur;
      const next = translate("it", base);
      const full = next + (cur.endsWith(TITLE_SUFFIX) ? TITLE_SUFFIX : "");
      if (full !== cur) document.title = full;
    };
    apply();
    const mo = new MutationObserver(apply);
    mo.observe(el, { childList: true, characterData: true, subtree: true });
    return () => mo.disconnect();
  }, [lang, pathname]);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLang = () => useContext(Ctx);

/** `t("English text", { n: 3 })` for attributes and other plain strings. */
export function useT() {
  const { lang } = useLang();
  return useCallback((s: string, vars?: Vars) => translate(lang, s, vars), [lang]);
}

const MARKUP = /(<em>.*?<\/em>|<b>.*?<\/b>|<br\/>)/;

/** Translated text node(s). Understands <em>, <b> and <br/> in the string. */
export function T({ children, v }: { children: string; v?: Vars }) {
  const { lang } = useLang();
  const s = translate(lang, children, v);
  if (!s.includes("<")) return <>{s}</>;
  return (
    <>
      {s.split(MARKUP).map((part, i) => {
        if (part === "<br/>") return <br key={i} />;
        const m = /^<(em|b)>(.*)<\/\1>$/.exec(part);
        return m ? createElement(m[1], { key: i }, m[2]) : <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}

const ATTRS = ["aria-label", "placeholder", "title", "alt"] as const;

/** An element whose aria-label / placeholder / title / alt are translated (usable from server components). */
export function L({ as = "div", ...props }: { as?: ElementType; [k: string]: unknown }) {
  const t = useT();
  const out: Record<string, unknown> = { ...props };
  for (const a of ATTRS) if (typeof out[a] === "string") out[a] = t(out[a] as string);
  return createElement(as, out);
}

/** A date in the visitor's language. */
export function LocalDate({ d }: { d: string | null }) {
  const { lang } = useLang();
  const t = useT();
  if (!d) return <>{t("Not recorded")}</>;
  return <>{new Date(d).toLocaleDateString(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}</>;
}

function LangFlag({ code }: { code: "en" | "it" }) {
  return code === "it" ? (
    <svg className="lang-flag" viewBox="0 0 30 20" aria-hidden="true">
      <rect width="10" height="20" fill="#009246" />
      <rect x="10" width="10" height="20" fill="#fff" />
      <rect x="20" width="10" height="20" fill="#ce2b37" />
    </svg>
  ) : (
    <svg className="lang-flag" viewBox="0 0 60 40" aria-hidden="true">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0L60 40M60 0L0 40" stroke="#c8102e" strokeWidth="3" />
      <path d="M30 0V40M0 20H60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0V40M0 20H60" stroke="#c8102e" strokeWidth="8" />
    </svg>
  );
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-toggle" role="group" aria-label={translate(lang, "Language")}>
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")} lang="en" aria-label="English"><LangFlag code="en" /><span className="lang-code">EN</span></button>
      <button type="button" aria-pressed={lang === "it"} onClick={() => setLang("it")} lang="it" aria-label="Italiano"><LangFlag code="it" /><span className="lang-code">IT</span></button>
    </div>
  );
}
