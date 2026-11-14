"use client";
import Link from "next/link";
import { useState } from "react";
import { shortlist, useShortlist } from "@/lib/shortlist";

type Errors = Record<string, string>;

export default function QuotePage() {
  const items = useShortlist();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: number; note: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true); setFailed(null); setErrors({});
    try {
      const res = await fetch("/api/v1/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.get("name"), email: f.get("email"), vin: f.get("vin") || null, message: f.get("message") || null, items }),
      });
      const body = await res.json();
      if (res.status === 201) { setDone(body); shortlist.clear(); }
      else if (res.status === 422) setErrors(body.fields ?? {});
      else setFailed(body.error ?? "Request failed");
    } catch {
      setFailed("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow">Enquiry list</div>
        <h1>Request a <em>quote.</em></h1>
        <p>Send the groups and parts you are interested in. This is a request for manual follow-up only — no price, stock, payment or order is created,
          and nothing is confirmed until we check fitment against your VIN with an authorized source.</p>
      </header>

      {done ? (
        <div className="ok-box" role="status">
          <b>Request #{done.id} received.</b> {done.note}
          <p style={{ marginBottom: 0 }}><Link href="/vehicles/ferrari-488-gtb">Back to the explorer →</Link></p>
        </div>
      ) : (
        <div className="two-col">
          <section className="card" aria-labelledby="items-h">
            <div className="admin-toolbar"><h2 id="items-h" style={{ fontSize: 26 }}>Items ({items.length})</h2>
              {items.length > 0 && <button type="button" className="btn small" onClick={() => shortlist.clear()}>Clear all</button>}</div>
            {items.length === 0 ? (
              <div className="empty" style={{ margin: 18 }}>Your enquiry list is empty. <Link href="/vehicles/ferrari-488-gtb">Open the explorer</Link> and add an assembly group or part.</div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Type</th><th>Item</th><th><span className="sr-only">Remove</span></th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={`${it.kind}-${it.ref}`}>
                      <td><span className="pill neutral">{it.kind}</span></td>
                      <td>{it.label}</td>
                      <td style={{ textAlign: "right" }}><button type="button" className="btn small" onClick={() => shortlist.remove(it)} aria-label={`Remove ${it.label}`}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="help" style={{ padding: "0 18px 16px" }}>Saved in this browser only until you send the request.</p>
          </section>

          <form className="card form" onSubmit={submit} noValidate aria-labelledby="form-h">
            <h2 id="form-h" style={{ fontSize: 26 }}>Your details</h2>
            <label>Name<input className="field" name="name" autoComplete="name" required aria-invalid={!!errors.name} />{errors.name && <span className="err">{errors.name}</span>}</label>
            <label>Email<input className="field" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />{errors.email && <span className="err">{errors.email}</span>}</label>
            <label>VIN (optional, 17 characters)<input className="field mono" name="vin" maxLength={17} autoCapitalize="characters" spellCheck={false} aria-invalid={!!errors.vin} />{errors.vin && <span className="err">{errors.vin}</span>}</label>
            <label>Message (optional)<textarea className="field" name="message" maxLength={2000} /></label>
            {errors.items && <p className="err">{errors.items}</p>}
            {failed && <p className="err-box" role="alert">{failed}</p>}
            <button className="btn primary" type="submit" disabled={busy || items.length === 0}>{busy ? "Sending…" : "Send quote request"}</button>
            <p className="help">We store your name, email, optional VIN and message to reply to this request. No automatic email is sent yet.</p>
          </form>
        </div>
      )}
    </div>
  );
}
