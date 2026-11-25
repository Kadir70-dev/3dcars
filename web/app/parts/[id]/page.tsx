import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { api, ApiError, type PartDetail, type StoreResponse } from "@/lib/api";
import { Known, ProvenanceNote, StatusPill } from "@/components/Status";
import { AddPart } from "@/components/AddPart";
import { ApiDown } from "@/components/ApiDown";
import PartGallery from "@/components/PartGallery";
import { T } from "@/lib/i18n";

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
  if (!p) return {};
  const title = `${p.name}${p.oemPartNumber ? ` (${p.oemPartNumber})` : ""}`;
  const description = p.metaDescription || p.description || `${p.name} — genuine part from Autovivo Spare Parts LLC. Price on request.`;
  return {
    title, description, alternates: { canonical: `/parts/${p.id}` },
    keywords: p.tags,
    openGraph: { title, description, type: "website", ...(p.imageUrl ? { images: [{ url: p.imageUrl, alt: p.name }] } : {}) },
  };
}

export default async function PartPage({ params }: P) {
  const p = await load((await params).id);
  if (!p) return <ApiDown />;
  let related: StoreResponse["result"]["parts"] = [];
  try {
    const r = await api<StoreResponse>(`/store-parts?${new URLSearchParams({ brand: p.brand ?? "", q: "", model: p.fitModels?.[0] ?? "", page: "1" })}`);
    related = r.result.parts.filter((x) => x.id !== p.id).slice(0, 4);
  } catch { /* related parts are optional */ }
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow"><Link href="/catalog"><T>Catalog</T></Link> / <T>Part</T></div>
        <h1>{p.name}</h1>
        <p style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="mono">{p.oemPartNumber ?? <T>OEM number not verified</T>}</span>
          <StatusPill status={p.provenance.verificationStatus} />
        </p>
      </header>
      <div className="two-col">
        <div className="list">
          <section className="card row-card">
            <h2 style={{ fontSize: 26 }}><T>Specifications</T></h2>
            {p.specs.length === 0 ? <p><T>No specifications recorded. Values are added only from an authorized source.</T></p> : (
              <table className="data-table"><tbody>
                {p.specs.map((s) => (
                  <tr key={s.key}><td><T>{s.key}</T></td><td><b>{s.value}{s.unit ? ` ${s.unit}` : ""}</b></td><td><StatusPill status={s.provenance.verificationStatus} /></td><td className="muted"><T>{s.provenance.sourceTitle}</T></td></tr>
                ))}
              </tbody></table>
            )}
          </section>
          <section className="card row-card">
            <h2 style={{ fontSize: 26 }}><T>Fitment</T></h2>
            {p.fitments.length === 0 ? <p><T>{"No fitment records. Model-year and VIN compatibility are <b>not verified</b>."}</T></p> : (
              <div className="table-wrap"><table className="data-table">
                <thead><tr><th><T>Vehicle</T></th><th><T>Year</T></th><th><T>Market</T></th><th><T>VIN range</T></th><th><T>Note</T></th><th><T>Status</T></th></tr></thead>
                <tbody>
                  {p.fitments.map((f, i) => (
                    <tr key={i}><td>{f.vehicleSlug}</td><td>{f.modelYear ?? "—"}</td><td>{f.market ?? "—"}</td>
                      <td className="mono">{f.vinFrom ? `${f.vinFrom} → ${f.vinTo ?? "…"}` : "—"}</td><td className="muted">{f.notes ? <T>{f.notes}</T> : "—"}</td><td><StatusPill status={f.provenance.verificationStatus} /></td></tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </section>
          {p.fitModels && p.fitModels.length > 0 && (
            <section className="card row-card">
              <h2 style={{ fontSize: 26 }}><T>Fits (as listed by the store)</T></h2>
              <p className="muted">{p.brand ? `${p.brand} · ` : ""}<T>Copied from the Autovivo listing; not checked against the manufacturer’s catalogue.</T></p>
              <ul className="fit-list">{p.fitModels.map((f) => <li key={f}>{f}</li>)}</ul>
            </section>
          )}
          <section className="card row-card">
            <h2 style={{ fontSize: 26 }}><T>Used in</T></h2>
            {p.assemblies.length === 0 && <p><T>Not yet mapped to one of the 95 assembly groups.</T></p>}
            {p.assemblies.map((a) => (
              <p key={`${a.assemblyCode}-${a.diagramRef}`}>
                <Link href={`/vehicles/ferrari-488-gtb?assembly=${a.assemblyCode}`}>{a.assemblyCode} · <T>{a.assemblyName ?? ""}</T></Link>
                {" "}— <T>qty</T> {a.quantity ?? <T>not verified</T>}{a.diagramRef ? <>, <T>callout</T> {a.diagramRef}</> : ""}
              </p>
            ))}
          </section>
        </div>
        <aside className="card detail">
          {p.imageUrl && <PartGallery images={p.images?.length ? p.images : [p.imageUrl]} name={p.name} />}
          {p.categories && p.categories.length > 0 && <p className="muted">{p.categories.join(" · ")}</p>}
          <div className="kv" style={{ marginTop: 0 }}>
            <div><small><T>Revision</T></small><Known value={p.revision} missing="Not recorded" /></div>
            <div><small><T>Price</T></small><Known value={null} missing="On request" /></div>
          </div>
          {p.description && <p className="muted">{p.description}</p>}
          <ProvenanceNote p={p.provenance} />
          <div className="detail-actions">
            <AddPart id={p.id} label={`${p.oemPartNumber ?? "No OEM no."} · ${p.name}`} />
            {p.listingUrl && <a className="btn" href={p.listingUrl} target="_blank" rel="noreferrer"><T>View on Autovivo store ↗</T></a>}
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="related" aria-labelledby="rel-h">
          <div className="eyebrow"><T>Related spare parts</T></div>
          <h2 id="rel-h" style={{ margin: "18px 0 28px" }}><T>{"You may also <em>need.</em>"}</T></h2>
          <div className="elite-grid">
            {related.map((r) => (
              <article className="product elite" key={r.id}>
                <Link href={`/parts/${r.id}`} className="product-img" tabIndex={-1} aria-hidden="true">
                  <span className="product-float">{r.imageUrl ? <Image src={r.imageUrl} alt="" fill sizes="(max-width: 720px) 50vw, 300px" /> : null}</span>
                </Link>
                <div className="product-body">
                  <div className="product-top"><span className="mono">{r.oemPartNumber ?? <T>No part no.</T>}</span></div>
                  <h3><Link href={`/parts/${r.id}`} title={r.name}>{r.name}</Link></h3>
                  <div className="product-meta"><b><T>Price on request</T></b><span className="stock"><T>Stock on enquiry</T></span></div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
