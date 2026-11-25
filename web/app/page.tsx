import Link from "next/link";
import { api, VEHICLE, type Assembly, type StoreResponse, type VehicleDetail } from "@/lib/api";
import HomeVideo from "@/components/HomeVideo";
import { StatusPill } from "@/components/Status";
import { ApiDown } from "@/components/ApiDown";
import TiltGrid from "@/components/TiltGrid";
import CountUp from "@/components/CountUp";
import EnquiryForm from "@/components/EnquiryForm";
import { L, LocalDate, T } from "@/lib/i18n";

// Rendered per request: Next 16.4 ISR regeneration referenced a CSS chunk missing from the build.
export const dynamic = "force-dynamic";


export default async function Home() {
  let v: VehicleDetail, store: StoreResponse, list: Assembly[];
  try {
    [v, store, { assemblies: list }] = await Promise.all([
      api<VehicleDetail>(`/vehicles/${VEHICLE}`), api<StoreResponse>("/store-parts"),
      api<{ assemblies: Assembly[] }>(`/vehicles/${VEHICLE}/assemblies`),
    ]);
  } catch {
    return <ApiDown />;
  }
  const brands = store.result.brands;
  const total = Object.values(brands).reduce((a, b) => a + b, 0);
  const factSource = v.facts[0]?.provenance;
  const cats = [
    { q: "brake", label: "Brakes", d: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8z" },
    { q: "engine", label: "Engine", d: "M4 9h3l2-3h6l2 3h3v8h-3l-2 2H9l-2-2H4V9zm5 3h6" },
    { q: "light", label: "Lights", d: "M9 18h6m-5 3h4M12 3a6 6 0 00-3 11c.6.5 1 1.2 1 2h4c0-.8.4-1.5 1-2a6 6 0 00-3-11z" },
    { q: "wheel", label: "Wheels", d: "M12 3a9 9 0 100 18 9 9 0 000-18zm0 7a2 2 0 100 4 2 2 0 000-4zm0-7v5m0 8v5M3 12h5m8 0h5" },
    { q: "filter", label: "Filters", d: "M4 5h16l-6 8v6l-4-2v-4L4 5z" },
    { q: "bumper", label: "Bumpers", d: "M3 14l2-5h14l2 5v3H3v-3zm3 0h.01M18 14h.01" },
  ];
  const marques = [
    { make: "Ferrari", count: brands.Ferrari ?? 0, note: "Genuine Ferrari parts, new and used", photo: "/photos/ferrari-488-gtb.jpg" },
    { make: "Lamborghini", count: brands.Lamborghini ?? 0, note: "Genuine Lamborghini parts, new and used", photo: "/photos/lamborghini-centenario.jpg" },
    { make: "Maserati", count: brands.Maserati ?? 0, note: "Genuine Maserati parts, new and used", photo: "/photos/ferrari-458-italia.jpg" },
  ];

  return (
    <>
      <HomeVideo>
        <div className="home-hero">
          <div className="wrap">
            <div className="eyebrow" style={{ color: "#fff" }}><T>Ferrari · Lamborghini · Maserati</T></div>
            <h1><T>{"Italian supercar parts. <em>Precisely sourced.</em>"}</T></h1>
            <p className="lead"><T>Genuine OEM spares from our warehouses in Modena and Dubai, fitment-checked against your VIN.</T></p>
            <div className="hero-row">
              <form className="hero-search" action="/store" method="get" role="search">
                <label htmlFor="hero-q" className="sr-only"><T>Search by OEM part number or name</T></label>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <L as="input" id="hero-q" name="q" type="search" autoComplete="off" maxLength={100} placeholder="Search OEM part number or name…" />
                <button type="submit"><T>Search</T></button>
              </form>
              <div className="hero-chips">
                <span><T>Shop</T></span>
                {marques.map((m) => <Link key={m.make} href={`/store?brand=${m.make}`}>{m.make}</Link>)}
              </div>
            </div>
          </div>
          <span className="hero-scroll" aria-hidden="true" />
        </div>
      </HomeVideo>

      <section className="wrap section reveal" aria-labelledby="marques-h">
        <div className="section-head centered">
          <div className="eyebrow"><T>Our marques</T></div>
          <h2 id="marques-h"><T>{"Italian <em>icons.</em>"}</T></h2>
        </div>
        <TiltGrid className="marques" selector=".marque" tilt={0.7}>
          {marques.map((m) => (
            <article className="card marque" key={m.make}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="m-img" src={m.photo} alt="" loading="lazy" />
              <span className="marque-count"><CountUp value={m.count} /></span>
              <span className="marque-unit"><T>parts in stock & on request</T></span>
              <h3>{m.make}</h3>
              <p className="muted"><T>{m.note}</T></p>
              <div className="marque-actions">
                <Link className="btn small primary" href={`/store?brand=${m.make}`}><T v={{ make: m.make }}>{"Shop {make}"}</T></Link>
                
              </div>
            </article>
          ))}
        </TiltGrid>
      </section>

      <section className="wrap section reveal" aria-labelledby="cats-h">
        <div className="section-head">
          <div><div className="eyebrow"><T>Shop by component</T></div>
            <h2 id="cats-h" style={{ marginTop: 18 }}><T>{"Find the <em>system.</em>"}</T></h2></div>
          <p><T>Jump straight to the parts you need, then narrow by marque and model.</T></p>
        </div>
        <div className="cat-grid">
          {cats.map((c) => (
            <Link key={c.q} className="cat-tile" href={`/store?q=${c.q}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={c.d} /></svg>
              <span><b><T>{c.label}</T></b><small><T>Browse</T> →</small></span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap section reveal" aria-labelledby="ed-h">
        <div className="editorial">
          <figure className="img-reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="parallax" src="/photos/ferrari-458-italia.jpg" alt="Ferrari 458 Italia" loading="lazy" />
          </figure>
          <div>
            <div className="eyebrow"><T>The Autovivo workshop</T></div>
            <h2 id="ed-h"><T>{"Right part. <em>First time.</em>"}</T></h2>
            <p><T>Every enquiry is matched to your chassis number by a parts specialist before anything ships, so the part that arrives is the part that fits.</T></p>
            <ul>
              <li><b>01</b><span><T>OEM part number and VIN check</T></span></li>
              <li><b>02</b><span><T>Stock held in Modena and Dubai</T></span></li>
              <li><b>03</b><span><T>Worldwide dispatch once confirmed</T></span></li>
            </ul>
            <div className="hero-actions" style={{ marginTop: 0 }}>
              <Link className="btn primary" href="/preorder"><T>Start a pre-order</T></Link>
              <Link className="btn" href="/contact"><T>Visit the workshop</T></Link>
            </div>
          </div>
        </div>
      </section>

      <L as="section" className="wrap section reveal" aria-label="In numbers">
        <div className="stats">
          <div><b><CountUp value={total} /></b><span><T>parts listed by Autovivo</T></span></div>
          <div><b><CountUp value={2} /></b><span><T>locations: Modena & Dubai</T></span></div>
          <div><b><CountUp value={3} /></b><span><T>marques: Ferrari, Lamborghini, Maserati</T></span></div>
          <div><b><CountUp value={100} suffix="+" /></b><span><T>countries shipped to</T></span></div>
        </div>
      </L>

      <section className="wrap section reveal" aria-labelledby="how-h">
        <div className="section-head centered">
          <div className="eyebrow"><T>How it works</T></div>
          <h2 id="how-h"><T>{"From the diagram to <em>your door.</em>"}</T></h2>
        </div>
        <TiltGrid className="steps-wrap" selector=".steps li" tilt={0.6}><ol className="steps">
          <li><b>1</b><h3><T>Find the part</T></h3><p><T v={{ total }}>{"Open an assembly group, or search all {total} listed parts by name or part number."}</T></p></li>
          <li><b>2</b><h3><T>Add it to your enquiry</T></h3><p><T>Collect parts and groups in one list. Prices are on request, so nothing is charged online.</T></p></li>
          <li><b>3</b><h3><T>We check fitment</T></h3><p><T>Send your VIN. We confirm the part number and fitment, then reply with price and availability.</T></p></li>
        </ol></TiltGrid>
      </section>

      <section className="wrap section reveal" aria-labelledby="pre-h">
        <div className="preorder">
          <div className="preorder-copy">
            <div className="eyebrow"><T>Pre-order</T></div>
            <h2 id="pre-h"><T>{"Not in stock? <em>Pre-order it.</em>"}</T></h2>
            <p><T>Tell us the part you need. We source it from Italy and Dubai and reply with price, availability and lead time.</T></p>
            <div className="hero-actions">
              <Link className="btn primary" href="/preorder"><T>Start a pre-order</T></Link>
              <Link className="btn" href="/store"><T v={{ total }}>{"Browse {total} parts"}</T></Link>
            </div>
          </div>
          <ul className="preorder-points">
            <li><span aria-hidden="true">🧾</span><div><b><T>No online payment</T></b><T>Nothing is charged until we confirm price and availability.</T></div></li>
            <li><span aria-hidden="true">🔎</span><div><b><T>Fitment checked</T></b><T>Send your VIN and we confirm the part number before it ships.</T></div></li>
            <li><span aria-hidden="true">🚚</span><div><b><T>Sourced from Modena & Dubai</T></b><T>Delivered worldwide once confirmed.</T></div></li>
          </ul>
        </div>
      </section>

      <section className="wrap section reveal" aria-labelledby="facts-h">
        <div className="section-head centered">
          <div className="eyebrow"><T>Before you order</T></div>
          <h2 id="facts-h"><T>{"Fitment, <em>checked.</em>"}</T></h2>
          <p><T>Send us your VIN and we confirm the part number and fitment before anything ships.</T></p>
        </div>
        <TiltGrid className="board" selector=".metric" tilt={0.6}>
          <Metric n={v.counts.assemblies} label="Assembly groups" note="Titles from a public 488 GTB (USA) index." pill="publicly_listed" />
          <Metric n={total} label="Autovivo-listed parts" note="Part numbers and fitment as listed in the store." pill="publicly_listed" />
          <Metric n={v.counts.verifiedParts} label="Verified against Ferrari data" note="Needs an authorized Ferrari parts catalogue." pill="source_required" />
          <Metric n={v.counts.fitments} label="Fitment records" note="As listed; confirm against your VIN." pill="publicly_listed" />
        </TiltGrid>
        {factSource && (
          <p className="fact-line muted"><T>488 GTB facts from</T> <T>{factSource.sourceTitle}</T> (<T>{factSource.sourceRef ?? ""}</T>), <T>checked</T> <LocalDate d={factSource.checkedOn} /> <StatusPill status={factSource.verificationStatus} /></p>
        )}
      </section>

      <section className="wrap section reveal" aria-label="Quick enquiry">
        <EnquiryForm />
      </section>

      <section className="wrap section cta-final reveal" aria-labelledby="cta-h">
        <h2 id="cta-h"><T>{"Need a part that isn’t <em>listed?</em>"}</T></h2>
        <p className="muted"><T>Autovivo sources genuine parts on request from Italy and Dubai.</T></p>
        <div className="hero-actions">
          <a className="btn primary" href="tel:+97143287914"><T>Call</T> +971 4 328 7914</a>
          <a className="btn" href="mailto:info@autovivo.it">info@autovivo.it</a>
        </div>
      </section>
    </>
  );
}

function Metric({ n, label, note, pill }: { n: number; label: string; note: string; pill: "verified" | "publicly_listed" | "source_required" }) {
  return (
    <div className="card metric">
      <StatusPill status={pill} />
      <b><CountUp value={n} /></b>
      <div><T>{label}</T></div>
      <p><T>{note}</T></p>
    </div>
  );
}
