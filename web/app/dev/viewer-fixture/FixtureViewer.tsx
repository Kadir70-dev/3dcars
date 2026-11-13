"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { buildFixture, FIXTURE_BINDINGS } from "@/lib/fixture";

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), { ssr: false, loading: () => <div className="viewer-canvas" /> });
const SOURCE = { type: "scene" as const, build: buildFixture };
const CODES = ["FX-1", "FX-2", "FX-3", "FX-4"];

export default function FixtureViewer() {
  const [code, setCode] = useState<string | null>(null);
  const [exploded, setExploded] = useState(false);
  return (
    <section className="card viewer">
      <div className="viewer-tag"><span className="pill unverified">Test fixture · not a vehicle</span></div>
      <Viewer3D source={SOURCE} bindings={FIXTURE_BINDINGS} selectedCode={code} exploded={exploded} onSelectCode={setCode} label="Abstract test fixture" />
      <div className="viewer-foot">
        <div className="segmented" role="group" aria-label="View mode">
          <button type="button" aria-pressed={!exploded} onClick={() => setExploded(false)}>Assembled</button>
          <button type="button" aria-pressed={exploded} onClick={() => setExploded(true)}>Exploded</button>
        </div>
        <div className="systems">
          {CODES.map((c) => <button key={c} type="button" className="chip" aria-pressed={code === c} onClick={() => setCode(c)}>{c}</button>)}
        </div>
        <span className="mono muted" aria-live="polite">Selected: {code ?? "none"}</span>
      </div>
    </section>
  );
}
