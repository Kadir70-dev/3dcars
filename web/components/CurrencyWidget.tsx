"use client";
import { useEffect, useId, useState } from "react";
import { T, useT } from "@/lib/i18n";

// AED is pegged to USD at 3.6725, so EUR/AED = ECB EUR/USD x 3.6725 (ECB reference rate via Frankfurter, updated daily).
// FALLBACK is used only if no live rate can be fetched.
const FALLBACK = { usd: 1.0939, aed: 4.02 };
type Cur = "EUR" | "AED" | "USD";
const CURS: Cur[] = ["EUR", "USD", "AED"];
const PEG = 3.6725;
const ECB_API = "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD";
const ER_API = "https://open.er-api.com/v6/latest/EUR";

async function fetchRates(signal: AbortSignal): Promise<{ usd: number; aed: number }> {
  try {
    const r = await fetch(ECB_API, { signal });
    const j = (await r.json()) as { rates?: { USD?: number } };
    const usd = j.rates?.USD;
    if (typeof usd === "number" && usd > 0) return { usd, aed: usd * PEG };
  } catch (e) { if (signal.aborted) throw e; }
  const r = await fetch(ER_API, { signal });
  const j = (await r.json()) as { rates?: { AED?: number; USD?: number } };
  const aed = j.rates?.AED, usd = j.rates?.USD;
  if (typeof aed === "number" && aed > 0) return { usd: typeof usd === "number" && usd > 0 ? usd : aed / PEG, aed };
  throw new Error("no rate");
}

type Rate = { usd: number; aed: number; live: boolean };

function Flag({ code }: { code: Cur }) {
  if (code === "USD") return (
    <svg className="fx-flag" viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={i * 20 / 13} width="30" height={20 / 13} fill="#b22234" />)}
      <rect width="13" height="10.77" fill="#3c3b6e" />
    </svg>
  );
  return code === "AED" ? (
    <svg className="fx-flag" viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#fff" />
      <rect y="0" width="30" height="6.67" fill="#00732f" />
      <rect y="13.33" width="30" height="6.67" fill="#000" />
      <rect width="8" height="20" fill="#ff0000" />
    </svg>
  ) : (
    <svg className="fx-flag" viewBox="0 0 30 20" aria-hidden="true">
      <rect width="30" height="20" fill="#039" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={15 + 6.5 * Math.sin(a)} cy={10 - 6.5 * Math.cos(a)} r="1" fill="#fc0" />;
      })}
    </svg>
  );
}

export function CurrencyWidget() {
  const t = useT();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState<Cur>("EUR");
  const [rate, setRate] = useState<Rate>({ ...FALLBACK, live: false });

  useEffect(() => {
    if (!open || rate.live) return;
    const ctl = new AbortController();
    fetchRates(ctl.signal)
      .then((r) => setRate({ ...r, live: true }))
      .catch(() => { /* keep the approximate fallback */ });
    return () => ctl.abort();
  }, [open, rate.live]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const n = parseFloat(amount.replace(",", "."));
  const perEur: Record<Cur, number> = { EUR: 1, USD: rate.usd, AED: rate.aed };
  const valid = Number.isFinite(n) && n >= 0;
  const conv = (c: Cur) => (valid ? (n / perEur[from]) * perEur[c] : null);
  const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="fx">
      {open && (
        <div className="fx-panel" role="dialog" aria-label={t("Currency converter")} id={id}>
          <div className="fx-head">
            <strong><T>Currency converter</T></strong>
            <button type="button" className="fx-x" onClick={() => setOpen(false)} aria-label={t("Close")}>×</button>
          </div>
          <label className="fx-row">
            <span><Flag code={from} />
              <select value={from} onChange={(e) => setFrom(e.target.value as Cur)} aria-label={t("From currency")}>{CURS.map((c) => <option key={c}>{c}</option>)}</select>
            </span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={from} />
          </label>
          <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
            {CURS.map((c) => (
              <div className="fx-row fx-out" key={c}>
                <span><Flag code={c} />{c}</span>
                <output>{conv(c) === null ? "—" : fmt(conv(c) as number)}</output>
              </div>
            ))}
          </div>
          <p className="fx-note">
            1 EUR = {rate.aed.toFixed(4)} AED · 1 EUR = {rate.usd.toFixed(4)} USD ·{" "}
            {rate.live ? <T>live rate</T> : <T>approximate rate</T>}
          </p>
          <p className="fx-note"><T>Indicative only. Final prices are confirmed on enquiry.</T></p>
        </div>
      )}
      <button type="button" className="fx-fab" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true" className="fx-fab-in"><Flag code="EUR" /><Flag code="USD" /><Flag code="AED" /></span>
        <span className="sr-only"><T>Currency converter</T></span>
      </button>
    </div>
  );
}
