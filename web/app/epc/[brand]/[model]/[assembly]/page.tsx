import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DiagramViewer from "@/components/DiagramViewer";
import { getAssembly } from "@/lib/epc";
import { PLACEHOLDER_CALLOUTS, PLACEHOLDER_DIAGRAM } from "@/lib/placeholderDiagram";

export const dynamic = "force-dynamic";
type P = { params: Promise<{ brand: string; model: string; assembly: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await params;
  const d = await getAssembly(p.model, p.assembly);
  return { title: d ? `${d.assembly.name} — ${d.model.name} parts` : "Parts catalogue", robots: { index: false, follow: false } };
}

export default async function EpcAssembly({ params }: P) {
  const p = await params;
  const d = p.brand === "ferrari" ? await getAssembly(p.model, p.assembly) : null;
  if (!d) notFound();
  // Diagram files are loaded only after written reproduction authorization; until then the original
  // placeholder is shown with no hotspots, and components are chosen from the synchronized table.
  const placeholderPins = d.demo ? PLACEHOLDER_CALLOUTS : [];
  return (
    <>
      <nav className="epc-crumbs" aria-label="Breadcrumb">
        <Link href="/epc">Catalogue</Link> / <Link href="/epc/ferrari">Ferrari</Link> / <Link href={`/epc/ferrari/${d.model.key}`}>{d.model.name}</Link> / {d.assembly.name}
      </nav>
      <header className="page-head">
        <span className="eyebrow">Step 4 of 5 · {d.assembly.category}</span>
        <h1>{d.assembly.number ? `${d.assembly.number} · ` : ""}{d.assembly.name}</h1>
        <p>{d.model.name} — select a component to see its OEM number, price and fitment.</p>
      </header>
      <DiagramViewer diagram={PLACEHOLDER_DIAGRAM} callouts={placeholderPins} rows={d.rows} title={d.assembly.name}
        notice={d.demo ? "Placeholder diagram - demo data" : "Original diagram pending authorization"} />
    </>
  );
}
