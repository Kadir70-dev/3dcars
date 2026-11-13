"use client";
import { shortlist, useShortlist } from "@/lib/shortlist";

export function AddPart({ id, label }: { id: number; label: string }) {
  const items = useShortlist();
  const ref = String(id);
  const inList = items.some((x) => x.kind === "part" && x.ref === ref);
  return (
    <button type="button" className={inList ? "btn" : "btn primary"}
      onClick={() => (inList ? shortlist.remove({ kind: "part", ref }) : shortlist.add({ kind: "part", ref, label }))}>
      {inList ? "✓ In quote list — remove" : "Add part to quote list"}
    </button>
  );
}
