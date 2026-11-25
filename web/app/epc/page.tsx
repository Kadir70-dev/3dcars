import type { Metadata } from "next";
import Link from "next/link";
import { getBrands } from "@/lib/epc";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Parts catalogue — choose a brand", robots: { index: false, follow: false } };

export default async function EpcBrands() {
  const brands = await getBrands();
  return (
    <>
      <header className="page-head">
        <span className="eyebrow">Illustrated parts catalogue</span>
        <h1>Choose a brand</h1>
        <p>Brand → model → assembly → exploded diagram → component → price. Request a quotation or add parts to your enquiry list.</p>
      </header>
      <div className="epc-grid">
        {brands.map((b) => (
          <Link key={b.slug} href={`/epc/${b.slug}`} className="card epc-card">
            <span className="eyebrow">Brand</span>
            <h2>{b.name}</h2>
            <p className="dv-sub">{b.models} models{b.demo ? " · demo data" : ""}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
