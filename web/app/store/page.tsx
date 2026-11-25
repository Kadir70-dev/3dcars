import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { api, type StoreResponse } from "@/lib/api";
import { StatusPill } from "@/components/Status";
import { AddPart } from "@/components/AddPart";
import { ApiDown } from "@/components/ApiDown";
import TiltGrid from "@/components/TiltGrid";
import FilterPanel from "@/components/FilterPanel";
import { L, T } from "@/lib/i18n";

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
        <div className="eyebrow"><T>Autovivo store catalogue</T></div>
        <h1><T>{"All <em>parts.</em>"}</T></h1>
        <p><T>Every part listed in the Autovivo store, with its part number, photo and the models it is listed to fit. Prices on request — use Enquire or open the listing in the Autovivo store. Fitment is as listed by the store; confirm it against your VIN before ordering.</T></p>
      </header>

      <div className="shop">
        <div>
          <FilterPanel active={(brand ? 1 : 0) + (model ? 1 : 0) + (q ? 1 : 0)}>
            <form key={brand} className="f-search" method="get" role="search">
              {brand && <input type="hidden" name="brand" value={brand} />}
              <h2><T>OEM part number or name</T></h2>
              <L as="input" className="field" type="search" name="q" defaultValue={q} placeholder="Part name or part number…" aria-label="Search term" />
              <h2 style={{ marginTop: 8 }}><T>Model</T></h2>
              <select className="field" name="model" defaultValue={model} aria-label="Model">
                <option value=""><T>All models</T></option>
                {models.map((m) => <option key={m.model} value={m.model}>{m.model} ({m.parts})</option>)}
              </select>
              <button className="btn primary" type="submit"><T>Search</T></button>
              {(q || model) && <Link href={href({ q: "", model: "" })} className="muted"><T>Clear filters</T></Link>}
            </form>
            <L as="nav" className="f-group" aria-label="Brand">
              <h2><T>Marque</T></h2>
              <ul className="f-brands">
                <li><Link href={href({ brand: "", model: "" })} aria-current={brand === "" ? "page" : undefined}><T>All</T> <span>{all}</span></Link></li>
                {BRANDS.map((b) => <li key={b}><Link href={href({ brand: b, model: "" })} aria-current={brand === b ? "page" : undefined}>{b} <span>{brands[b] ?? 0}</span></Link></li>)}
              </ul>
            </L>
          </FilterPanel>
        </div>
        <div className="shop-main">
      <p className="result-count" aria-live="polite" style={{ margin: "20px 0 12px" }}>
        <T v={{ n: total }}>{total === 1 ? "{n} part" : "{n} parts"}</T>{brand ? ` · ${brand}` : ""}{model ? <> · <T>fits</T> {model}</> : ""}{q ? ` · “${q}”` : ""}
      </p>
      {parts.length === 0 ? <div className="empty"><T>No parts match. Try a shorter search or another model.</T></div> : (
        <TiltGrid className="product-grid elite-grid">
          {parts.map((p) => (
            <article className="product elite" key={p.id}>
              <Link href={`/parts/${p.id}`} className="product-img" tabIndex={-1} aria-hidden="true">
                <span className="product-float">
                  {p.imageUrl ? <Image src={p.imageUrl} alt="" fill sizes="(max-width: 720px) 100vw, 300px" /> : <span className="muted"><T>No photo</T></span>}
                </span>
              </Link>
              <div className="product-body">
                <div className="product-top">
                  <span className="mono">{p.oemPartNumber ?? <T>No part no.</T>}</span>
                  <StatusPill status={p.provenance.verificationStatus} />
                </div>
                <h3><Link href={`/parts/${p.id}`} title={p.name}>{p.name}</Link></h3>
                <p className="muted">{p.brand}{p.fitModels.length ? <> · <T>fits</T> {p.fitModels.slice(0, 3).join(", ")}{p.fitModels.length > 3 ? "…" : ""}</> : ""}</p>
                <div className="product-meta"><b><T>Price on request</T></b><span className="stock"><T>Stock on enquiry</T></span></div>
                <div className="product-actions">
                  <AddPart compact id={p.id} label={`${p.oemPartNumber ?? "No part no."} · ${p.name}`} />
                  {p.listingUrl && <a className="store-link" href={p.listingUrl} target="_blank" rel="noreferrer" aria-label={`${p.name} · autovivo.it`}><T>On autovivo.it ↗</T></a>}
                </div>
              </div>
            </article>
          ))}
        </TiltGrid>
      )}
      {pages > 1 && (
        <L as="nav" className="pager" aria-label="Pages">
          {page > 1 ? <Link className="btn small" href={href({ page: page - 1 })}><T>‹ Previous</T></Link> : <span />}
          <span className="muted"><T v={{ page, pages }}>{"Page {page} of {pages}"}</T></span>
          {page < pages ? <Link className="btn small" href={href({ page: page + 1 })}><T>Next ›</T></Link> : <span />}
        </L>
      )}
        </div>
      </div>
    </div>
  );
}
