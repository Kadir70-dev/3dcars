"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ModelControls, useModelState } from "@/components/ModelControls";
import { buildFixture, FIXTURE_BINDINGS, FIXTURE_GROUPS } from "@/lib/fixture";
import { DEMO458_BINDINGS, DEMO458_GROUPS, DEMO458_URL, tuneDemo458 } from "@/lib/demo458";
import { selectionForMesh, type Selection } from "@/lib/explode";
import type { ModelSource } from "./Viewer3D";

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), { ssr: false, loading: () => <div className="viewer-canvas" /> });
const NONE: Selection = { code: null, partId: null };

// Presets live here because sources carry functions that cannot cross the server/client boundary.
const PRESETS = {
  fixture: {
    source: { type: "scene", build: buildFixture } as ModelSource, bindings: FIXTURE_BINDINGS, groups: FIXTURE_GROUPS,
    tag: "Test fixture · not a vehicle", listTitle: "Test parts",
    label: "Abstract test fixture. Drag to rotate, scroll to zoom; use the list for keyboard selection.",
    note: "Test labels only — no OEM numbers, quantities or fitment. A licensed 488 GTB plugs into the same workbench.",
  },
  demo458: {
    source: { type: "url", url: DEMO458_URL, tune: tuneDemo458 } as ModelSource, bindings: DEMO458_BINDINGS, groups: DEMO458_GROUPS,
    tag: "Community 458 Italia model · CC BY 4.0 · not the 488 GTB · not OEM", listTitle: "Demo groups",
    label: "Community 3D model of a Ferrari 458 Italia. Drag to rotate, scroll to zoom; use the list for keyboard selection.",
    note: "Groups come from the mesh names in this model; explode offsets are demo values. No OEM numbers, quantities or fitment.",
  },
} as const;

export default function Workbench({ preset }: { preset: keyof typeof PRESETS }) {
  const { source, bindings, groups, tag, listTitle, label: viewerLabel, note } = PRESETS[preset];
  const [sel, setSel] = useState<Selection>(NONE);
  const fromModel = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const m = useModelState(bindings, sel);

  const group = groups.find((g) => g.code === sel.code) ?? null;
  const part = group?.parts.find((p) => p.id === sel.partId) ?? null;
  const label = part ? `${part.name} (${group!.code})` : group ? `${group.code} · ${group.name}` : null;

  // A pick in the model scrolls the matching listing into view.
  useEffect(() => {
    if (!fromModel.current) return;
    fromModel.current = false;
    listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [sel]);

  return (
    <div className="workbench">
      <section className="card viewer" aria-labelledby="fx-viewer-h">
        <h2 id="fx-viewer-h" className="sr-only">3D model</h2>
        <div className="viewer-tag"><span className="pill unverified">{tag}</span></div>
        <Viewer3D source={source} bindings={bindings} label={viewerLabel}
          highlighted={m.highlighted} exploded={m.exploded} hidden={m.hidden} isolate={m.isolate}
          focusNonce={m.focusNonce} resetNonce={m.resetNonce}
          onPickMesh={(name) => { const s = selectionForMesh(bindings, name); if (s) { fromModel.current = true; setSel(s); } }} />
        <ModelControls m={m} selectionLabel={label} />
      </section>

      <aside className="card part-list" aria-labelledby="fx-list-h">
        <div className="part-list-head">
          <h2 id="fx-list-h">{listTitle}</h2>
          {sel.code && <button type="button" className="btn small" onClick={() => setSel(NONE)}>Clear selection</button>}
        </div>
        <div ref={listRef}>
          {groups.map((g) => {
            const gOn = sel.code === g.code && sel.partId === null;
            return (
              <div className="pl-group" key={g.code}>
                <button type="button" className="pl-assembly" aria-current={gOn} onClick={() => setSel({ code: g.code, partId: null })}>
                  <span className="gcode">{g.code}</span><span>{g.name}</span><span className="muted">{g.parts.length}</span>
                </button>
                <ul>
                  {g.parts.map((p) => {
                    const on = sel.partId === p.id;
                    const hidden = m.hidden.has(p.meshName);
                    return (
                      <li key={p.id}>
                        <button type="button" className="pl-part" aria-current={on} onClick={() => setSel({ code: g.code, partId: p.id })}>
                          <span>{p.name}</span>
                          <span className="mono muted">{hidden ? "hidden" : p.meshName}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="help">{note}</p>
      </aside>
    </div>
  );
}
