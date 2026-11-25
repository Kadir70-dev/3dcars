import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { api, VEHICLE, type Assembly, type PartSummary, type VehicleDetail } from "@/lib/api";
import { StatusPill } from "@/components/Status";
import { AddPart } from "@/components/AddPart";
import { ApiDown } from "@/components/ApiDown";
import TiltGrid from "@/components/TiltGrid";
import { L, T } from "@/lib/i18n";

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
        <div className="eyebrow"><T>Ferrari 488 GTB · catalog</T></div>
        <h1><T>{"Search <em>parts & assemblies.</em>"}</T></h1>
        <p><T>Search Autovivo’s listed 488 parts and the 95 assembly groups by name, part number or group number. Prices on request. Filter by vehicle system or assembly. Results work without JavaScript and can be shared by URL.</T></p>
      </header>

      <form className="card catalog" method="get" role="search" style={{ marginTop: 0 }}>
        <div className="tools catalog-tools">
          <label className="search-wrap">
            <span className="sr-only"><T>Search term</T></span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <L as="input" className="field" type="search" name="q" defaultValue={q} placeholder="Part name, OEM number, assembly…" />
          </label>
          <label><span className="sr-only"><T>Vehicle system</T></span>
            <select className="field" name="system" defaultValue={system}>
              <option value=""><T>All systems</T></option>
              {v.systems.map((s) => <option key={s.slug} value={s.slug}><T>{s.name}</T></option>)}
            </select>
          </label>
          <label><span className="sr-only"><T>Assembly</T></span>
            <select className="field" name="assembly" defaultValue={assembly}>
              <option value=""><T>All assemblies</T></option>
              {all.map((a) => <option key={a.code} value={a.code}>{a.code} · <T>{a.name}</T></option>)}
            </select>
          </label>
          <button className="btn primary" type="submit"><T>Search</T></button>
        </div>
        {filtered && <p style={{ margin: "12px 0 0" }}><Link href="/catalog" className="muted"><T>Clear filters</T></Link></p>}
      </form>

      <section className="section" style={{ paddingTop: 40 }} aria-labelledby="parts-h">
        <div className="section-head" style={{ marginBottom: 16 }}>
          <h2 id="parts-h" style={{ fontSize: 30 }}><T>Individual parts</T> <span className="muted">({res.parts.length})</span></h2>
        </div>
        {res.parts.length === 0 ? (
          <div className="empty">
            <T>{v.counts.parts === 0
              ? "No individual parts are in the catalogue yet. Part names and OEM numbers will appear once an authorized Ferrari parts source is connected."
              : "No parts match these filters."}</T>
          </div>
        ) : (
          <TiltGrid className="product-grid elite-grid">
            {res.parts.map((p) => (
              <article className="product elite" key={`${p.id}-${p.assemblyCode}-${p.diagramRef}`}>
                <Link href={`/parts/${p.id}`} className="product-img" tabIndex={-1} aria-hidden="true">
                  <span className="product-float">
                    {p.imageUrl
                      ? <Image src={p.imageUrl} alt="" fill sizes="(max-width: 720px) 100vw, 300px" />
                      : <span className="muted"><T>No photo</T></span>}
                  </span>
                </Link>
                <div className="product-body">
                  <div className="product-top">
                    <span className="mono">{p.oemPartNumber ?? <T>No part no.</T>}</span>
                    <StatusPill status={p.provenance.verificationStatus} />
                  </div>
                  <h3><Link href={`/parts/${p.id}`}>{p.name}</Link></h3>
                  <p className="muted">{p.assemblyCode ? <>{p.assemblyCode} · <T>{p.assemblyName ?? ""}</T></> : <T>Assembly group not mapped yet</T>}</p>
                  <div className="product-actions">
                    <AddPart compact id={p.id} label={`${p.oemPartNumber ?? "No part no."} · ${p.name}`} />
                    {p.listingUrl && <a className="btn small" href={p.listingUrl} target="_blank" rel="noreferrer"><T>Autovivo store ↗</T></a>}
                  </div>
                </div>
              </article>
            ))}
          </TiltGrid>
        )}
      </section>

      <section className="section" style={{ paddingTop: 48 }} aria-labelledby="asm-h">
        <div className="section-head" style={{ marginBottom: 16 }}>
          <h2 id="asm-h" style={{ fontSize: 30 }}><T>Assembly groups</T> <span className="muted">({res.assemblies.length})</span></h2>
          <p><T>Group titles from the public 488 GTB (USA) index. Open one in the explorer to see its details.</T></p>
        </div>
        <div className="groups">
          {res.assemblies.map((a) => (
            <Link key={a.code} className="group" href={`/vehicles/${VEHICLE}?assembly=${a.code}#detail`}>
              <span className="gcode">{a.code}</span>
              <span><span className="gname"><T>{a.name}</T></span><span className="gsys"><T>{a.systemName ?? ""}</T></span></span>
            </Link>
          ))}
          {res.assemblies.length === 0 && <div className="empty"><T>No assembly groups match.</T></div>}
        </div>
      </section>
    </div>
  );
}
