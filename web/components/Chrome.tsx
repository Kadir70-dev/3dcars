"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShortlist } from "@/lib/shortlist";

const links = [
  { href: "/vehicles/ferrari-488-gtb", label: "Explorer" },
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
          <span><b>Research preview</b> · Ferrari 488 GTB</span>
          <span>Independent project · Not affiliated with Ferrari</span>
        </div>
      </div>
      <header className="nav">
        <div className="wrap">
          <Link className="brand" href="/" aria-label="Apex Auto Atlas home">
            <span className="brand-mark" aria-hidden="true"><span>AA</span></span>
            <span>APEX <small>AUTO ATLAS</small></span>
          </Link>
          <nav className="navlinks" aria-label="Main">
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={path.startsWith(l.href) ? "page" : undefined}>{l.label}</Link>
            ))}
          </nav>
          <Link className="btn small quote-pill" href="/quote" aria-label={`Quote list, ${items.length} item${items.length === 1 ? "" : "s"}`}>
            Quote list <span className="count" aria-hidden="true">{items.length}</span>
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
          <p><strong>Independent research project.</strong> Ferrari and 488 GTB are named solely to identify the vehicle.
            Apex Auto Atlas is not affiliated with, endorsed by, or sponsored by Ferrari S.p.A.</p>
          <p>Assembly titles come from a public retailer index and are not an authorized parts catalogue.
            Do not order parts or perform repairs from this site alone. No prices, stock or checkout are offered.</p>
          <p className="mono" style={{ fontSize: 11, letterSpacing: ".1em" }}>APEX AUTO ATLAS · FERRARI MILESTONE</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/vehicles/ferrari-488-gtb">Explorer</Link>
          <Link href="/catalog">Catalog</Link>
          <Link href="/sources">Sources &amp; data gaps</Link>
          <Link href="/quote">Quote list</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}
