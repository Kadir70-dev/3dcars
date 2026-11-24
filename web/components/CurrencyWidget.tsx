"use client";
import { useEffect, useId, useState } from "react";
import { T, useT } from "@/lib/i18n";

// AED is pegged to USD; used only if the live rate cannot be fetched.
const FALLBACK = 4.27;
const API = "https://open.er-api.com/v6/latest/EUR";

type Rate = { value: number; live: boolean };

function Flag({ code }: { code: "EUR" | "AED" }) {
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
  const [eurToAed, setEurToAed] = useState(true);
  const [rate, setRate] = useState<Rate>({ value: FALLBACK, live: false });

  useEffect(() => {
    if (!open || rate.live) return;
    const ctl = new AbortController();
    fetch(API, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { rates?: { AED?: number } }) => {
        const v = j.rates?.AED;
        if (typeof v === "number" && v > 0) setRate({ value: v, live: true });
      })
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
  const result = Number.isFinite(n) && n >= 0 ? (eurToAed ? n * rate.value : n / rate.value) : null;
  const fmt = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const swap = () => {
    // Carry the converted value over so the swap feels like flipping the same conversion.
    if (result !== null) setAmount(result.toFixed(2));
    setEurToAed((v) => !v);
  };

  return (
    <div className="fx">
      {open && (
        <div className="fx-panel" role="dialog" aria-label={t("Euro to Dirham converter")} id={id}>
          <div className="fx-head">
            <strong>{eurToAed ? <T>Euro to Dirham</T> : <T>Dirham to Euro</T>}</strong>
            <button type="button" className="fx-x" onClick={() => setOpen(false)} aria-label={t("Close")}>×</button>
          </div>
          <label className="fx-row">
            <span><Flag code={eurToAed ? "EUR" : "AED"} />{eurToAed ? "EUR" : "AED"}</span>
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label={eurToAed ? "EUR" : "AED"} />
          </label>
          <button type="button" className="fx-swap" onClick={swap} aria-label={t("Swap currencies")}>
            <span aria-hidden="true">↑↓</span>
          </button>
          <div className="fx-row fx-out" aria-live="polite">
            <span><Flag code={eurToAed ? "AED" : "EUR"} />{eurToAed ? "AED" : "EUR"}</span>
            <output>{result === null ? "—" : fmt(result)}</output>
          </div>
          <p className="fx-note">
            1 EUR = {rate.value.toFixed(4)} AED ·{" "}
            {rate.live ? <T>live rate</T> : <T>approximate rate</T>}
          </p>
          <p className="fx-note"><T>Indicative only. Final prices are confirmed on enquiry.</T></p>
        </div>
      )}
      <button type="button" className="fx-fab" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true" className="fx-fab-in"><Flag code="EUR" />→<Flag code="AED" /></span>
        <span className="sr-only"><T>Euro to Dirham converter</T></span>
      </button>
    </div>
  );
}
