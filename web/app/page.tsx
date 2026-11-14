import Link from "next/link";
import { api, formatDate, VEHICLE, type VehicleDetail } from "@/lib/api";
import { Schematic } from "@/components/Schematic";
import { StatusPill } from "@/components/Status";
import { ApiDown } from "@/components/ApiDown";

// Rendered per request: Next 16.4 ISR regeneration referenced a CSS chunk missing from the build.
export const dynamic = "force-dynamic";

export default async function Home() {
  let v: VehicleDetail;
  try {
    v = await api<VehicleDetail>(`/vehicles/${VEHICLE}`);
  } catch {
    return <ApiDown />;
  }
  const factSource = v.facts[0]?.provenance;
  return (
    <>
      <section className="wrap hero">
        <div>
          <div className="eyebrow">Vehicle study 01 · Ferrari</div>
          <h1>488 GTB<br /><em>parts atlas.</em></h1>
          <p className="lead">
            Explore the Ferrari 488 GTB system by system. Every record shows where it came from and how far it has been verified,
            so you always know what is confirmed and what still needs an authorized source.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" href={`/vehicles/${v.slug}`}>Open the explorer</Link>
            <Link className="btn" href="/catalog">Search {v.counts.assemblies} assembly groups</Link>
            <Link className="btn" href="/demo/ferrari-458">3D demo</Link>
            <Link className="btn" href="/store">All parts</Link>
          </div>
          <div className="hero-meta">
            <span className="pill neutral">Market index: {v.market ?? "—"}</span>
            <span className="pill unverified">Model year: not assumed</span>
            <span className="pill unverified">VIN fitment: not verified</span>
          </div>
        </div>
        <Link href={`/vehicles/${v.slug}`} className="stage" aria-label="Open the explorer">
          <span className="stage-label">Illustrative schematic · not OEM geometry</span>
          <Schematic className="schematic" />
        </Link>
      </section>

      <section className="wrap section" aria-labelledby="fleet-h">
        <div className="section-head">
          <div><div className="eyebrow">Vehicle portfolio</div><h2 id="fleet-h">Choose a <em>car.</em></h2></div>
          <p>One vehicle at a time, finished properly. The Ferrari is in research and the Lamborghini has a 3D demo; Maserati has not started.</p>
        </div>
        <div className="fleet">
          <Link href={`/vehicles/${v.slug}`} className="card vcard live">
            <div className="vcard-stage"><span className="stage-label">Illustrative schematic</span><Schematic className="schematic" /></div>
            <div className="vcard-body">
              <div className="vcard-top"><span className="eyebrow">{v.make}</span><span className="pill publicly_listed">In research</span></div>
              <h3>{v.model}</h3>
              <ul className="vcard-stats">
                <li><b>{v.counts.assemblies}</b> assembly groups</li>
                <li><b>{v.counts.parts}</b> listed parts</li>
                <li><b>{v.model3d ? "Licensed" : "—"}</b> 3D model</li>
              </ul>
              <span className="vcard-cta">Open explorer <span aria-hidden="true">→</span></span>
            </div>
          </Link>
          <Link href="/demo/lamborghini" className="card vcard live">
            <div className="vcard-stage"><span className="vcard-planned">3D demo</span></div>
            <div className="vcard-body">
              <div className="vcard-top"><span className="eyebrow">Lamborghini</span><span className="pill unverified">Demo model</span></div>
              <h3>Centenario</h3>
              <p className="muted">Community 3D model (CC BY 4.0) — not OEM data.</p>
              <span className="vcard-cta">Open 3D demo <span aria-hidden="true">→</span></span>
            </div>
          </Link>
          {["Maserati"].map((make) => (
            <div className="card vcard planned" key={make} aria-disabled="true">
              <div className="vcard-stage"><span className="vcard-planned">Planned</span></div>
              <div className="vcard-body">
                <div className="vcard-top"><span className="eyebrow">{make}</span><span className="pill neutral">Not started</span></div>
                <h3>Model to be chosen</h3>
                <p className="muted">Begins after the Ferrari milestone is reviewed.</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="facts-h">
        <div className="section-head">
          <div><div className="eyebrow">Model-level facts</div><h2 id="facts-h">Know the <em>reference car.</em></h2></div>
          <p>From Ferrari’s own published prospectus. These describe the model in general — they do not establish fitment for a specific car.</p>
        </div>
        <div className="card">
          <div className="facts">
            {v.facts.map((f) => <div className="fact" key={f.label}><strong>{f.value}</strong><span>{f.label}</span></div>)}
          </div>
          {factSource && (
            <div className="fact-source">
              <span>Source: {factSource.sourceUrl ? <a href={factSource.sourceUrl} target="_blank" rel="noreferrer">{factSource.sourceTitle} ↗</a> : factSource.sourceTitle} · {factSource.sourceRef}</span>
              <span>Checked {formatDate(factSource.checkedOn)} <StatusPill status={factSource.verificationStatus} /></span>
            </div>
          )}
        </div>
      </section>

      <section className="wrap section" aria-labelledby="status-h">
        <div className="section-head">
          <div><div className="eyebrow">Data status</div><h2 id="status-h">Honest by <em>design.</em></h2></div>
          <p>Counts update live from the catalogue. Zero means a licensed or authorized source has not been connected yet — not that the car has no parts.</p>
        </div>
        <div className="board">
          <Metric n={v.counts.assemblies} label="Assembly groups" note="Titles from a public 488 GTB (USA) index." pill="publicly_listed" />
          <Metric n={v.counts.parts} label="Autovivo-listed 488 parts" note="Part numbers and fitment as listed in the store; not yet EPC-checked." pill="publicly_listed" />
          <Metric n={v.counts.verifiedParts} label="Verified individual parts" note="Needs an authorized Ferrari parts catalogue." pill="source_required" />
          <Metric n={v.counts.fitments} label="VIN fitment records" note="Needs VIN-level catalogue access." pill="source_required" />
          <Metric n={v.model3d ? 1 : 0} label="Licensed 3D models" note={v.model3d ? `Licensed from ${v.model3d.licensor}.` : "Awaiting an approved commercial licence."} pill={v.model3d ? "verified" : "source_required"} />
        </div>
        <p style={{ marginTop: 18 }}><Link href="/sources" className="btn small">See sources &amp; what is missing →</Link></p>
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
