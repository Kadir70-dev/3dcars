"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShortlist } from "@/lib/shortlist";
import { FooterMap } from "@/components/FooterMap";
import { TopbarPromo } from "@/components/TopbarPromo";
import { LangToggle, T, useT } from "@/lib/i18n";

const links = [
  { href: "/vehicles/ferrari-488-gtb", label: "Explorer" },
  { href: "/store", label: "All parts" },
  { href: "/catalog", label: "Catalog" },
  { href: "/contact", label: "Find us" },
];

const MARQUES = [
  { make: "Ferrari", note: "Genuine parts, new and used", photo: "/photos/ferrari-488-gtb.jpg" },
  { make: "Lamborghini", note: "Genuine parts, new and used", photo: "/photos/lamborghini-centenario.jpg" },
  { make: "Maserati", note: "Genuine parts, new and used", photo: "/photos/ferrari-458-italia.jpg" },
];

function SearchForm({ id, onDone }: { id: string; onDone?: () => void }) {
  const t = useT();
  return (
    <form className="hdr-search" action="/store" method="get" role="search" onSubmit={onDone}>
      <label htmlFor={id} className="sr-only"><T>Search by OEM part number or name</T></label>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input id={id} name="q" type="search" autoComplete="off" placeholder={t("OEM part number or name…")} maxLength={100} />
      <button type="submit"><T>Search</T></button>
    </form>
  );
}

export function Header() {
  const path = usePathname();
  const items = useShortlist();
  const t = useT();
  const n = items.length;
  const [mega, setMega] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [lastPath, setLastPath] = useState(path);
  const [stuck, setStuck] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Close menus on navigation (render-phase reset keeps this out of an effect).
  if (lastPath !== path) { setLastPath(path); setMega(false); setDrawer(false); }

  useEffect(() => {
    const on = () => setStuck(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setMega(false); setDrawer(false); } };
    const out = (e: MouseEvent) => { if (navRef.current && !navRef.current.contains(e.target as Node)) setMega(false); };
    document.addEventListener("keydown", esc);
    document.addEventListener("mousedown", out);
    return () => { document.removeEventListener("keydown", esc); document.removeEventListener("mousedown", out); };
  }, []);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-drawer", drawer);
    return () => document.documentElement.removeAttribute("data-drawer");
  }, [drawer]);

  return (
    <>
      <a className="skip" href="#main"><T>Skip to content</T></a>
      <div className="topbar">
        <div className="wrap">
          <TopbarPromo />
          <span><T>Genuine-parts enquiries</T> · <a href="tel:+97143287914">+971 4 328 7914</a></span>
        </div>
      </div>
      <header className="nav" data-stuck={stuck ? "" : undefined} data-mega={mega ? "" : undefined} ref={navRef}>
        <div className="wrap nav-row">
          <button type="button" className="burger" aria-label={t(drawer ? "Close menu" : "Open menu")} aria-expanded={drawer} aria-controls="drawer" onClick={() => setDrawer((d) => !d)}>
            <span /><span /><span />
          </button>
          <Link className="brand" href="/" aria-label={t("Autovivo home")}>
            <span className="wordmark"><span>auto</span><span>vivo</span></span>
            <span className="brand-sub" aria-hidden="true"><T>Italian luxury car parts</T></span>
          </Link>
          <nav className="navlinks" aria-label={t("Main")}>
            <button type="button" className="mega-trigger" aria-expanded={mega} aria-controls="mega" onClick={() => setMega((m) => !m)} onMouseEnter={() => window.matchMedia("(hover: hover)").matches && setMega(true)}>
              <T>Parts</T> <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>
            </button>
            {links.map((l) => (
              <Link key={l.href} href={l.href} onMouseEnter={() => setMega(false)} aria-current={path.startsWith(l.href) ? "page" : undefined}><T>{l.label}</T></Link>
            ))}
          </nav>
          <SearchForm id="hdr-q" />
          <LangToggle />
          <Link className="btn small quote-pill" href="/quote" aria-label={t(n === 1 ? "Enquiry list, {n} item" : "Enquiry list, {n} items", { n })}>
            <span className="qp-label"><T>Enquiry list</T></span> <span className="count" key={n} aria-hidden="true">{n}</span>
          </Link>
          <span className="sr-only" role="status" aria-live="polite">{n === 0 ? "" : t(n === 1 ? "{n} item in your enquiry list" : "{n} items in your enquiry list", { n })}</span>
        </div>
        <div className="mega" id="mega" hidden={!mega} onMouseLeave={() => setMega(false)}>
          <div className="wrap mega-grid">
            {MARQUES.map((m) => (
              <Link key={m.make} href={`/store?brand=${m.make}`} className="mega-card" onClick={() => setMega(false)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.photo} alt="" loading="lazy" width={320} height={200} />
                <span className="mega-card-body"><b>{m.make}</b><small><T>{m.note}</T></small><i aria-hidden="true">→</i></span>
              </Link>
            ))}
            <ul className="mega-links">
              <li><Link href="/store" onClick={() => setMega(false)}><T>All parts</T></Link></li>
              <li><Link href="/vehicles/ferrari-488-gtb" onClick={() => setMega(false)}><T>3D-style explorer</T></Link></li>
              <li><Link href="/catalog" onClick={() => setMega(false)}><T>Assembly catalog</T></Link></li>
              <li><Link href="/preorder" onClick={() => setMega(false)}><T>Pre-order a part</T></Link></li>
            </ul>
          </div>
        </div>
      </header>
      <div className="drawer" id="drawer" hidden={!drawer}>
        <SearchForm id="drawer-q" onDone={() => setDrawer(false)} />
        <nav aria-label={t("Main (mobile)")}>
          {MARQUES.map((m) => <Link key={m.make} href={`/store?brand=${m.make}`}>{m.make}</Link>)}
          {links.map((l) => <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}><T>{l.label}</T></Link>)}
          <Link href="/preorder"><T>Pre-order</T></Link>
          <Link href="/quote"><T>Enquiry list</T> ({n})</Link>
        </nav>
      </div>
    </>
  );
}

export function Footer() {
  const t = useT();
  return (
    <footer className="footer">
      <FooterMap />
      <div className="wrap footer-main">
        <div>
          <p><strong>Autovivo Spare Parts L.L.C</strong> · <T>Italy & Dubai</T> · <a href="tel:+97143287914">+971 4 328 7914</a> ·{" "}
            <a href="https://autovivo.it/" target="_blank" rel="noreferrer">autovivo.it ↗</a></p>
          <p><T>Ferrari, Lamborghini and Maserati are named only to identify the vehicles our parts fit. Autovivo is an independent parts supplier, not affiliated with those manufacturers.</T></p>
          <p><T>Please confirm fitment against your VIN before ordering. Prices on request — send an enquiry and we reply with price and availability.</T></p>
          <p><strong>Dubai</strong> · Store 68, Al-Wasl Compound, 1st Al-Khail Rd · <T>Mon – Sat 08:30 – 18:00</T><br />
            <strong>Modena</strong> · Via Vignolese 186/188, 41124 Modena MO · <a href="tel:+390597878337">+39 059 787 8337</a> · <T>Mon – Fri 09:00 – 17:00</T><br />
            <a href="mailto:info@autovivo.it">info@autovivo.it</a></p>
        </div>
        <nav aria-label={t("Footer")}>
          <Link href="/vehicles/ferrari-488-gtb"><T>Explorer</T></Link>
          <Link href="/store"><T>All parts</T></Link>
          <Link href="/preorder"><T>Pre-order</T></Link>
          <Link href="/catalog"><T>Catalog</T></Link>
          <Link href="/sources"><T>Part data & credits</T></Link>
          <Link href="/contact"><T>Find us</T></Link>
          <Link href="/quote"><T>Enquiry list</T></Link>
        </nav>
      </div>
    </footer>
  );
}
