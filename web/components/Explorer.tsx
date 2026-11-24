"use client";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, type Assembly, type AssemblyDetail, type VehicleDetail } from "@/lib/api";
import { shortlist, useShortlist } from "@/lib/shortlist";
import { SCHEMATIC_REGIONS } from "./Schematic";
import { Known, ProvenanceNote, StatusPill } from "./Status";
import type { Selection } from "@/lib/explode";
import { L, T, useT } from "@/lib/i18n";

interface Props { vehicle: VehicleDetail; assemblies: Assembly[]; initialCode: string | null; hero?: ReactNode; /** A real-photo stage; replaces the 3D car switcher when given. */ stage?: ReactNode }

/** Groups shown before "Show all", so the page does not open on a wall of 95 tiles. */
const GROUP_PREVIEW = 16;

export default function Explorer({ vehicle, assemblies, initialCode, hero, stage }: Props) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [system, setSystem] = useState("");
  const [sel, setSel] = useState<Selection>({ code: initialCode ?? "0001", partId: null });
  const code = sel.code;
  const setCode = useCallback((c: string | null) => setSel({ code: c, partId: null }), []);
  const fromModel = useRef(false);
  const groupsRef = useRef<HTMLDivElement>(null);
  const [detail, setDetail] = useState<AssemblyDetail | null>(null);
  const [loadError, setLoadError] = useState(false);
  const q = useDeferredValue(query.trim().toLowerCase());
  const model = null;
  const boundParts = useMemo(() => new Set<number>(), []);

  const visible = useMemo(
    () => assemblies.filter((a) => (!system || a.systemSlug === system) && (!q || a.code.includes(q) || a.name.toLowerCase().includes(q))),
    [assemblies, system, q],
  );
  const selected = assemblies.find((a) => a.code === code) ?? null;
  const filtering = Boolean(q || system);
  const shown = filtering || showAll ? visible : visible.slice(0, Math.max(GROUP_PREVIEW, visible.findIndex((a) => a.code === code) + 1));

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

  // A pick in the 3D model scrolls the matching group into view in the list.
  useEffect(() => {
    if (!fromModel.current) return;
    fromModel.current = false;
    groupsRef.current?.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);
  const selectedPart = detail?.code === code ? detail?.parts.find((p) => p.id === sel.partId) : undefined;
  const selectionLabel = selected ? (selectedPart ? `${selectedPart.name} (${selected.code})` : `${selected.code} · ${selected.name}`) : null;

  return (
    <>
      {!model && (
        // Full-screen photo stage: just the cars, tabs on top, Assemble / Disassemble at the bottom.
        <L as="section" className="explorer-stage" aria-label="3D cars with parts markers">{hero}{stage}</L>
      )}
      <div className="wrap explorer-below">
      {!model && (
        <L className="systems explorer-chips" aria-label="Jump to a group">
          {SCHEMATIC_REGIONS.map((r) => (
            <button key={r.code} type="button" className="chip" aria-pressed={code === r.code} onClick={() => setCode(r.code)}><T>{r.label}</T></button>
          ))}
        </L>
      )}
      <div className={model ? "explorer" : "explorer explorer-solo"}>

        <DetailPanel slug={vehicle.slug} assembly={selected} detail={detail?.code === code ? detail : null} error={loadError}
          boundParts={boundParts} selectedPartId={sel.partId} onSelectPart={(id) => code && setSel({ code, partId: id })} />
      </div>

      <section className="card catalog" aria-labelledby="list-h">
        <div className="section-head" style={{ marginBottom: 16 }}>
          <div><div className="eyebrow"><T>Assembly index</T></div><h2 id="list-h" style={{ fontSize: 30, marginTop: 8 }}><T>Find a group</T></h2></div>
          <Link className="btn small" href="/catalog"><T>Full catalog search →</T></Link>
        </div>
        <div className="tools">
          <div className="search-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input className="field" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Search by group name or number…")} aria-label={t("Search assembly groups")} />
          </div>
          <select className="field" value={system} onChange={(e) => setSystem(e.target.value)} aria-label={t("Filter by vehicle system")}>
            <option value=""><T>All systems</T></option>
            {vehicle.systems.map((s) => <option key={s.slug} value={s.slug}>{t(s.name)} ({s.assemblyCount})</option>)}
          </select>
          {(query || system) && <button type="button" className="btn" onClick={() => { setQuery(""); setSystem(""); }}><T>Clear</T></button>}
        </div>
        <p className="result-count" aria-live="polite">{filtering || showAll || shown.length >= visible.length ? t("{a} of {b} assembly groups", { a: visible.length, b: assemblies.length }) : t("Showing {a} of {b} assembly groups", { a: shown.length, b: assemblies.length })}</p>
        <div className="groups" ref={groupsRef}>
          {shown.map((a) => (
            <button key={a.code} type="button" className="group" aria-pressed={a.code === code}
              onClick={() => { setCode(a.code); if (window.innerWidth < 1000) document.getElementById("detail")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className="gcode">{a.code}</span>
              <span><span className="gname"><T>{a.name}</T></span><span className="gsys"><T>{a.systemName ?? ""}</T>{a.partCount ? ` · ${t("{n} parts", { n: a.partCount })}` : ""}</span></span>
            </button>
          ))}
          {visible.length === 0 && <div className="empty"><T>No groups match. Try a broader term such as “brake” or “door”.</T></div>}
        </div>
        {shown.length < visible.length && (
          <div className="groups-more">
            <button type="button" className="btn" onClick={() => setShowAll(true)}><T v={{ n: visible.length }}>{"Show all {n} groups"}</T></button>
          </div>
        )}
        {showAll && !filtering && visible.length > GROUP_PREVIEW && (
          <div className="groups-more"><button type="button" className="btn small" onClick={() => setShowAll(false)}><T>Show fewer</T></button></div>
        )}
      </section>
      </div>
    </>
  );
}

interface DetailProps {
  slug: string; assembly: Assembly | null; detail: AssemblyDetail | null; error: boolean;
  boundParts: Set<number>; selectedPartId: number | null; onSelectPart: (id: number | null) => void;
}

function DetailPanel({ slug, assembly, detail, error, boundParts, selectedPartId, onSelectPart }: DetailProps) {
  const items = useShortlist();
  const t = useT();
  if (!assembly) return <aside className="card detail" id="detail"><p className="muted"><T>Select an assembly group.</T></p></aside>;
  const inList = items.some((x) => x.kind === "assembly" && x.ref === assembly.code);
  const parts = detail?.parts ?? [];
  return (
    <aside className="card detail" id="detail" aria-live="polite" aria-labelledby="detail-h">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <span className="code"><T>Group</T> {assembly.code} · <T>{assembly.systemName ?? ""}</T></span>
        <StatusPill status={assembly.provenance.verificationStatus} />
      </div>
      <h3 id="detail-h"><T>{assembly.name}</T></h3>
      <p className="muted" style={{ margin: 0, fontSize: 14 }}>
        <T>{assembly.summary ?? "Group title from the public 488 GTB (USA) index. It is not a complete list of the parts inside this assembly."}</T>
      </p>
      <div className="kv">
        <div><small><T>Individual parts</T></small><Known value={parts.length ? parts.length : null} /></div>
        <div><small><T>OEM part numbers</T></small><Known value={parts.some((p) => p.oemPartNumber) ? "See list" : null} /></div>
        <div><small><T>Model years</T></small><Known value={null} missing="Not verified" /></div>
        <div><small><T>VIN fitment</T></small><Known value={null} missing="Not verified" /></div>
      </div>

      <h4 className="eyebrow" style={{ margin: "4px 0 0", color: "var(--muted)" }}><T>Parts in this group</T></h4>
      {error && <p className="err-box" role="alert" style={{ marginTop: 10 }}><T>Part list could not be loaded. Try again shortly.</T></p>}
      {!error && parts.length === 0 && (
        <div className="empty-parts"><T>{"No individual parts are loaded for this group yet.<br/>They need an authorized Ferrari parts source."}</T></div>
      )}
      {parts.length > 0 && (
        <table className="parts-table">
          <thead><tr><th><T>Ref</T></th><th><T>Part</T></th><th><T>Qty</T></th><th><T>Status</T></th><th>3D</th></tr></thead>
          <tbody>
            {parts.map((p) => (
              <tr key={`${p.id}-${p.diagramRef}`} aria-selected={selectedPartId === p.id} className={selectedPartId === p.id ? "is-selected" : undefined}>
                <td className="mono">{p.diagramRef ?? "—"}</td>
                <td><Link href={`/parts/${p.id}`}>{p.name}</Link><div className="mono muted" style={{ fontSize: 11 }}>{p.oemPartNumber ?? t("OEM no. not verified")}</div></td>
                <td>{p.quantity ?? "—"}</td>
                <td><StatusPill status={p.provenance.verificationStatus} /></td>
                <td>{boundParts.has(p.id)
                  ? <button type="button" className="btn small" aria-pressed={selectedPartId === p.id}
                      onClick={() => onSelectPart(selectedPartId === p.id ? null : p.id)}><T>{selectedPartId === p.id ? "Shown" : "Show"}</T></button>
                  : <span className="muted" title={t("No mesh bound to this part yet")}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <ProvenanceNote p={assembly.provenance} />
      <div className="detail-actions">
        <button type="button" className={inList ? "btn" : "btn primary"}
          onClick={() => inList ? shortlist.remove({ kind: "assembly", ref: assembly.code }) : shortlist.add({ kind: "assembly", ref: assembly.code, label: `${assembly.code} · ${assembly.name}` })}>
          <T>{inList ? "✓ In enquiry list — remove" : "Enquire about this group"}</T>
        </button>
        <Link className="btn" href={`/catalog?assembly=${assembly.code}`}><T>Search within this group</T></Link>
        <Link className="btn" href="/quote#vin" onClick={() => shortlist.add({ kind: "assembly", ref: assembly.code, label: `${assembly.code} · ${assembly.name}` })}><T>Confirm fitment with my VIN</T></Link>
      </div>
      <p className="help" style={{ marginTop: 12 }}><T>Vehicle:</T> {slug} · <T>Fitment must be confirmed against your VIN before ordering.</T></p>
    </aside>
  );
}
