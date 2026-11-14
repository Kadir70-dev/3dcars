"use client";
// Shared state + controls for the 3D workbench: step-by-step disassembly,
// isolate, hide/show and reset. Used by the vehicle explorer (once a licensed
// asset exists) and by the abstract developer fixture.
import { useCallback, useMemo, useState } from "react";
import type { MeshBinding } from "@/lib/api";
import { explodedMeshes, explodeSteps, meshesAtStep, meshesForSelection, type Selection } from "@/lib/explode";

/** `override` highlights a custom set (e.g. a whole vehicle system) when no single part is selected. */
export function useModelState(bindings: MeshBinding[], sel: Selection, override: Set<string> | null = null) {
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [isolate, setIsolate] = useState(false);
  const [level, setLevel] = useState(0);
  const [onlySelection, setOnlySelection] = useState(false);
  const [focusNonce, setFocusNonce] = useState(0);
  const [resetNonce, setResetNonce] = useState(0);

  const steps = useMemo(() => explodeSteps(bindings), [bindings]);
  const highlighted = useMemo(
    () => (override && sel.partId === null ? override : meshesForSelection(bindings, sel)),
    [bindings, sel, override],
  );
  const exploded = useMemo(
    () => explodedMeshes(bindings, level, onlySelection ? highlighted : null),
    [bindings, level, onlySelection, highlighted],
  );
  const movable = useMemo(() => bindings.filter((b) => b.explode).length, [bindings]);
  const current = useMemo(() => meshesAtStep(bindings, level), [bindings, level]);
  const selectionHidden = highlighted.size > 0 && [...highlighted].every((n) => hidden.has(n));

  const toggleHidden = useCallback(() => {
    setHidden((h) => {
      const next = new Set(h);
      const allHidden = [...highlighted].every((n) => h.has(n));
      for (const n of highlighted) if (allHidden) next.delete(n); else next.add(n);
      return next;
    });
  }, [highlighted]);

  const reset = useCallback(() => {
    setHidden(new Set());
    setIsolate(false);
    setLevel(0);
    setOnlySelection(false);
    setResetNonce((n) => n + 1);
  }, []);

  return {
    steps, level, setLevel, movable, current, onlySelection, setOnlySelection, isolate, setIsolate,
    hidden, showAll: () => setHidden(new Set()), toggleHidden, selectionHidden,
    highlighted, exploded, focus: () => setFocusNonce((n) => n + 1), focusNonce, resetNonce, reset,
  };
}

export type ModelState = ReturnType<typeof useModelState>;

export function ModelControls({ m, selectionLabel }: { m: ModelState; selectionLabel: string | null }) {
  const total = m.steps.length;
  const stepText = m.level === 0 ? "Assembled" : `Step ${m.level} of ${total}`;
  const next = () => m.setLevel(Math.min(total, m.level + 1));
  const hasSel = m.highlighted.size > 0;
  return (
    <div className="model-controls">
      <div className="mc-row" role="group" aria-label="Disassembly">
        <span className="mc-label">Disassembly</span>
        <div className="stepper">
          <button type="button" className="icon-btn" onClick={() => m.setLevel(Math.max(0, m.level - 1))} disabled={m.level === 0} aria-label="Previous step">‹</button>
          <span className="stepper-val" aria-live="polite">{total ? stepText : "No offsets recorded"}</span>
          <button type="button" className="icon-btn" onClick={next} disabled={m.level >= total} aria-label="Next step">›</button>
        </div>
        {total > 0 && (m.level < total
          ? <button type="button" className="btn small primary" onClick={next}>{m.level === 0 ? "Disassemble ▶" : "Next step ›"}</button>
          : <button type="button" className="btn small" onClick={() => m.setLevel(0)}>Reassemble</button>)}
        {total > 0 && <span className="mc-count">{m.exploded.size} / {m.movable} parts out</span>}
        <div className="segmented" role="group" aria-label="View mode">
          <button type="button" aria-pressed={m.level === 0} onClick={() => m.setLevel(0)}>Assembled</button>
          <button type="button" aria-pressed={total > 0 && m.level >= total} disabled={!total} onClick={() => m.setLevel(total)}>Exploded</button>
        </div>
        <label className="mc-check">
          <input type="checkbox" checked={m.onlySelection} onChange={(e) => m.setOnlySelection(e.target.checked)} disabled={!hasSel} />
          Selected assembly only
        </label>
      </div>
      <div className="mc-row" role="group" aria-label="Selection tools">
        <span className="mc-label">{selectionLabel ? <>Selected: <b>{selectionLabel}</b></> : "Nothing selected"}</span>
        <button type="button" className="btn small" aria-pressed={m.isolate} disabled={!hasSel} onClick={() => m.setIsolate(!m.isolate)}>Isolate</button>
        <button type="button" className="btn small" disabled={!hasSel} onClick={m.toggleHidden}>{m.selectionHidden ? "Show" : "Hide"}</button>
        <button type="button" className="btn small" disabled={!hasSel || m.selectionHidden} onClick={m.focus}>Frame</button>
        <button type="button" className="btn small" disabled={m.hidden.size === 0} onClick={m.showAll}>Show all{m.hidden.size ? ` (${m.hidden.size} hidden)` : ""}</button>
        <button type="button" className="btn small" onClick={m.reset}>Reset</button>
      </div>
    </div>
  );
}
