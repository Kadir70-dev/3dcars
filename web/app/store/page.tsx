import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { api, type StoreResponse } from "@/lib/api";
import { StatusPill } from "@/components/Status";
import { AddPart } from "@/components/AddPart";
import { ApiDown } from "@/components/ApiDown";

export const metadata: Metadata = {
  title: "All parts — Ferrari, Lamborghini, Maserati",
  description: "Every genuine part listed in the Autovivo store: Ferrari, Lamborghini and Maserati, searchable by name, part number and model. Prices on request.",
  alternates: { canonical: "/store" },
};

const BRANDS = ["Ferrari", "Lamborghini", "Maserati"] as const;
type SP = { searchParams: Promise<{ brand?: string; q?: string; model?: string; page?: string }> };

export default async function Store({ searchParams }: SP) {
  const sp = await searchParams;
  const brand = BRANDS.find((b) => b === sp.brand) ?? "";
  const q = (sp.q ?? "").slice(0, 100);
  const model = /^[A-Za-z0-9 -]{0,40}$/.test(sp.model ?? "") ? (sp.model ?? "") : "";
  const page = Math.min(200, Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1));
  const href = (o: Partial<{ brand: string; q: string; model: string; page: number }>) => {
    const u = new URLSearchParams();
    const v = { brand, q, model, page: 1, ...o };
    if (v.brand) u.set("brand", v.brand);
    if (v.q) u.set("q", v.q);
    if (v.model) u.set("model", v.model);
    if (v.page > 1) u.set("page", String(v.page));
    const s = u.toString();
    return s ? `/store?${s}` : "/store";
  };
  let data: StoreResponse;
  try {
    data = await api<StoreResponse>(`/store-parts?${new URLSearchParams({ brand, q, model, page: String(page) })}`);
  } catch {
    return <ApiDown />;
  }
  const { parts, total, brands, models } = data.result;
  const all = Object.values(brands).reduce((a, b) => a + b, 0);
  const pages = Math.max(1, Math.ceil(total / data.perPage));

  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow">Autovivo store catalogue</div>
        <h1>All <em>parts.</em></h1>
        <p>Every part listed in the Autovivo store, with its part number, photo and the models it is listed to fit. Prices on request —
          use Enquire or open the listing in the Autovivo store. Fitment is as listed by the store; confirm it against your VIN before ordering.</p>
      </header>

      <nav className="brand-tabs" aria-label="Brand">
        <Link href={href({ brand: "", model: "" })} aria-current={brand === "" ? "page" : undefined}>All ({all})</Link>
        {BRANDS.map((b) => <Link key={b} href={href({ brand: b, model: "" })} aria-current={brand === b ? "page" : undefined}>{b} ({brands[b] ?? 0})</Link>)}
      </nav>

      <form key={brand} className="card catalog" method="get" role="search" style={{ marginTop: 16 }}>
        {brand && <input type="hidden" name="brand" value={brand} />}
        <div className="tools catalog-tools store-tools">
          <label className="search-wrap">
            <span className="sr-only">Search term</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input className="field" type="search" name="q" defaultValue={q} placeholder="Part name or part number…" />
          </label>
          <label><span className="sr-only">Model</span>
            <select className="field" name="model" defaultValue={model}>
              <option value="">All models</option>
              {models.map((m) => <option key={m.model} value={m.model}>{m.model} ({m.parts})</option>)}
            </select>
          </label>
          <button className="btn primary" type="submit">Search</button>
        </div>
        {(q || model) && <p style={{ margin: "12px 0 0" }}><Link href={href({ q: "", model: "" })} className="muted">Clear filters</Link></p>}
      </form>

      <p className="result-count" aria-live="polite" style={{ margin: "20px 0 12px" }}>
        {total} part{total === 1 ? "" : "s"}{brand ? ` · ${brand}` : ""}{model ? ` · fits ${model}` : ""}{q ? ` · “${q}”` : ""}
      </p>
      {parts.length === 0 ? <div className="empty">No parts match. Try a shorter search or another model.</div> : (
        <div className="product-grid">
          {parts.map((p) => (
            <article className="card product" key={p.id}>
              <Link href={`/parts/${p.id}`} className="product-img" tabIndex={-1} aria-hidden="true">
                {p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="(max-width: 720px) 100vw, 300px" /> : <span className="muted">No photo</span>}
              </Link>
              <div className="product-body">
                <div className="product-top">
                  <span className="mono">{p.oemPartNumber ?? "No part no."}</span>
                  <StatusPill status={p.provenance.verificationStatus} />
                </div>
                <h3><Link href={`/parts/${p.id}`}>{p.name}</Link></h3>
                <p className="muted">{p.brand}{p.fitModels.length ? ` · fits ${p.fitModels.slice(0, 3).join(", ")}${p.fitModels.length > 3 ? "…" : ""}` : ""}</p>
                <div className="product-actions">
                  <AddPart id={p.id} label={`${p.oemPartNumber ?? "No part no."} · ${p.name}`} />
                  {p.listingUrl && <a className="btn small" href={p.listingUrl} target="_blank" rel="noreferrer">Autovivo store ↗</a>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {pages > 1 && (
        <nav className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn small" href={href({ page: page - 1 })}>‹ Previous</Link> : <span />}
          <span className="muted">Page {page} of {pages}</span>
          {page < pages ? <Link className="btn small" href={href({ page: page + 1 })}>Next ›</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
