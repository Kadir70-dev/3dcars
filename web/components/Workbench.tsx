"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ModelControls, useModelState } from "@/components/ModelControls";
import { PartInspector } from "@/components/PartInspector";
import { buildFixture, FIXTURE_BINDINGS, FIXTURE_GROUPS } from "@/lib/fixture";
import { buildEngineConcept, ENGINE_BINDINGS, ENGINE_GROUPS, ENGINE_SYSTEMS } from "@/lib/engineDemo";
import { DEMO458_BINDINGS, DEMO458_GROUPS, DEMO458_SYSTEMS, DEMO458_URL, tuneDemo458 } from "@/lib/demo458";
import { selectionForMesh, type Selection } from "@/lib/explode";
import type { MeshStats, ModelSource } from "./Viewer3D";

const Viewer3D = dynamic(() => import("@/components/Viewer3D"), { ssr: false, loading: () => <div className="viewer-canvas" /> });
const NONE: Selection = { code: null, partId: null };

// Presets live here because sources carry functions that cannot cross the server/client boundary.
const PRESETS = {
  fixture: {
    source: { type: "scene", build: buildFixture } as ModelSource, bindings: FIXTURE_BINDINGS, groups: FIXTURE_GROUPS,
    systems: [] as { code: string; name: string }[],
    tag: "Test fixture · not a vehicle", listTitle: "Test parts",
    label: "Abstract test fixture. Drag to rotate, scroll to zoom; use the list for keyboard selection.",
    note: "Test labels only — no OEM numbers, quantities or fitment. A licensed 488 GTB plugs into the same workbench.",
    inspectNote: "Abstract test shape.",
  },
  demo458: {
    source: { type: "url", url: DEMO458_URL, tune: tuneDemo458 } as ModelSource, bindings: DEMO458_BINDINGS, groups: DEMO458_GROUPS,
    systems: DEMO458_SYSTEMS,
    tag: "Community 458 Italia model · CC BY 4.0 · not the 488 GTB · not OEM", listTitle: "Parts in disassembly order",
    label: "Community 3D model of a Ferrari 458 Italia. Drag to rotate, scroll to zoom; use the list for keyboard selection.",
    note: "Exterior and interior components are the model’s own separate geometry pieces, named by where they sit in the car. Order, steps of 10 and offsets are a demo — no OEM numbers, quantities or fitment.",
    inspectNote: "Identified by its position in this community model; not a Ferrari part name or number.",
  },
  engineConcept: {
    source: { type: "scene", build: buildEngineConcept } as ModelSource, bindings: ENGINE_BINDINGS, groups: ENGINE_GROUPS,
    systems: ENGINE_SYSTEMS,
    tag: "Procedural V8 concept · illustrative geometry · not OEM data", listTitle: "Concept components",
    label: "Illustrative procedural V8 engine assembly. Drag to rotate, scroll to zoom, and select components to inspect the concept model.",
    note: "Generated from Three.js primitives for interaction design. Component names are generic; geometry, arrangement, disassembly order, and offsets are illustrative—not Ferrari or Lamborghini specifications, fitment, or factory data.",
    inspectNote: "Procedural concept component; not a manufacturer part number, specification, or fitment record.",
  },
} as const;

export default function Workbench({ preset }: { preset: keyof typeof PRESETS }) {
  const { source, bindings, groups, systems, tag, listTitle, label: viewerLabel, note, inspectNote } = PRESETS[preset];
  const [sel, setSel] = useState<Selection>(NONE);
  const [system, setSystem] = useState<string | null>(null);
  const [clickIsolate, setClickIsolate] = useState(false);
  const [stats, setStats] = useState<Record<string, MeshStats>>({});
  const fromModel = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const parts = useMemo(() => groups.flatMap((g, gi) => g.parts.map((p) => ({ ...p, group: g.code, step: gi + 1 }))), [groups]);
  const systemMeshes = useMemo(() => (system ? new Set(parts.filter((p) => p.system === system).map((p) => p.meshName)) : null), [parts, system]);
  const m = useModelState(bindings, sel, systemMeshes);
  const [showAll, setShowAll] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const labels = useMemo(() => Object.fromEntries(parts.map((p) => [p.meshName, p.name])), [parts]);
  const systemName = useCallback((code?: string) => systems.find((s) => s.code === code)?.name ?? null, [systems]);
  // The list follows the part that is currently coming out.
  const onMoving = useCallback((name: string) => {
    setMoving(name);
    listRef.current?.querySelector(`[data-mesh="${CSS.escape(name)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);

  const select = (s: Selection) => { setSel(s); if (clickIsolate && (s.partId !== null || s.code)) m.setIsolate(true); };
  // A part chosen in the list is shown on its own and the camera zooms to it.
  const solo = (s: Selection) => { setSel(s); m.setIsolate(true); m.focus(); };
  const clearAll = () => { setSel(NONE); setSystem(null); m.setIsolate(false); m.home(); };
  const chooseSystem = (code: string | null) => {
    setSystem(code); setSel(NONE);
    if (clickIsolate) m.setIsolate(Boolean(code));
  };

  const group = groups.find((g) => g.code === sel.code) ?? null;
  const part = parts.find((p) => p.id === sel.partId) ?? null;
  const label = part ? part.name : group ? `${group.code} · ${group.name}` : system ? `${systemName(system)} (system)` : null;

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
          labels={labels} labelFocus={m.current} showAllLabels={showAll} onMoving={onMoving} onStats={setStats}
          onPickMesh={(name) => { const s = selectionForMesh(bindings, name); if (s) { fromModel.current = true; select(s); } }} />
        <ModelControls m={m} selectionLabel={label} />
        <PartInspector m={m} note={inspectNote} stats={part ? stats[part.meshName] : undefined}
          target={part ? { name: part.name, meshName: part.meshName, systemName: systemName(part.system), step: part.step, order: part.id } : null}
          onClear={clearAll} />
      </section>

      <aside className="card part-list" aria-labelledby="fx-list-h">
        <div className="part-list-head">
          <h2 id="fx-list-h">{listTitle}</h2>
          {(sel.code || system) && <button type="button" className="btn small" onClick={clearAll}>Clear</button>}
        </div>
        {systems.length > 0 && (
          <div className="system-chips" role="group" aria-label="Filter by vehicle system">
            <button type="button" className="chip" aria-pressed={system === null} onClick={() => chooseSystem(null)}>All ({parts.length})</button>
            {systems.map((s) => (
              <button key={s.code} type="button" className="chip" aria-pressed={system === s.code} onClick={() => chooseSystem(system === s.code ? null : s.code)}>
                {s.name} ({parts.filter((p) => p.system === s.code).length})
              </button>
            ))}
          </div>
        )}
        <label className="mc-check pl-toggle">
          <input type="checkbox" checked={clickIsolate} onChange={(e) => setClickIsolate(e.target.checked)} />
          Isolate on click
        </label>
        <label className="mc-check pl-toggle">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
          Show names of all parts that are out
        </label>
        <div ref={listRef}>
          {groups.map((g) => {
            const shown = g.parts.filter((p) => !system || p.system === system);
            if (shown.length === 0) return null;
            const gOn = sel.code === g.code && sel.partId === null;
            return (
              <div className="pl-group" key={g.code}>
                <button type="button" className="pl-assembly" aria-current={gOn} onClick={() => select({ code: g.code, partId: null })}>
                  <span className="gcode">{g.code}</span><span>{g.name}</span><span className="muted">{shown.length}</span>
                </button>
                <ul>
                  {shown.map((p) => {
                    const on = sel.partId === p.id;
                    const hidden = m.hidden.has(p.meshName);
                    const out = m.exploded.has(p.meshName);
                    const now = out && moving === p.meshName;
                    return (
                      <li key={p.id}>
                        <button type="button" className={`pl-part${now ? " is-moving" : ""}${out ? " is-out" : ""}`} data-mesh={p.meshName}
                          aria-current={on} onClick={() => solo({ code: g.code, partId: p.id })}>
                          <span>{p.name}</span>
                          <span className="mono muted">{hidden ? "hidden" : now ? "coming out" : out ? "out" : ""}</span>
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
