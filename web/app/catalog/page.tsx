import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { api, VEHICLE, type Assembly, type PartSummary, type VehicleDetail } from "@/lib/api";
import { StatusPill } from "@/components/Status";
import { AddPart } from "@/components/AddPart";
import { ApiDown } from "@/components/ApiDown";

export const metadata: Metadata = {
  title: "Catalog search — Ferrari 488 GTB",
  description: "Search Ferrari 488 GTB assembly groups and parts by name, number, vehicle system and assembly.",
  alternates: { canonical: "/catalog" },
};

type SP = { searchParams: Promise<{ q?: string; system?: string; assembly?: string }> };

export default async function Catalog({ searchParams }: SP) {
  const sp = await searchParams;
  const q = (sp.q ?? "").slice(0, 100), system = sp.system ?? "", assembly = sp.assembly ?? "";
  const qs = new URLSearchParams({ q, system, assembly }).toString();
  let v: VehicleDetail, res: { assemblies: Assembly[]; parts: PartSummary[] }, all: Assembly[];
  try {
    [v, res, { assemblies: all }] = await Promise.all([
      api<VehicleDetail>(`/vehicles/${VEHICLE}`),
      api<{ assemblies: Assembly[]; parts: PartSummary[] }>(`/vehicles/${VEHICLE}/search?${qs}`),
      api<{ assemblies: Assembly[] }>(`/vehicles/${VEHICLE}/assemblies`),
    ]);
  } catch {
    return <ApiDown />;
  }
  const filtered = Boolean(q || system || assembly);
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow">Ferrari 488 GTB · catalog</div>
        <h1>Search <em>parts &amp; assemblies.</em></h1>
        <p>Search Autovivo’s listed 488 parts and the 95 assembly groups by name, part number or group number. Prices on request. Filter by vehicle system or assembly. Results work without JavaScript and can be shared by URL.</p>
      </header>

      <form className="card catalog" method="get" role="search" style={{ marginTop: 0 }}>
        <div className="tools catalog-tools">
          <label className="search-wrap">
            <span className="sr-only">Search term</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input className="field" type="search" name="q" defaultValue={q} placeholder="Part name, OEM number, assembly…" />
          </label>
          <label><span className="sr-only">Vehicle system</span>
            <select className="field" name="system" defaultValue={system}>
              <option value="">All systems</option>
              {v.systems.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
            </select>
          </label>
          <label><span className="sr-only">Assembly</span>
            <select className="field" name="assembly" defaultValue={assembly}>
              <option value="">All assemblies</option>
              {all.map((a) => <option key={a.code} value={a.code}>{a.code} · {a.name}</option>)}
            </select>
          </label>
          <button className="btn primary" type="submit">Search</button>
        </div>
        {filtered && <p style={{ margin: "12px 0 0" }}><Link href="/catalog" className="muted">Clear filters</Link></p>}
      </form>

      <section className="section" style={{ paddingTop: 40 }} aria-labelledby="parts-h">
        <div className="section-head" style={{ marginBottom: 16 }}>
          <h2 id="parts-h" style={{ fontSize: 30 }}>Individual parts <span className="muted">({res.parts.length})</span></h2>
        </div>
        {res.parts.length === 0 ? (
          <div className="empty">
            {v.counts.parts === 0
              ? "No individual parts are in the catalogue yet. Part names and OEM numbers will appear once an authorized Ferrari parts source is connected."
              : "No parts match these filters."}
          </div>
        ) : (
          <div className="product-grid">
            {res.parts.map((p) => (
              <article className="card product" key={`${p.id}-${p.assemblyCode}-${p.diagramRef}`}>
                <Link href={`/parts/${p.id}`} className="product-img" tabIndex={-1} aria-hidden="true">
                  {p.imageUrl
                    ? <Image src={p.imageUrl} alt="" fill sizes="(max-width: 720px) 100vw, 300px" />
                    : <span className="muted">No photo</span>}
                </Link>
                <div className="product-body">
                  <div className="product-top">
                    <span className="mono">{p.oemPartNumber ?? "No part no."}</span>
                    <StatusPill status={p.provenance.verificationStatus} />
                  </div>
                  <h3><Link href={`/parts/${p.id}`}>{p.name}</Link></h3>
                  <p className="muted">{p.assemblyCode ? `${p.assemblyCode} · ${p.assemblyName}` : "Assembly group not mapped yet"}</p>
                  <div className="product-actions">
                    <AddPart id={p.id} label={`${p.oemPartNumber ?? "No part no."} · ${p.name}`} />
                    {p.listingUrl && <a className="btn small" href={p.listingUrl} target="_blank" rel="noreferrer">Autovivo store ↗</a>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section" style={{ paddingTop: 48 }} aria-labelledby="asm-h">
        <div className="section-head" style={{ marginBottom: 16 }}>
          <h2 id="asm-h" style={{ fontSize: 30 }}>Assembly groups <span className="muted">({res.assemblies.length})</span></h2>
          <p>Group titles from the public 488 GTB (USA) index. Open one in the explorer to see its details.</p>
        </div>
        <div className="groups">
          {res.assemblies.map((a) => (
            <Link key={a.code} className="group" href={`/vehicles/${VEHICLE}?assembly=${a.code}#detail`}>
              <span className="gcode">{a.code}</span>
              <span><span className="gname">{a.name}</span><span className="gsys">{a.systemName}</span></span>
            </Link>
          ))}
          {res.assemblies.length === 0 && <div className="empty">No assembly groups match.</div>}
        </div>
      </section>
    </div>
  );
}
