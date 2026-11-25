import type { Metadata } from "next";
import DiagramViewer from "@/components/DiagramViewer";
import { PLACEHOLDER_CALLOUTS, PLACEHOLDER_DIAGRAM, PLACEHOLDER_ROWS } from "@/lib/placeholderDiagram";

export const metadata: Metadata = { title: "Diagram viewer (development preview)", robots: { index: false, follow: false } };

export default function DiagramDemo() {
  return (
    <main className="wrap" style={{ padding: "32px 0" }}>
      <h1>Interactive diagram viewer</h1>
      <p className="dv-sub">Development preview using an original placeholder diagram and demo data. No Ferrari drawings or live catalogue data.</p>
      <DiagramViewer diagram={PLACEHOLDER_DIAGRAM} callouts={PLACEHOLDER_CALLOUTS} rows={PLACEHOLDER_ROWS}
        title="Placeholder assembly" notice="Placeholder diagram - demo data" />
    </main>
  );
}
