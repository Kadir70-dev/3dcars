"use client";
import { LocalDate, T } from "@/lib/i18n";
import { statusLabel, type Provenance, type Verification } from "@/lib/api";

export function StatusPill({ status }: { status: Verification }) {
  return <span className={`pill ${status}`}><T>{statusLabel[status] ?? status}</T></span>;
}

export function ProvenanceNote({ p, compact }: { p: Provenance; compact?: boolean }) {
  return (
    <div className="prov">
      <div>
        <T>Source:</T>{" "}
        {p.sourceUrl ? <a href={p.sourceUrl} target="_blank" rel="noreferrer"><T>{p.sourceTitle}</T> ↗</a> : <T>{p.sourceTitle}</T>}
      </div>
      {!compact && p.sourceRef && <div><T>Reference:</T> <T>{p.sourceRef}</T></div>}
      <div><T>Checked:</T> <LocalDate d={p.checkedOn} /></div>
      {!compact && p.scopeNote && <div><T>Scope:</T> <T>{p.scopeNote}</T></div>}
    </div>
  );
}

/** Value cell that makes missing data explicit instead of blank. */
export function Known({ value, missing = "Source required" }: { value: string | number | null | undefined; missing?: string }) {
  return value === null || value === undefined || value === ""
    ? <b className="unknown"><T>{missing}</T></b>
    : <b><T>{String(value)}</T></b>;
}
