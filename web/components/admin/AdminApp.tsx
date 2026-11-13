"use client";
import { useCallback, useEffect, useState } from "react";
import { RecordForm, type Field } from "./RecordForm";

interface Resource { name: string; label: string; fields: Field[]; noCreate?: boolean; noDelete?: boolean }
type Row = Record<string, unknown> & { id: number };

async function call<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch("/api/v1/admin" + path, {
    credentials: "same-origin",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const body = res.status === 204 ? ({} as T) : await res.json().catch(() => ({} as T));
  return { status: res.status, body };
}

export default function AdminApp() {
  const [me, setMe] = useState<{ email: string } | null | undefined>(undefined);
  const [resources, setResources] = useState<Resource[]>([]);
  const [active, setActive] = useState<string>("sources");

  const refreshMe = useCallback(async () => {
    const { status, body } = await call<{ email: string }>("/me");
    setMe(status === 200 ? body : null);
    if (status === 200) setResources((await call<{ resources: Resource[] }>("/resources")).body.resources);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial session check
  useEffect(() => { void refreshMe(); }, [refreshMe]);

  if (me === undefined) return <p className="muted" role="status">Checking session…</p>;
  if (me === null) return <Login onDone={refreshMe} />;
  const res = resources.find((r) => r.name === active);
  return (
    <div className="admin">
      <nav className="card admin-nav" aria-label="Admin sections">
        {resources.map((r) => (
          <button key={r.name} type="button" aria-current={r.name === active} onClick={() => setActive(r.name)}>{r.label}</button>
        ))}
        <hr style={{ border: 0, borderTop: "1px solid var(--line)", width: "100%" }} />
        <span className="help" style={{ padding: "4px 12px" }}>{me.email}</span>
        <button type="button" onClick={async () => { await fetch("/api/v1/admin/logout", { method: "POST" }); setMe(null); }}>Sign out</button>
      </nav>
      {res && <ResourceTable key={res.name} res={res} />}
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form className="card form" style={{ maxWidth: 420 }} onSubmit={async (e) => {
      e.preventDefault();
      const f = new FormData(e.currentTarget);
      setBusy(true); setErr(null);
      const { status, body } = await call<{ error?: string }>("/login", { method: "POST", body: JSON.stringify({ email: f.get("email"), password: f.get("password") }) });
      setBusy(false);
      if (status === 200) onDone(); else setErr(body.error ?? "Sign-in failed");
    }}>
      <h2 style={{ fontSize: 28 }}>Admin sign in</h2>
      <label>Email<input className="field" name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input className="field" name="password" type="password" autoComplete="current-password" required /></label>
      {err && <p className="err-box" role="alert">{err}</p>}
      <button className="btn primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="help">Accounts are created on the server with <code>atlas-api create-admin</code>.</p>
    </form>
  );
}

function display(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  const s = String(v);
  return s.length > 70 ? s.slice(0, 70) + "…" : s;
}

function ResourceTable({ res }: { res: Resource }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(async () => setRows((await call<{ rows: Row[] }>(`/r/${res.name}`)).body.rows ?? []), [res.name]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load rows for the selected resource
  useEffect(() => { void load(); }, [load]);

  const cols = res.fields.filter((f) => f.kind !== "longtext").slice(0, 5);
  const [labels, setLabels] = useState<Record<string, Record<number, string>>>({});
  useEffect(() => {
    for (const r of new Set(cols.filter((c) => c.kind === "ref" && c.refResource).map((c) => c.refResource!))) {
      void call<{ options: { id: number; label: string }[] }>(`/options/${r}`).then(({ body }) =>
        setLabels((l) => ({ ...l, [r]: Object.fromEntries((body.options ?? []).map((o) => [o.id, o.label])) })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- columns are static per resource
  }, [res.name]);
  const cell = (c: Field, v: unknown) => (c.kind === "ref" && typeof v === "number" ? labels[c.refResource!]?.[v] ?? `#${v}` : display(v));
  const shown = (rows ?? []).filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q.toLowerCase()));

  return (
    <section className="card" aria-labelledby="res-h">
      <div className="admin-toolbar">
        <h2 id="res-h" style={{ fontSize: 26 }}>{res.label} <span className="muted" style={{ fontSize: 16 }}>({rows?.length ?? "…"})</span></h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input className="field" style={{ minHeight: 38, width: 220 }} type="search" placeholder="Filter rows…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter rows" />
          {!res.noCreate && <button className="btn small primary" type="button" onClick={() => setEditing("new")}>+ New</button>}
        </div>
      </div>
      {msg && <p className="ok-box" role="status" style={{ margin: 16 }}>{msg}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>ID</th>{cols.map((c) => <th key={c.name}>{c.label}</th>)}<th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                {cols.map((c) => <td key={c.name}>{c.name === "verification_status" ? <span className={`pill ${String(r[c.name])}`}>{display(r[c.name])}</span> : cell(c, r[c.name])}</td>)}
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="btn small" type="button" onClick={() => setEditing(r)}>Edit</button>{" "}
                  {!res.noDelete && <button className="btn small" type="button" onClick={async () => {
                    if (!window.confirm(`Delete ${res.label} #${r.id}? This cannot be undone.`)) return;
                    const { status, body } = await call<{ error?: string }>(`/r/${res.name}/${r.id}`, { method: "DELETE" });
                    setMsg(status === 204 ? `Deleted #${r.id}` : body.error ?? "Delete failed");
                    void load();
                  }}>Delete</button>}
                </td>
              </tr>
            ))}
            {rows && shown.length === 0 && <tr><td colSpan={cols.length + 2} className="muted" style={{ textAlign: "center", padding: 32 }}>No records.</td></tr>}
          </tbody>
        </table>
      </div>
      {editing && (
        <RecordForm resource={res.name} label={res.label} fields={res.fields} row={editing === "new" ? null : editing}
          onClose={(saved) => { setEditing(null); if (saved) { setMsg(`Saved #${saved}`); void load(); } }} />
      )}
    </section>
  );
}
