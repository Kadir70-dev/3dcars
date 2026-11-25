import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModel } from "@/lib/epc";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ brand: string; model: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const d = await getModel((await params).model);
  return { title: d ? `${d.model.name} assemblies — parts catalogue` : "Parts catalogue", robots: { index: false, follow: false } };
}

export default async function EpcAssemblies({ params }: P) {
  const { brand, model } = await params;
  const d = brand === "ferrari" ? await getModel(model) : null;
  if (!d) notFound();
  return (
    <>
      <nav className="epc-crumbs" aria-label="Breadcrumb"><Link href="/epc">Catalogue</Link> / <Link href="/epc/ferrari">Ferrari</Link> / {d.model.name}</nav>
      <header className="page-head">
        <span className="eyebrow">Step 3 of 5 · {d.model.group}</span>
        <h1>{d.model.name}</h1>
        <p>Assemblies are grouped into Autovivo categories for easier browsing.</p>
      </header>
      {d.groups.map((g) => (
        <section key={g.category} aria-labelledby={`c-${g.category}`} style={{ marginBottom: 28 }}>
          <h2 id={`c-${g.category}`} className="epc-h">{g.category} <span className="dv-sub">({g.assemblies.length})</span></h2>
          <ul className="epc-list">
            {g.assemblies.map((a) => (
              <li key={a.id}><Link href={`/epc/ferrari/${d.model.key}/${a.slug}`}><span className="dv-ref">{a.number ?? "—"}</span> {a.name}</Link></li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
