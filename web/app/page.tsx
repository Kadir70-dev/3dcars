import Link from "next/link";
import dynamicImport from "next/dynamic";
import { api, formatDate, VEHICLE, type StoreResponse, type VehicleDetail } from "@/lib/api";
import { DEMO458_ATTRIBUTION, DEMO458_BINDINGS } from "@/lib/demo458";
import { LAMBO_PART_COUNT } from "@/lib/demoLambo";
import LazyMount from "@/components/LazyMount";
import CarSwitcher from "@/components/CarSwitcher";
import { StatusPill } from "@/components/Status";
import { ApiDown } from "@/components/ApiDown";
import type { Caption } from "@/components/ScrollCar";

const ScrollCar = dynamicImport(() => import("@/components/ScrollCar"));

// Rendered per request: Next 16.4 ISR regeneration referenced a CSS chunk missing from the build.
export const dynamic = "force-dynamic";

const CAPTIONS: Caption[] = [
  { from: 0, to: 0.2, eyebrow: "360° view", title: "Turn it all the way round.", body: "Scroll to spin a real 3D car through a full circle." },
  { from: 0.2, to: 0.48, eyebrow: "Every angle", title: "Look closer, from any side.", body: "Bodywork, lamps, glass and wheels — exactly where they sit." },
  { from: 0.48, to: 0.8, eyebrow: "Disassembly", title: "Then take it apart.", body: `${DEMO458_BINDINGS.length} pieces lift away in order: trim, lamps, glass, panels, wheels and cabin.` },
  { from: 0.8, to: 1.01, eyebrow: "Find the part", title: "From the model to the part you need.", body: "Search genuine parts listed by Autovivo and send one enquiry." },
];

export default async function Home() {
  let v: VehicleDetail, store: StoreResponse;
  try {
    [v, store] = await Promise.all([api<VehicleDetail>(`/vehicles/${VEHICLE}`), api<StoreResponse>("/store-parts")]);
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
      <section className="wrap hero-apple">
        <div className="eyebrow">Autovivo · Italian luxury car parts</div>
        <h1>Every part.<br /><em>Every angle.</em></h1>
        <p className="lead">Genuine Ferrari, Lamborghini and Maserati parts from Autovivo — browse them, see where they sit in 3D, and send one enquiry.</p>
        <div className="hero-actions">
          <Link className="btn primary" href="/store">Browse {total} parts</Link>
          <Link className="btn" href="/demo/lamborghini">Take a car apart</Link>
        </div>
        <p className="hero-note">Prices on request · fitment confirmed against your VIN</p>
      </section>

      <ScrollCar captions={CAPTIONS} credit={<>3D model: “{DEMO458_ATTRIBUTION.title}” by {DEMO458_ATTRIBUTION.author}, {DEMO458_ATTRIBUTION.license} — a community model, not OEM data. <Link href="/sources">Credits</Link></>} />

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

      <section className="wrap section reveal" aria-labelledby="explorer-h">
        <div className="split">
          <div>
            <div className="eyebrow">Ferrari · Lamborghini · Maserati</div>
            <h2 id="explorer-h">Find parts <em>by system.</em></h2>
            <p className="muted">Browse the 488 GTB by its {v.counts.assemblies} assembly groups, with {v.counts.parts} Autovivo-listed parts and the source of every record.</p>
            <div className="hero-actions">
              <Link className="btn primary" href={`/vehicles/${v.slug}`}>Open the explorer</Link>
              <Link className="btn" href="/catalog">Search groups</Link>
            </div>
          </div>
          <div className="card split-stage"><LazyMount minHeight={460}><CarSwitcher /></LazyMount></div>
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
