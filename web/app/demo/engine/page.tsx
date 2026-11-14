import type { Metadata } from "next";
import Workbench from "@/components/Workbench";

export const metadata: Metadata = {
  title: "Illustrative V8 engine component explorer",
  description: "Rotate, select, inspect, and step through an illustrative procedural V8 engine concept. This is not OEM geometry or fitment data.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="wrap demo-page">
      <header className="page-head">
        <div className="eyebrow">Interactive concept · generated in code</div>
        <h1>V8 engine <em>assembly.</em></h1>
        <p>
          Rotate the procedural model, select a component, or disassemble it step by step. This is an illustrative engineering
          concept made from Three.js geometry—not a Ferrari or Lamborghini factory engine, parts catalogue, or fitment reference.
        </p>
      </header>
      <Workbench preset="engineConcept" />
    </div>
  );
}
