import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getModels } from "@/lib/epc";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ferrari models — parts catalogue", robots: { index: false, follow: false } };

export default async function EpcModels({ params }: { params: Promise<{ brand: string }> }) {
  if ((await params).brand !== "ferrari") notFound();
  const models = await getModels();
  const groups = [...new Set(models.map((m) => m.group))];
  return (
    <>
      <nav className="epc-crumbs" aria-label="Breadcrumb"><Link href="/epc">Catalogue</Link> / Ferrari</nav>
      <header className="page-head"><span className="eyebrow">Step 2 of 5</span><h1>Choose a Ferrari model</h1></header>
      {groups.map((g) => (
        <section key={g} aria-labelledby={`g-${g}`} style={{ marginBottom: 28 }}>
          <h2 id={`g-${g}`} className="epc-h">{g}</h2>
          <div className="epc-grid">
            {models.filter((m) => m.group === g).map((m) => (
              <Link key={m.key} href={`/epc/ferrari/${m.key}`} className="card epc-card">
                <h3>{m.name}</h3><p className="dv-sub">{m.assemblies} assemblies</p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
