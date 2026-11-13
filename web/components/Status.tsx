import { formatDate, statusLabel, type Provenance, type Verification } from "@/lib/api";

export function StatusPill({ status }: { status: Verification }) {
  return <span className={`pill ${status}`}>{statusLabel[status] ?? status}</span>;
}

export function ProvenanceNote({ p, compact }: { p: Provenance; compact?: boolean }) {
  return (
    <div className="prov">
      <div>
        Source:{" "}
        {p.sourceUrl ? <a href={p.sourceUrl} target="_blank" rel="noreferrer">{p.sourceTitle} ↗</a> : p.sourceTitle}
      </div>
      {!compact && p.sourceRef && <div>Reference: {p.sourceRef}</div>}
      <div>Checked: {formatDate(p.checkedOn)}</div>
      {!compact && p.scopeNote && <div>Scope: {p.scopeNote}</div>}
    </div>
  );
}

/** Value cell that makes missing data explicit instead of blank. */
export function Known({ value, missing = "Source required" }: { value: string | number | null | undefined; missing?: string }) {
  return value === null || value === undefined || value === ""
    ? <b className="unknown">{missing}</b>
    : <b>{value}</b>;
}
