"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { api, type Assembly, type AssemblyDetail, type VehicleDetail } from "@/lib/api";
import { shortlist, useShortlist } from "@/lib/shortlist";
import { Schematic, SCHEMATIC_REGIONS } from "./Schematic";
import { Known, ProvenanceNote, StatusPill } from "./Status";

const Viewer3D = dynamic(() => import("./Viewer3D"), { ssr: false, loading: () => <div className="viewer-canvas" /> });

interface Props { vehicle: VehicleDetail; assemblies: Assembly[]; initialCode: string | null }

export default function Explorer({ vehicle, assemblies, initialCode }: Props) {
  const [query, setQuery] = useState("");
  const [system, setSystem] = useState("");
  const [code, setCode] = useState<string | null>(initialCode ?? "0001");
  const [exploded, setExploded] = useState(false);
  const [detail, setDetail] = useState<AssemblyDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const q = useDeferredValue(query.trim().toLowerCase());
  const model = vehicle.model3d;
  const source = useMemo(() => (model ? { type: "url" as const, url: model.url } : null), [model]);

  const visible = useMemo(
    () => assemblies.filter((a) => (!system || a.systemSlug === system) && (!q || a.code.includes(q) || a.name.toLowerCase().includes(q))),
    [assemblies, system, q],
  );
  const selected = assemblies.find((a) => a.code === code) ?? null;

  useEffect(() => {
    if (!code) return;
    let live = true;
    api<AssemblyDetail>(`/vehicles/${vehicle.slug}/assemblies/${encodeURIComponent(code)}`)
      .then((d) => { if (live) { setDetail(d); setLoadError(false); } })
      .catch(() => { if (live) setLoadError(true); });
    const url = new URL(window.location.href);
    url.searchParams.set("assembly", code);
    window.history.replaceState(null, "", url);
    return () => { live = false; };
  }, [code, vehicle.slug]);

  return (
    <>
      <div className="explorer">
        <section className="card viewer" aria-labelledby="viewer-h">
          <h2 id="viewer-h" className="sr-only">Vehicle view</h2>
          {model && source ? (
            <>
              <div className="viewer-tag">
                <span className="pill verified">Licensed 3D · {model.licensor}</span>
                {!model.isRealVehicleGeometry && <span className="pill unverified">Stylised — not exact vehicle geometry</span>}
              </div>
              <Viewer3D source={source} bindings={model.bindings} selectedCode={code} exploded={exploded}
                onSelectCode={setCode} label={`3D model of the ${vehicle.make} ${vehicle.model}. Drag to rotate, scroll to zoom.`} />
            </>
          ) : (
            <div className="viewer-canvas">
              <div className="viewer-tag">
                <span className="pill unverified">Illustrative schematic · not OEM geometry</span>
              </div>
              <Schematic className="schematic" selected={code} separated={exploded} onSelect={setCode} />
              <div className="asset-gate" role="note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
                <span><b>Licensed 3D model required.</b> A realistic, rotatable 488 GTB with named parts will appear here once a commercially
                  licensed asset is approved. Until then this original drawing is used for navigation only.</span>
              </div>
            </div>
          )}
          <div className="viewer-foot">
            <div className="segmented" role="group" aria-label="View mode">
              <button type="button" aria-pressed={!exploded} onClick={() => setExploded(false)}>Assembled</button>
              <button type="button" aria-pressed={exploded} onClick={() => setExploded(true)}>{model ? "Exploded" : "Separated"}</button>
            </div>
            <div className="systems" aria-label="Quick select">
              {SCHEMATIC_REGIONS.map((r) => (
                <button key={r.code} type="button" className="chip" aria-pressed={code === r.code} onClick={() => setCode(r.code)}>{r.label}</button>
              ))}
            </div>
          </div>
        </section>

        <DetailPanel slug={vehicle.slug} assembly={selected} detail={detail?.code === code ? detail : null} error={loadError} />
      </div>

      <section className="card catalog" aria-labelledby="list-h">
        <div className="section-head" style={{ marginBottom: 16 }}>
          <div><div className="eyebrow">Assembly index</div><h2 id="list-h" style={{ fontSize: 30, marginTop: 8 }}>Find a group</h2></div>
          <Link className="btn small" href="/catalog">Full catalog search →</Link>
        </div>
        <div className="tools">
          <div className="search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input className="field" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by group name or number…" aria-label="Search assembly groups" />
          </div>
          <select className="field" value={system} onChange={(e) => setSystem(e.target.value)} aria-label="Filter by vehicle system">
            <option value="">All systems</option>
            {vehicle.systems.map((s) => <option key={s.slug} value={s.slug}>{s.name} ({s.assemblyCount})</option>)}
          </select>
          {(query || system) && <button type="button" className="btn" onClick={() => { setQuery(""); setSystem(""); }}>Clear</button>}
        </div>
        <p className="result-count" aria-live="polite">{visible.length} of {assemblies.length} assembly groups</p>
        <div className="groups">
          {visible.map((a) => (
            <button key={a.code} type="button" className="group" aria-pressed={a.code === code}
              onClick={() => { setCode(a.code); if (window.innerWidth < 1000) document.getElementById("detail")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className="gcode">{a.code}</span>
              <span><span className="gname">{a.name}</span><span className="gsys">{a.systemName}{a.partCount ? ` · ${a.partCount} parts` : ""}</span></span>
            </button>
          ))}
          {visible.length === 0 && <div className="empty">No groups match. Try a broader term such as “brake” or “door”.</div>}
        </div>
      </section>
    </>
  );
}

function DetailPanel({ slug, assembly, detail, error }: { slug: string; assembly: Assembly | null; detail: AssemblyDetail | null; error: boolean }) {
  const items = useShortlist();
  if (!assembly) return <aside className="card detail" id="detail"><p className="muted">Select an assembly group.</p></aside>;
  const inList = items.some((x) => x.kind === "assembly" && x.ref === assembly.code);
  const parts = detail?.parts ?? [];
  return (
    <aside className="card detail" id="detail" aria-live="polite" aria-labelledby="detail-h">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <span className="code">Group {assembly.code} · {assembly.systemName}</span>
        <StatusPill status={assembly.provenance.verificationStatus} />
      </div>
      <h3 id="detail-h">{assembly.name}</h3>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        {assembly.summary ?? "Group title from the public 488 GTB (USA) index. It is not a complete list of the parts inside this assembly."}
      </p>
      <div className="kv">
        <div><small>Individual parts</small><Known value={parts.length ? parts.length : null} /></div>
        <div><small>OEM part numbers</small><Known value={parts.some((p) => p.oemPartNumber) ? "See list" : null} /></div>
        <div><small>Model years</small><Known value={null} missing="Not verified" /></div>
        <div><small>VIN fitment</small><Known value={null} missing="Not verified" /></div>
      </div>

      <h4 className="eyebrow" style={{ margin: "4px 0 0", color: "var(--muted)" }}>Parts in this group</h4>
      {error && <p className="err-box" role="alert" style={{ marginTop: 10 }}>Part list could not be loaded. Try again shortly.</p>}
      {!error && parts.length === 0 && (
        <div className="empty-parts">No individual parts are loaded for this group yet.<br />They need an authorized Ferrari parts source.</div>
      )}
      {parts.length > 0 && (
        <table className="parts-table">
          <thead><tr><th>Ref</th><th>Part</th><th>Qty</th><th>Status</th></tr></thead>
          <tbody>
            {parts.map((p) => (
              <tr key={`${p.id}-${p.diagramRef}`}>
                <td className="mono">{p.diagramRef ?? "—"}</td>
                <td><Link href={`/parts/${p.id}`}>{p.name}</Link><div className="mono muted" style={{ fontSize: 11 }}>{p.oemPartNumber ?? "OEM no. not verified"}</div></td>
                <td>{p.quantity ?? "—"}</td>
                <td><StatusPill status={p.provenance.verificationStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ProvenanceNote p={assembly.provenance} />
      <div className="detail-actions">
        <button type="button" className={inList ? "btn" : "btn primary"}
          onClick={() => inList ? shortlist.remove({ kind: "assembly", ref: assembly.code }) : shortlist.add({ kind: "assembly", ref: assembly.code, label: `${assembly.code} · ${assembly.name}` })}>
          {inList ? "✓ In quote list — remove" : "Add group to quote list"}
        </button>
        <Link className="btn" href={`/catalog?assembly=${assembly.code}`}>Search within this group</Link>
      </div>
      <p className="help" style={{ marginTop: 12 }}>Vehicle: {slug} · Fitment must be confirmed against your VIN before ordering.</p>
    </aside>
  );
}
