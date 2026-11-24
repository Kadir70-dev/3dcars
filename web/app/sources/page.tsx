import type { Metadata } from "next";
import { api, VEHICLE, type Source, type VehicleDetail } from "@/lib/api";
import { ApiDown } from "@/components/ApiDown";
import { T } from "@/lib/i18n";

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
        <div className="eyebrow"><T>Research trail</T></div>
        <h1><T>{"Sources before <em>specifications.</em>"}</T></h1>
        <p><T>Every value on this site links back to one of these sources with a date checked and a verification status. A public retailer index is useful for navigation but is never treated as an authorized Ferrari parts catalogue.</T></p>
      </header>
      <div className="two-col">
        <section aria-labelledby="src-h">
          <h2 id="src-h" style={{ fontSize: 30, marginBottom: 16 }}><T>Sources</T></h2>
          <div className="list">
            {sources.map((s) => (
              <article className="card row-card" key={s.id}>
                <header>
                  <h3>{s.url ? <a href={s.url} target="_blank" rel="noreferrer"><T>{s.title}</T> ↗</a> : <T>{s.title}</T>}</h3>
                  <span className={`pill ${s.sourceType === "public_retailer_index" ? "publicly_listed" : "neutral"}`}><T>{typeLabel[s.sourceType] ?? s.sourceType}</T></span>
                </header>
                <p><T>Publisher:</T> {s.publisher}</p>
                {s.licenseNotes && <p><b><T>Licence:</T></b> <T>{s.licenseNotes}</T></p>}
                {s.accessRequirements && <p><b><T>Access:</T></b> <T>{s.accessRequirements}</T></p>}
              </article>
            ))}
          </div>
        </section>
        <section aria-labelledby="gap-h">
          <h2 id="gap-h" style={{ fontSize: 30, marginBottom: 16 }}><T>What is missing</T></h2>
          <div className="list">
            {v.dataGaps.map((g) => (
              <article className="card row-card" key={g.area}>
                <header><h3><T>{g.area}</T></h3><span className={`pill ${g.status === "resolved" ? "verified" : "source_required"}`}><T>{g.status.replace("_", " ")}</T></span></header>
                <p><T>{g.missing}</T></p>
                <p><b style={{ color: "var(--text)" }}><T>Needed:</T></b> <T>{g.accessNeeded}</T></p>
              </article>
            ))}
          </div>
        </section>
      </div>
      <section className="section" style={{ paddingTop: 40 }} aria-labelledby="credits-h">
        <h2 id="credits-h" style={{ fontSize: 30, marginBottom: 12 }}><T>Photo credits</T></h2>
        <p className="muted" style={{ maxWidth: 760 }}>
          <T>The Ferrari 488 GTB photo is</T>{" "}
          “<a href="https://commons.wikimedia.org/wiki/File:Ferrari_488_GTB_IMG_4120.jpg" target="_blank" rel="noreferrer">Ferrari 488 GTB IMG 4120.jpg</a>”{" "}
          <T>by Alexander Migl, licensed under</T> <a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noreferrer">CC BY-SA 4.0</a><T>. It shows a privately owned car, not Autovivo stock. Ferrari is a trademark of Ferrari S.p.A.</T>
        </p>
      </section>
    </div>
  );
}
