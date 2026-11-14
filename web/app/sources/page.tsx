import type { Metadata } from "next";
import { api, VEHICLE, type Source, type VehicleDetail } from "@/lib/api";
import { ApiDown } from "@/components/ApiDown";

// Rendered per request: Next 16.4 ISR regeneration referenced a CSS chunk missing from the build.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sources & data gaps",
  description: "Where every Ferrari 488 GTB record comes from, and which authorized data and licences are still missing.",
  alternates: { canonical: "/sources" },
};

const typeLabel: Record<string, string> = {
  oem_authorized: "OEM authorized",
  licensed_third_party: "Licensed third party",
  manufacturer_publication: "Manufacturer publication",
  public_retailer_index: "Public retailer index",
  client_catalogue: "Client catalogue",
  project_classification: "Project classification",
};

export default async function Sources() {
  let sources: Source[], v: VehicleDetail;
  try {
    [{ sources }, v] = await Promise.all([api<{ sources: Source[] }>("/sources"), api<VehicleDetail>(`/vehicles/${VEHICLE}`)]);
  } catch {
    return <ApiDown />;
  }
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow">Research trail</div>
        <h1>Sources before <em>specifications.</em></h1>
        <p>Every value on this site links back to one of these sources with a date checked and a verification status.
          A public retailer index is useful for navigation but is never treated as an authorized Ferrari parts catalogue.</p>
      </header>
      <div className="two-col">
        <section aria-labelledby="src-h">
          <h2 id="src-h" style={{ fontSize: 30, marginBottom: 16 }}>Sources</h2>
          <div className="list">
            {sources.map((s) => (
              <article className="card row-card" key={s.id}>
                <header>
                  <h3>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a> : s.title}</h3>
                  <span className={`pill ${s.sourceType === "public_retailer_index" ? "publicly_listed" : "neutral"}`}>{typeLabel[s.sourceType] ?? s.sourceType}</span>
                </header>
                <p>Publisher: {s.publisher}</p>
                {s.licenseNotes && <p><b>Licence:</b> {s.licenseNotes}</p>}
                {s.accessRequirements && <p><b>Access:</b> {s.accessRequirements}</p>}
              </article>
            ))}
          </div>
        </section>
        <section aria-labelledby="gap-h">
          <h2 id="gap-h" style={{ fontSize: 30, marginBottom: 16 }}>What is missing</h2>
          <div className="list">
            {v.dataGaps.map((g) => (
              <article className="card row-card" key={g.area}>
                <header><h3>{g.area}</h3><span className={`pill ${g.status === "resolved" ? "verified" : "source_required"}`}>{g.status.replace("_", " ")}</span></header>
                <p>{g.missing}</p>
                <p><b style={{ color: "var(--text)" }}>Needed:</b> {g.accessNeeded}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
