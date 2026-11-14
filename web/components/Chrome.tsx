"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShortlist } from "@/lib/shortlist";

const links = [
  { href: "/vehicles/ferrari-488-gtb", label: "Explorer" },
  { href: "/store", label: "All parts" },
  { href: "/catalog", label: "Catalog" },
  { href: "/sources", label: "Sources" },
];

export function Header() {
  const path = usePathname();
  const items = useShortlist();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="topbar">
        <div className="wrap">
          <span><b>Private preview</b> · Ferrari 488 GTB parts explorer</span>
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
            Enquiry list <span className="count" aria-hidden="true">{items.length}</span>
          </Link>
        </div>
        <nav className="mobile-nav" aria-label="Main (mobile)">
          {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
        </nav>
      </header>
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
          <p>Ferrari and 488 GTB are named solely to identify the vehicle. Autovivo is an independent parts supplier and is not
            affiliated with, endorsed by, or sponsored by Ferrari S.p.A.</p>
          <p>Part numbers and fitment marked “Listed” come from Autovivo’s store catalogue; assembly titles come from a public
            retailer index. Neither is yet checked against Ferrari’s own catalogue — confirm against your VIN before ordering.
            Prices on request; no online checkout here.</p>
          <p className="mono" style={{ fontSize: 11, letterSpacing: ".1em" }}>AUTOVIVO · PARTS EXPLORER · PRIVATE PREVIEW</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/vehicles/ferrari-488-gtb">Explorer</Link>
          <Link href="/store">All parts</Link>
          <Link href="/catalog">Catalog</Link>
          <Link href="/sources">Sources &amp; data gaps</Link>
          <Link href="/quote">Enquiry list</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}
