"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { shortlist, useShortlist } from "@/lib/shortlist";
import { STATIC_DATA } from "@/lib/api";
import { T, useT } from "@/lib/i18n";

/** Enquiries go to the client's published address when the site runs without the API. */
const ENQUIRY_EMAIL = "info@autovivo.it";

type Errors = Record<string, string>;

export default function QuotePage() {
  const items = useShortlist();
  const t = useT();
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: number; note: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [mailed, setMailed] = useState(false);

  // "Confirm fitment with my VIN" links here: land straight in the VIN field.
  useEffect(() => { if (window.location.hash === "#vin") document.getElementById("vin")?.focus(); }, []);

  function emailEnquiry(f: FormData) {
    const name = String(f.get("name") ?? "").trim();
    if (!name) { setErrors({ name: t("Please enter your name.") }); return; }
    const lines = [
      t("Hello Autovivo,"), "", t("I would like a quote for these parts:"), ...items.map((it) => `- ${it.label}`), "",
      `${t("Name")}: ${name}`, f.get("vin") ? `VIN: ${f.get("vin")}` : "", f.get("message") ? `\n${f.get("message")}` : "",
    ].filter((l) => l !== "");
    window.location.href = `mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent(t("Parts enquiry"))}&body=${encodeURIComponent(lines.join("\n"))}`;
    setMailed(true);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setFailed(null); setErrors({});
    if (STATIC_DATA) { emailEnquiry(f); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/v1/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.get("name"), email: f.get("email"), vin: f.get("vin") || null, message: f.get("message") || null, items }),
      });
      const body = await res.json();
      if (res.status === 201) { setDone(body); shortlist.clear(); }
      else if (res.status === 422) setErrors(body.fields ?? {});
      else setFailed(body.error ?? t("Request failed"));
    } catch {
      setFailed(t("Network error — please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow"><T>Enquiry list</T></div>
        <h1><T>{"Request a <em>quote.</em>"}</T></h1>
        <p><T>Send the groups and parts you are interested in. This is a request for manual follow-up only — no price, stock, payment or order is created, and nothing is confirmed until we check fitment against your VIN with an authorized source.</T></p>
      </header>

      {done ? (
        <div className="ok-box" role="status">
          <b><T v={{ id: done.id }}>{"Request #{id} received."}</T></b> {done.note}
          <p style={{ marginBottom: 0 }}><Link href="/vehicles/ferrari-488-gtb"><T>Back to the explorer →</T></Link></p>
        </div>
      ) : (
        <div className="two-col">
          <section className="card" aria-labelledby="items-h">
            <div className="admin-toolbar"><h2 id="items-h" style={{ fontSize: 26 }}><T>Items</T> ({items.length})</h2>
              {items.length > 0 && <button type="button" className="btn small" onClick={() => shortlist.clear()}><T>Clear all</T></button>}</div>
            {items.length === 0 ? (
              <div className="empty" style={{ margin: 18 }}><T>Your enquiry list is empty.</T> <Link href="/vehicles/ferrari-488-gtb"><T>Open the explorer</T></Link> <T>and add an assembly group or part.</T></div>
            ) : (
              <table className="data-table">
                <thead><tr><th><T>Type</T></th><th><T>Item</T></th><th><span className="sr-only"><T>Remove</T></span></th></tr></thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={`${it.kind}-${it.ref}`}>
                      <td><span className="pill neutral"><T>{it.kind}</T></span></td>
                      <td>{it.label}</td>
                      <td style={{ textAlign: "right" }}><button type="button" className="btn small" onClick={() => shortlist.remove(it)} aria-label={t("Remove {label}", { label: it.label })}><T>Remove</T></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="help" style={{ padding: "0 18px 16px" }}><T>Saved in this browser only until you send the request.</T></p>
          </section>

          <form className="card form" onSubmit={submit} noValidate aria-labelledby="form-h">
            <h2 id="form-h" style={{ fontSize: 26 }}><T>Your details</T></h2>
            <label><T>Name</T><input className="field" name="name" autoComplete="name" required aria-invalid={!!errors.name} />{errors.name && <span className="err">{errors.name}</span>}</label>
            <label><T>Email</T><input className="field" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} />{errors.email && <span className="err">{errors.email}</span>}</label>
            <label><T>VIN (optional, 17 characters)</T><input className="field mono" id="vin" name="vin" maxLength={17} autoCapitalize="characters" spellCheck={false} aria-invalid={!!errors.vin} />{errors.vin && <span className="err">{errors.vin}</span>}</label>
            <label><T>Message (optional)</T><textarea className="field" name="message" maxLength={2000} /></label>
            {errors.items && <p className="err">{errors.items}</p>}
            {failed && <p className="err-box" role="alert">{failed}</p>}
            {mailed && <p className="ok-box" role="status"><T v={{ email: ENQUIRY_EMAIL }}>{"Your email app should now show the enquiry addressed to {email}. Send it from there."}</T></p>}
            <button className="btn primary" type="submit" disabled={busy || items.length === 0}><T>{busy ? "Sending…" : STATIC_DATA ? "Email the enquiry" : "Send quote request"}</T></button>
            <p className="help">{STATIC_DATA
              ? <T v={{ email: ENQUIRY_EMAIL }}>{"Opens your email app with the list addressed to {email}; nothing is sent or stored by this site."}</T>
              : <T>We store your name, email, optional VIN and message to reply to this request. No automatic email is sent yet.</T>}</p>
          </form>
        </div>
      )}
    </div>
  );
}
