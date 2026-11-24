"use client";
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

export function Header() {
  const path = usePathname();
  const items = useShortlist();
  const t = useT();
  const n = items.length;
  return (
    <>
      <a className="skip" href="#main"><T>Skip to content</T></a>
      <div className="topbar">
        <div className="wrap">
          <TopbarPromo />
          <span><T>Genuine-parts enquiries</T> · <a href="tel:+97143287914">+971 4 328 7914</a></span>
        </div>
      </div>
      <header className="nav">
        <div className="wrap">
          <Link className="brand" href="/" aria-label={t("Autovivo home")}>
            <span className="wordmark"><span>auto</span><span>vivo</span></span>
            <span className="brand-sub" aria-hidden="true"><T>Italian luxury car parts</T></span>
          </Link>
          <nav className="navlinks" aria-label={t("Main")}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}><T>{l.label}</T></Link>
            ))}
          </nav>
          <LangToggle />
          <Link className="btn small quote-pill" href="/quote" aria-label={t(n === 1 ? "Enquiry list, {n} item" : "Enquiry list, {n} items", { n })}>
            <T>Enquiry list</T> <span className="count" key={n} aria-hidden="true">{n}</span>
          </Link>
          <span className="sr-only" role="status" aria-live="polite">{n === 0 ? "" : t(n === 1 ? "{n} item in your enquiry list" : "{n} items in your enquiry list", { n })}</span>
        </div>
      </header>
      {/* Outside the sticky header so only the logo row stays pinned on a phone. */}
      <nav className="mobile-nav" aria-label={t("Main (mobile)")}>
        {links.map((l) => <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}><T>{l.label}</T></Link>)}
      </nav>
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
