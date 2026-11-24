"use client";
import { useState } from "react";
import { T, useT } from "@/lib/i18n";

/** Same honest flow as the enquiry list: opens the visitor's email app addressed to the client; nothing is stored or charged. */
const EMAIL = "info@autovivo.it";
const MAKES = ["Ferrari", "Lamborghini", "Maserati", "Other"];
type Errors = Record<string, string>;

export default function PreorderForm() {
  const t = useT();
  const [errors, setErrors] = useState<Errors>({});
  const [mailed, setMailed] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const err: Errors = {};
    if (!v("part")) err.part = t("Please enter the part name or number.");
    if (!v("name")) err.name = t("Please enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(v("email"))) err.email = t("Please enter a valid email address.");
    setErrors(err);
    if (Object.keys(err).length) return;
    const lines: (string | null)[] = [
      t("Hello Autovivo,"), "", t("I would like to pre-order this part:"), "",
      `${t("Make")}: ${v("make")}`, v("model") ? `${t("Model / year")}: ${v("model")}` : null,
      `${t("Part name or number")}: ${v("part")}`, `${t("Quantity")}: ${v("qty") || "1"}`, v("vin") ? `VIN: ${v("vin")}` : null, "",
      `${t("Name")}: ${v("name")}`, `${t("Email")}: ${v("email")}`, v("phone") ? `${t("Phone")}: ${v("phone")}` : null, v("message") ? `\n${v("message")}` : null,
    ].filter((l): l is string => l !== null);
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(t("Pre-order request"))}&body=${encodeURIComponent(lines.join("\n"))}`;
    setMailed(true);
  }

  return (
    <form className="card form preorder-form" onSubmit={submit} noValidate aria-labelledby="po-h">
      <h2 id="po-h" style={{ fontSize: 26 }}><T>Part details</T></h2>
      <div className="po-grid">
        <label><T>Make</T>
          <select className="field" name="make" defaultValue="Ferrari">{MAKES.map((m) => <option key={m} value={m}>{m === "Other" ? t("Other") : m}</option>)}</select>
        </label>
        <label><T>Model / year (optional)</T><input className="field" name="model" placeholder="488 GTB, 2017" /></label>
        <label className="po-wide"><T>Part name or number</T><input className="field" name="part" aria-invalid={!!errors.part} />{errors.part && <span className="err">{errors.part}</span>}</label>
        <label><T>Quantity</T><input className="field" name="qty" type="number" min={1} max={99} defaultValue={1} inputMode="numeric" /></label>
        <label><T>VIN (optional, 17 characters)</T><input className="field mono" name="vin" maxLength={17} autoCapitalize="characters" spellCheck={false} /></label>
      </div>
      <h2 style={{ fontSize: 26, marginTop: 8 }}><T>Your details</T></h2>
      <div className="po-grid">
        <label><T>Name</T><input className="field" name="name" autoComplete="name" aria-invalid={!!errors.name} />{errors.name && <span className="err">{errors.name}</span>}</label>
        <label><T>Email</T><input className="field" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} />{errors.email && <span className="err">{errors.email}</span>}</label>
        <label className="po-wide"><T>Phone (optional)</T><input className="field" name="phone" type="tel" autoComplete="tel" /></label>
        <label className="po-wide"><T>Message (optional)</T><textarea className="field" name="message" maxLength={2000} /></label>
      </div>
      {mailed && <p className="ok-box" role="status"><T v={{ email: EMAIL }}>{"Your email app should now show the pre-order request addressed to {email}. Send it from there."}</T></p>}
      <button className="btn primary" type="submit"><T>Email the pre-order request</T></button>
      <p className="help"><T v={{ email: EMAIL }}>{"Opens your email app with the request addressed to {email}; nothing is sent, stored or charged by this site."}</T></p>
    </form>
  );
}
