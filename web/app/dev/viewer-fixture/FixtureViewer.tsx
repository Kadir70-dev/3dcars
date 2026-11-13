"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ModelControls, useModelState } from "@/components/ModelControls";
import { buildFixture, FIXTURE_BINDINGS, FIXTURE_GROUPS } from "@/lib/fixture";
import { selectionForMesh, type Selection } from "@/lib/explode";

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), { ssr: false, loading: () => <div className="viewer-canvas" /> });
const SOURCE = { type: "scene" as const, build: buildFixture };
const NONE: Selection = { code: null, partId: null };

export default function FixtureViewer() {
  const [sel, setSel] = useState<Selection>(NONE);
  const fromModel = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const m = useModelState(FIXTURE_BINDINGS, sel);

  const group = FIXTURE_GROUPS.find((g) => g.code === sel.code) ?? null;
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
        <h2 id="fx-viewer-h" className="sr-only">Fixture model</h2>
        <div className="viewer-tag"><span className="pill unverified">Test fixture · not a vehicle</span></div>
        <Viewer3D source={SOURCE} bindings={FIXTURE_BINDINGS} label="Abstract test fixture. Drag to rotate, scroll to zoom; use the list for keyboard selection."
          highlighted={m.highlighted} exploded={m.exploded} hidden={m.hidden} isolate={m.isolate}
          focusNonce={m.focusNonce} resetNonce={m.resetNonce}
          onPickMesh={(name) => { const s = selectionForMesh(FIXTURE_BINDINGS, name); if (s) { fromModel.current = true; setSel(s); } }} />
        <ModelControls m={m} selectionLabel={label} />
      </section>

      <aside className="card part-list" aria-labelledby="fx-list-h">
        <div className="part-list-head">
          <h2 id="fx-list-h">Test parts</h2>
          {sel.code && <button type="button" className="btn small" onClick={() => setSel(NONE)}>Clear selection</button>}
        </div>
        <div ref={listRef}>
          {FIXTURE_GROUPS.map((g) => {
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
        <p className="help">Test labels only — no OEM numbers, quantities or fitment. A licensed 488 GTB plugs into the same workbench.</p>
      </aside>
    </div>
  );
}
