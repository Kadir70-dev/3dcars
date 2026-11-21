"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShortlist } from "@/lib/shortlist";

const links = [
  { href: "/vehicles/ferrari-488-gtb", label: "Explorer" },
  { href: "/store", label: "All parts" },
  { href: "/catalog", label: "Catalog" },
  { href: "/contact", label: "Find us" },
];

export function Header() {
  const path = usePathname();
  const items = useShortlist();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="topbar">
        <div className="wrap">
          <span>Genuine parts · Modena &amp; Dubai · Worldwide delivery</span>
          <span>Genuine-parts enquiries · <a href="tel:+97143287914">+971 4 328 7914</a></span>
        </div>
      </div>
      <header className="nav">
        <div className="wrap">
          <Link className="brand" href="/" aria-label="Autovivo home">
            <span className="wordmark"><span>auto</span><span>vivo</span></span>
            <span className="brand-sub" aria-hidden="true">Italian luxury car parts</span>
          </Link>
          <nav className="navlinks" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}>{l.label}</Link>
            ))}
          </nav>
          <Link className="btn small quote-pill" href="/quote" aria-label={`Enquiry list, ${items.length} item${items.length === 1 ? "" : "s"}`}>
            Enquiry list <span className="count" key={items.length} aria-hidden="true">{items.length}</span>
          </Link>
          <span className="sr-only" role="status" aria-live="polite">{items.length === 0 ? "" : `${items.length} item${items.length === 1 ? "" : "s"} in your enquiry list`}</span>
        </div>
      </header>
      {/* Outside the sticky header so only the logo row stays pinned on a phone. */}
      <nav className="mobile-nav" aria-label="Main (mobile)">
        {links.map((l) => <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}>{l.label}</Link>)}
      </nav>
    </>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div>
          <p><strong>Autovivo Spare Parts L.L.C</strong> · Italy &amp; Dubai · <a href="tel:+97143287914">+971 4 328 7914</a> ·{" "}
            <a href="https://autovivo.it/" target="_blank" rel="noreferrer">autovivo.it ↗</a></p>
          <p>Ferrari, Lamborghini and Maserati are named only to identify the vehicles our parts fit. Autovivo is an independent parts supplier, not affiliated with those manufacturers.</p>
          <p>Please confirm fitment against your VIN before ordering. Prices on request — send an enquiry and we reply with price and availability.</p>
          <p><strong>Dubai</strong> · Store 68, Al-Wasl Compound, 1st Al-Khail Rd · Mon – Sat 08:30 – 18:00<br />
            <strong>Modena</strong> · Via Vignolese 186/188, 41124 Modena MO · <a href="tel:+390597878337">+39 059 787 8337</a> · Mon – Fri 09:00 – 17:00<br />
            <a href="mailto:info@autovivo.it">info@autovivo.it</a></p>
        </div>
        <nav aria-label="Footer">
          <Link href="/vehicles/ferrari-488-gtb">Explorer</Link>
          <Link href="/store">All parts</Link>
          <Link href="/catalog">Catalog</Link>
          <Link href="/sources">Part data &amp; credits</Link>
          <Link href="/contact">Find us</Link>
          <Link href="/quote">Enquiry list</Link>
        </nav>
      </div>
    </footer>
  );
}
