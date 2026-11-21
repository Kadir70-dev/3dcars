import Link from "next/link";
import { api, formatDate, VEHICLE, type Assembly, type StoreResponse, type VehicleDetail } from "@/lib/api";
import { DEMO458_BINDINGS } from "@/lib/demo458";
import { LAMBO_PART_COUNT } from "@/lib/demoLambo";
import Explorer from "@/components/Explorer";
import { StatusPill } from "@/components/Status";
import { ApiDown } from "@/components/ApiDown";
import TiltGrid from "@/components/TiltGrid";

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
  const marques = [
    { make: "Ferrari", count: brands.Ferrari ?? 0, demo: "/demo/ferrari-458", demoLabel: "View in 3D", note: "Genuine Ferrari parts, new and used" },
    { make: "Lamborghini", count: brands.Lamborghini ?? 0, demo: "/demo/lamborghini", demoLabel: "View in 3D", note: "Genuine Lamborghini parts, new and used" },
    { make: "Maserati", count: brands.Maserati ?? 0, demo: "", demoLabel: "", note: "Genuine Maserati parts, new and used" },
  ];

  return (
    <>
      {/* Hero: the full-screen 3D explorer (Ferrari / Lamborghini / Maserati), group details below. */}
      <Explorer vehicle={v} assemblies={list} initialCode="0001" hero={
        <div className="hero-copy">
          <div className="eyebrow">Modena &amp; Dubai · Worldwide delivery</div>
          <h1>Genuine Ferrari, Lamborghini &amp; Maserati <em>parts.</em></h1>
          <p>Explore the car in 3D, find the part, and send an enquiry. We confirm fitment against your VIN before anything ships.</p>
          <div className="hero-actions">
            <Link className="btn primary" href="/store">Browse {total} parts</Link>
            <a className="btn" href="tel:+97143287914">Call<span className="hide-sm"> +971 4 328 7914</span></a>
          </div>
        </div>
      } />

      <section className="wrap section reveal" aria-labelledby="marques-h">
        <div className="section-head centered">
          <div className="eyebrow">Our marques</div>
          <h2 id="marques-h">Italian <em>icons.</em></h2>
        </div>
        <TiltGrid className="marques" selector=".marque" tilt={0.7}>
          {marques.map((m) => (
            <article className="card marque" key={m.make}>
              <span className="marque-count">{m.count}</span>
              <span className="marque-unit">parts in stock &amp; on request</span>
              <h3>{m.make}</h3>
              <p className="muted">{m.note}</p>
              <div className="marque-actions">
                <Link className="btn small primary" href={`/store?brand=${m.make}`}>Shop {m.make}</Link>
                {m.demo ? <Link className="btn small" href={m.demo}>{m.demoLabel}</Link> : <span className="marque-soon">3D model coming soon</span>}
              </div>
            </article>
          ))}
        </TiltGrid>
      </section>

      <section className="wrap section reveal" aria-label="In numbers">
        <div className="stats">
          <div><b>{total}</b><span>parts listed by Autovivo</span></div>
          <div><b>2</b><span>locations: Modena &amp; Dubai</span></div>
          <div><b>3</b><span>marques: Ferrari, Lamborghini, Maserati</span></div>
          <div><b>100+</b><span>countries shipped to</span></div>
        </div>
      </section>

      <section className="wrap section reveal" aria-labelledby="how-h">
        <div className="section-head centered">
          <div className="eyebrow">How it works</div>
          <h2 id="how-h">From the diagram to <em>your door.</em></h2>
        </div>
        <TiltGrid className="steps-wrap" selector=".steps li" tilt={0.6}><ol className="steps">
          <li><b>1</b><h3>Find the part</h3><p>Spin the car, open an assembly group, or search all {total} listed parts by name or part number.</p></li>
          <li><b>2</b><h3>Add it to your enquiry</h3><p>Collect parts and groups in one list. Prices are on request, so nothing is charged online.</p></li>
          <li><b>3</b><h3>We check fitment</h3><p>Send your VIN. We confirm the part number and fitment, then reply with price and availability.</p></li>
        </ol></TiltGrid>
      </section>

      <section className="wrap section reveal" aria-labelledby="facts-h">
        <div className="section-head centered">
          <div className="eyebrow">Before you order</div>
          <h2 id="facts-h">Fitment, <em>checked.</em></h2>
          <p>Send us your VIN and we confirm the part number and fitment before anything ships.</p>
        </div>
        <TiltGrid className="board" selector=".metric" tilt={0.6}>
          <Metric n={v.counts.assemblies} label="Assembly groups" note="Titles from a public 488 GTB (USA) index." pill="publicly_listed" />
          <Metric n={total} label="Autovivo-listed parts" note="Part numbers and fitment as listed in the store." pill="publicly_listed" />
          <Metric n={v.counts.verifiedParts} label="Verified against Ferrari data" note="Needs an authorized Ferrari parts catalogue." pill="source_required" />
          <Metric n={v.counts.fitments} label="Fitment records" note="As listed; confirm against your VIN." pill="publicly_listed" />
        </TiltGrid>
        {factSource && (
          <p className="fact-line muted">488 GTB facts from {factSource.sourceTitle} ({factSource.sourceRef}), checked {formatDate(factSource.checkedOn)} <StatusPill status={factSource.verificationStatus} /></p>
        )}
      </section>

      <section className="wrap section cta-final reveal" aria-labelledby="cta-h">
        <h2 id="cta-h">Need a part that isn&rsquo;t <em>listed?</em></h2>
        <p className="muted">Autovivo sources genuine parts on request from Italy and Dubai.</p>
        <div className="hero-actions">
          <a className="btn primary" href="tel:+97143287914">Call +971 4 328 7914</a>
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
      <b>{n}</b>
      <div>{label}</div>
      <p>{note}</p>
    </div>
  );
}
