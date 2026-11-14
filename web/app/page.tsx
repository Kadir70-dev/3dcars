import Link from "next/link";
import { api, formatDate, VEHICLE, type Assembly, type StoreResponse, type VehicleDetail } from "@/lib/api";
import { DEMO458_BINDINGS } from "@/lib/demo458";
import { LAMBO_PART_COUNT } from "@/lib/demoLambo";
import Explorer from "@/components/Explorer";
import { StatusPill } from "@/components/Status";
import { ApiDown } from "@/components/ApiDown";

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
    { make: "Ferrari", count: brands.Ferrari ?? 0, demo: "/demo/ferrari-458", demoLabel: "3D demo", note: "458 Italia community model" },
    { make: "Lamborghini", count: brands.Lamborghini ?? 0, demo: "/demo/lamborghini", demoLabel: "3D demo", note: "Centenario community model" },
    { make: "Maserati", count: brands.Maserati ?? 0, demo: "/demo/maserati", demoLabel: "3D concept", note: "Generated concept model" },
  ];

  return (
    <>
      {/* Hero: the full-screen 3D explorer (Ferrari / Lamborghini / Maserati), group details below. */}
      <h1 className="sr-only">Autovivo — genuine Ferrari, Lamborghini and Maserati parts, explored in 3D</h1>
      <Explorer vehicle={v} assemblies={list} initialCode="0001" />

      <section className="wrap section reveal" aria-labelledby="marques-h">
        <div className="section-head centered">
          <div className="eyebrow">Three marques</div>
          <h2 id="marques-h">Choose your <em>car.</em></h2>
        </div>
        <div className="marques">
          {marques.map((m) => (
            <article className="card marque" key={m.make}>
              <span className="marque-count">{m.count}</span>
              <span className="marque-unit">listed parts</span>
              <h3>{m.make}</h3>
              <p className="muted">{m.note}</p>
              <div className="marque-actions">
                <Link className="btn small primary" href={`/store?brand=${m.make}`}>Shop {m.make}</Link>
                <Link className="btn small" href={m.demo}>{m.demoLabel}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap section reveal" aria-label="In numbers">
        <div className="stats">
          <div><b>{total}</b><span>parts listed by Autovivo</span></div>
          <div><b>{DEMO458_BINDINGS.length}</b><span>pieces in the Ferrari 3D demo</span></div>
          <div><b>{LAMBO_PART_COUNT}</b><span>pieces in the Lamborghini 3D demo</span></div>
          <div><b>1</b><span>enquiry for everything you need</span></div>
        </div>
      </section>

      <section className="wrap section reveal" aria-labelledby="facts-h">
        <div className="section-head centered">
          <div className="eyebrow">Honest by design</div>
          <h2 id="facts-h">Know what is <em>confirmed.</em></h2>
          <p>Every record shows where it came from. Zero means a source is still needed — not that the car has no parts.</p>
        </div>
        <div className="board">
          <Metric n={v.counts.assemblies} label="Assembly groups" note="Titles from a public 488 GTB (USA) index." pill="publicly_listed" />
          <Metric n={total} label="Autovivo-listed parts" note="Part numbers and fitment as listed in the store." pill="publicly_listed" />
          <Metric n={v.counts.verifiedParts} label="Verified against Ferrari data" note="Needs an authorized Ferrari parts catalogue." pill="source_required" />
          <Metric n={v.counts.fitments} label="Fitment records" note="As listed; confirm against your VIN." pill="publicly_listed" />
        </div>
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
