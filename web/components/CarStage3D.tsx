"use client";
// The Ferrari / Lamborghini stage: full 360-degree 3D models you can turn.
import dynamic from "next/dynamic";
import { useState } from "react";
import { DEMO458_BINDINGS, DEMO458_URL, tuneDemo458 } from "@/lib/demo458";
import { LAMBO_BINDINGS, LAMBO_URL, tuneLambo } from "@/lib/demoLambo";
import type { MeshBinding } from "@/lib/api";
import type { ModelSource } from "./Viewer3D";
import { L, T, useT } from "@/lib/i18n";

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), { ssr: false, loading: () => <div className="viewer-canvas" /> });

const CARS = {
  ferrari488: { make: "Ferrari", model: "488 GTB", source: { type: "url", url: "/models/demo/ferrari-488-gtb-from-photo.glb" } as ModelSource, bindings: [] as MeshBinding[] },
  ferrari: { make: "Ferrari", model: "458 Italia", source: { type: "url", url: DEMO458_URL, tune: tuneDemo458 } as ModelSource, bindings: DEMO458_BINDINGS },
  lamborghini: { make: "Lamborghini", model: "Centenario", source: { type: "url", url: LAMBO_URL, tune: tuneLambo } as ModelSource, bindings: LAMBO_BINDINGS },
} as const;
type CarId = keyof typeof CARS;
const TABS: { id: CarId; make: string; model: string }[] = [
  { id: "ferrari488", make: "Ferrari", model: "488 GTB · 360°" },
  { id: "ferrari", make: "Ferrari", model: "458 · 360° model" },
  { id: "lamborghini", make: "Lamborghini", model: "Centenario · 360°" },
];
const NONE = new Set<string>();

export default function CarStage3D() {
  const [car, setCar] = useState<CarId>("ferrari488");
  const model = CARS[car];
  const t = useT();

  return (
    <div className="stage3d">
      <L className="car-tabs" role="tablist" aria-label="Choose a car">
        {TABS.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={car === tab.id} className="car-tab" onClick={() => setCar(tab.id)}>
            <b>{tab.make}</b><span><T>{tab.model}</T></span>
          </button>
        ))}
      </L>

      <div className="car-embed" role="tabpanel">
        <Viewer3D key={car} source={model.source} bindings={model.bindings} bare spin360 realistic scrollSafe labelLines={false}
          label={t("Interactive 3D model of a {name}. Drag to rotate, Ctrl and scroll to zoom.", { name: `${model.make} ${model.model}` })}
          highlighted={NONE} exploded={NONE} hidden={NONE} isolate={false} focusNonce={0} resetNonce={0}
          onPickMesh={() => {}} />
      </div>

      <div className="photo-card" role="status">
        <p className="photo-hint">
          <span className="hint-fine"><T>Drag to turn the car 360° · Ctrl + scroll to zoom</T></span>
          <span className="hint-coarse"><T>Swipe to turn · Pinch to zoom</T></span>
        </p>
      </div>
    </div>
  );
}
