"use client";
import { useEffect, useRef, useState } from "react";

export interface Field {
  name: string; label: string; kind: "text" | "longtext" | "int" | "float" | "bool" | "date" | "url" | "enum" | "ref";
  required: boolean; readOnly?: boolean; options?: string[]; refResource?: string; pattern?: string; help?: string;
}

interface Props {
  resource: string; label: string; fields: Field[];
  row: Record<string, unknown> | null;
  onClose: (savedId?: number) => void;
}

type Opt = { id: number; label: string };

function initial(f: Field, row: Record<string, unknown> | null): string {
  const v = row?.[f.name];
  if (v === null || v === undefined) return f.kind === "enum" && !row ? f.options?.[0] ?? "" : "";
  if (f.kind === "date" && typeof v === "string") return v.slice(0, 10);
  return String(v);
}

export function RecordForm({ resource, label, fields, row, onClose }: Props) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initial(f, row)])));
  const [opts, setOpts] = useState<Record<string, Opt[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { dlg.current?.showModal(); }, []);
  useEffect(() => {
    const refs = [...new Set(fields.filter((f) => f.kind === "ref" && f.refResource).map((f) => f.refResource!))];
    refs.forEach(async (r) => {
      const res = await fetch(`/api/v1/admin/options/${r}`);
      if (res.ok) { const b = await res.json(); setOpts((o) => ({ ...o, [r]: b.options })); }
    });
  }, [fields]);

  function payload() {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.readOnly) continue;
      const v = values[f.name];
      if (v === "") { out[f.name] = null; continue; }
      if (f.kind === "int" || f.kind === "ref" || f.kind === "float") out[f.name] = Number(v);
      else if (f.kind === "bool") out[f.name] = v === "true";
      else out[f.name] = v;
    }
    return out;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErrors({}); setFailure(null);
    const res = await fetch(`/api/v1/admin/r/${resource}${row ? `/${row.id}` : ""}`, {
      method: row ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) { dlg.current?.close(); onClose(body.id); return; }
    if (body.fields) setErrors(body.fields);
    setFailure(body.error ?? "Save failed");
  }

  const set = (n: string, v: string) => setValues((s) => ({ ...s, [n]: v }));

  return (
    <dialog ref={dlg} onClose={() => onClose()} aria-labelledby="rf-h">
      <form className="form" onSubmit={save}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 id="rf-h" style={{ fontSize: 26 }}>{row ? `Edit ${label} #${row.id}` : `New ${label}`}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={() => { dlg.current?.close(); }}>✕</button>
        </div>
        <div className="admin-grid">
          {fields.map((f) => {
            const id = `f-${f.name}`;
            const common = { id, name: f.name, className: "field", value: values[f.name], disabled: f.readOnly, "aria-invalid": !!errors[f.name],
              "aria-describedby": f.help || errors[f.name] ? `${id}-h` : undefined, required: f.required };
            let input: React.ReactNode;
            if (f.kind === "longtext") input = <textarea {...common} onChange={(e) => set(f.name, e.target.value)} />;
            else if (f.kind === "enum") input = (
              <select {...common} onChange={(e) => set(f.name, e.target.value)}>
                {!f.required && <option value="">—</option>}
                {f.options!.map((o) => <option key={o} value={o}>{o.replaceAll("_", " ")}</option>)}
              </select>);
            else if (f.kind === "bool") input = (
              <select {...common} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">Not established</option><option value="true">Yes</option><option value="false">No</option>
              </select>);
            else if (f.kind === "ref") input = (
              <select {...common} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">{f.required ? "Select…" : "None"}</option>
                {(opts[f.refResource!] ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>);
            else input = (
              <input {...common} onChange={(e) => set(f.name, e.target.value)}
                type={f.kind === "int" || f.kind === "float" ? "number" : f.kind === "date" ? "date" : f.kind === "url" ? "url" : "text"}
                step={f.kind === "float" ? "any" : undefined} />);
            return (
              <label key={f.name} htmlFor={id} style={f.kind === "longtext" ? { gridColumn: "1 / -1" } : undefined}>
                <span>{f.label}{f.required && " *"}</span>
                {input}
                {(errors[f.name] || f.help) && <span id={`${id}-h`} className={errors[f.name] ? "err" : "help"}>{errors[f.name] ?? f.help}</span>}
              </label>
            );
          })}
        </div>
        {failure && <p className="err-box" role="alert">{failure}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" className="btn" onClick={() => dlg.current?.close()}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </dialog>
  );
}
