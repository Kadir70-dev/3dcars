"use client";
// Full-screen, minimal view of the demo car: only the model plus Assemble /
// Disassemble. Clicking a part shows just that part and zooms to it; clicking
// empty space brings the whole car back.
import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { useModelState } from "@/components/ModelControls";
import { DEMO458_BINDINGS, DEMO458_GROUPS, DEMO458_URL, tuneDemo458 } from "@/lib/demo458";
import { selectionForMesh, type Selection } from "@/lib/explode";
import type { ModelSource } from "./Viewer3D";

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), { ssr: false, loading: () => <div className="viewer-canvas" /> });
const SOURCE: ModelSource = { type: "url", url: DEMO458_URL, tune: tuneDemo458 };
const NONE: Selection = { code: null, partId: null };
/** How many of the most recent parts keep a full-size name label while the car comes apart. */
const RECENT_LABELS = 10;

export default function FullscreenDemo() {
  const [sel, setSel] = useState<Selection>(NONE);
  const [recent, setRecent] = useState<string[]>([]);
  const m = useModelState(DEMO458_BINDINGS, sel);
  const labels = useMemo(
    () => Object.fromEntries(DEMO458_GROUPS.flatMap((g) => g.parts.map((p) => [p.meshName, p.name.replace(/^\d+ · /, "")]))),
    [],
  );
  const focus = useMemo(() => new Set(recent), [recent]);
  const out = m.level > 0;

  const onMoving = useCallback((name: string) => setRecent((r) => [...r.slice(1 - RECENT_LABELS), name]), []);
  const clear = () => { setSel(NONE); m.setIsolate(false); m.home(); };

  return (
    <div className="fs-demo">
      <Viewer3D source={SOURCE} bindings={DEMO458_BINDINGS} bare staggerMs={90}
        label="Community 3D model of a Ferrari 458 Italia (not the 488 GTB, not OEM data). Drag to rotate, scroll or pinch to zoom, click a part to inspect it."
        highlighted={m.highlighted} exploded={m.exploded} hidden={m.hidden} isolate={m.isolate}
        focusNonce={m.focusNonce} resetNonce={m.resetNonce}
        labels={labels} labelFocus={focus} onMoving={onMoving}
        onPickMesh={(name) => {
          const s = selectionForMesh(DEMO458_BINDINGS, name);
          if (s) { setSel(s); m.setIsolate(true); m.focus(); }
        }}
        onPickNothing={() => { if (sel.code !== null || m.isolate) clear(); }} />
      <div className="fs-actions" role="group" aria-label="Assembly">
        <button type="button" className="fs-btn" aria-pressed={!out} onClick={() => { if (sel.code !== null || m.isolate) clear(); setRecent([]); m.setLevel(0); }}>Assemble</button>
        <button type="button" className="fs-btn" aria-pressed={out} onClick={() => { if (sel.code !== null || m.isolate) clear(); setRecent([]); m.setLevel(m.steps.length); }}>Disassemble</button>
      </div>
    </div>
  );
}
