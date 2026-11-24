"use client";
import { useId, useRef, useState } from "react";
import { T, useT } from "@/lib/i18n";

/** Same honest flow as the quote and pre-order forms: opens the visitor's email app addressed to the client.
 *  Nothing is sent, stored or charged by the site. */
const EMAIL = "info@autovivo.it";
const CODES = [["+971", "UAE"], ["+39", "Italy"], ["+44", "UK"], ["+966", "Saudi Arabia"], ["+974", "Qatar"], ["+965", "Kuwait"], ["+968", "Oman"], ["+973", "Bahrain"], ["+1", "USA"], ["+91", "India"], ["+49", "Germany"]];
const CHIPS = ["Engine", "Brakes", "Body panels", "Wheels", "Lights", "Interior", "Suspension", "Cooling"];
type Errors = Partial<Record<"name" | "phone" | "part", string>>;

export default function EnquiryForm() {
  const t = useT();
  const uid = useId();
  const partRef = useRef<HTMLTextAreaElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState<{ name: string } | null>(null);
  const [part, setPart] = useState("");

  const addChip = (label: string) => {
    const l = t(label);
    setErrors((er) => ({ ...er, part: undefined }));
    if (part.toLowerCase().includes(l.toLowerCase())) return;
    setPart((p) => (p.trim() ? `${p.trim().replace(/[,;]$/, "")}, ${l}` : l));
    partRef.current?.focus();
  };

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const phone = String(f.get("phone") ?? "").trim();
    const code = String(f.get("code") ?? "+971");
    const want = part.trim();
    const err: Errors = {};
    if (name.length < 2) err.name = t("Please enter your name.");
    if (!/^[\d\s().-]{6,16}$/.test(phone) || phone.replace(/\D/g, "").length < 6) err.phone = t("Please enter a valid phone number.");
    if (want.length < 3) err.part = t("Tell us which part you need.");
    setErrors(err);
    if (Object.keys(err).length) { (e.currentTarget.querySelector("[aria-invalid=true]") as HTMLElement | null)?.focus(); return; }
    const body = [t("Hello Autovivo,"), "", `${t("Name")}: ${name}`, `${t("Phone")}: ${code} ${phone}`, `${t("Part needed")}: ${want}`].join("\n");
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`${t("Enquiry")}: ${want.slice(0, 60)}`)}&body=${encodeURIComponent(body)}`;
    setDone({ name });
  }

  const fieldErr = (k: keyof Errors) => (errors[k] ? <span className="enq-err" id={`${uid}-${k}-e`} role="alert">{errors[k]}</span> : null);
  const desc = (k: keyof Errors) => (errors[k] ? `${uid}-${k}-e` : undefined);

  return (
    <div className="enq" id="enquiry">
      <aside className="enq-side">
        <div className="eyebrow"><T>Quick enquiry</T></div>
        <h2><T>{"Tell us the part. <em>We’ll find it.</em>"}</T></h2>
        <ul>
          <li><T>We reply with price and availability.</T></li>
          <li><T>Fitment checked against your VIN.</T></li>
          <li><T>No online payment, ever.</T></li>
        </ul>
        <p className="enq-direct"><T>Prefer to talk?</T> <a href="tel:+97143287914">+971 4 328 7914</a></p>
      </aside>

      {done ? (
        <div className="enq-done" role="status">
          <svg viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24" /><path d="m15 27 8 8 15-17" /></svg>
          <h3><T v={{ name: done.name }}>{"Thank you, {name}."}</T></h3>
          <p><T v={{ email: EMAIL }}>{"Your email app should now show the enquiry addressed to {email}. Press send there and we will call you back."}</T></p>
          <button type="button" className="btn" onClick={() => { setDone(null); setPart(""); }}><T>Send another enquiry</T></button>
        </div>
      ) : (
        <form className="enq-form" onSubmit={submit} noValidate aria-label={t("Quick enquiry")}
          onInput={(e) => { const n = (e.target as HTMLInputElement).name as keyof Errors; if (errors[n]) setErrors((er) => ({ ...er, [n]: undefined })); }}>
          <div className="enq-field" data-invalid={!!errors.name || undefined}>
            <input id={`${uid}-name`} name="name" placeholder=" " autoComplete="name" aria-invalid={!!errors.name} aria-describedby={desc("name")} />
            <label htmlFor={`${uid}-name`}><T>Your name</T></label>
            {fieldErr("name")}
          </div>

          <div className="enq-field enq-phone" data-invalid={!!errors.phone || undefined}>
            <select name="code" defaultValue="+971" aria-label={t("Country code")}>
              {CODES.map(([c, n]) => <option key={c + n} value={c}>{c} · {t(n)}</option>)}
            </select>
            <div className="enq-inner">
              <input id={`${uid}-phone`} name="phone" type="tel" inputMode="tel" placeholder=" " autoComplete="tel-national" aria-invalid={!!errors.phone} aria-describedby={desc("phone")} />
              <label htmlFor={`${uid}-phone`}><T>Phone number</T></label>
            </div>
            {fieldErr("phone")}
          </div>

          <div className="enq-field enq-area" data-invalid={!!errors.part || undefined}>
            <textarea id={`${uid}-part`} ref={partRef} name="part" placeholder=" " rows={3} maxLength={600} value={part} onChange={(e) => setPart(e.target.value)} aria-invalid={!!errors.part} aria-describedby={desc("part")} />
            <label htmlFor={`${uid}-part`}><T>Which part do you want?</T></label>
            {fieldErr("part")}
          </div>
          <div className="enq-chips" role="group" aria-label={t("Quick picks")}>
            {CHIPS.map((c) => <button key={c} type="button" className="enq-chip" onClick={() => addChip(c)}>+ <T>{c}</T></button>)}
          </div>

          <button className="btn primary enq-submit" type="submit"><span><T>Send enquiry</T></span><i aria-hidden="true">→</i></button>
          <p className="help"><T v={{ email: EMAIL }}>{"Opens your email app with the enquiry addressed to {email}; nothing is sent, stored or charged by this site."}</T></p>
        </form>
      )}
    </div>
  );
}
