import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError, type PartDetail } from "@/lib/api";
import { Known, ProvenanceNote, StatusPill } from "@/components/Status";
import { AddPart } from "@/components/AddPart";
import { ApiDown } from "@/components/ApiDown";

type P = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!/^\d+$/.test(id)) notFound();
  try {
    return await api<PartDetail>(`/parts/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return null;
  }
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await load((await params).id);
  return p ? { title: `${p.name}${p.oemPartNumber ? ` (${p.oemPartNumber})` : ""}`, alternates: { canonical: `/parts/${p.id}` } } : {};
}

export default async function PartPage({ params }: P) {
  const p = await load((await params).id);
  if (!p) return <ApiDown />;
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow"><Link href="/catalog">Catalog</Link> / Part</div>
        <h1>{p.name}</h1>
        <p style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="mono">{p.oemPartNumber ?? "OEM number not verified"}</span>
          <StatusPill status={p.provenance.verificationStatus} />
        </p>
      </header>
      <div className="two-col">
        <div className="list">
          <section className="card row-card">
            <h2 style={{ fontSize: 26 }}>Specifications</h2>
            {p.specs.length === 0 ? <p>No specifications recorded. Values are added only from an authorized source.</p> : (
              <table className="data-table"><tbody>
                {p.specs.map((s) => (
                  <tr key={s.key}><td>{s.key}</td><td><b>{s.value}{s.unit ? ` ${s.unit}` : ""}</b></td><td><StatusPill status={s.provenance.verificationStatus} /></td><td className="muted">{s.provenance.sourceTitle}</td></tr>
                ))}
              </tbody></table>
            )}
          </section>
          <section className="card row-card">
            <h2 style={{ fontSize: 26 }}>Fitment</h2>
            {p.fitments.length === 0 ? <p>No fitment records. Model-year and VIN compatibility are <b>not verified</b>.</p> : (
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th>Vehicle</th><th>Year</th><th>Market</th><th>VIN range</th><th>Note</th><th>Status</th></tr></thead>
                <tbody>
                  {p.fitments.map((f, i) => (
                    <tr key={i}><td>{f.vehicleSlug}</td><td>{f.modelYear ?? "—"}</td><td>{f.market ?? "—"}</td>
                      <td className="mono">{f.vinFrom ? `${f.vinFrom} → ${f.vinTo ?? "…"}` : "—"}</td><td className="muted">{f.notes ?? "—"}</td><td><StatusPill status={f.provenance.verificationStatus} /></td></tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </section>
          <section className="card row-card">
            <h2 style={{ fontSize: 26 }}>Used in</h2>
            {p.assemblies.length === 0 && <p>Not yet mapped to one of the 95 assembly groups.</p>}
            {p.assemblies.map((a) => (
              <p key={`${a.assemblyCode}-${a.diagramRef}`}>
                <Link href={`/vehicles/ferrari-488-gtb?assembly=${a.assemblyCode}`}>{a.assemblyCode} · {a.assemblyName}</Link>
                {" "}— qty {a.quantity ?? "not verified"}{a.diagramRef ? `, callout ${a.diagramRef}` : ""}
              </p>
            ))}
          </section>
        </div>
        <aside className="card detail">
          {p.imageUrl && (
            <div className="product-img detail-img">
              <Image src={p.imageUrl} alt={`${p.name} — photo from the Autovivo store`} fill sizes="(max-width: 1000px) 100vw, 420px" priority />
            </div>
          )}
          <div className="kv" style={{ marginTop: 0 }}>
            <div><small>Revision</small><Known value={p.revision} missing="Not recorded" /></div>
            <div><small>Price</small><Known value={null} missing="On request" /></div>
          </div>
          {p.description && <p className="muted">{p.description}</p>}
          <ProvenanceNote p={p.provenance} />
          <div className="detail-actions">
            <AddPart id={p.id} label={`${p.oemPartNumber ?? "No OEM no."} · ${p.name}`} />
            {p.listingUrl && <a className="btn" href={p.listingUrl} target="_blank" rel="noreferrer">View on Autovivo store ↗</a>}
          </div>
        </aside>
      </div>
    </div>
  );
}
