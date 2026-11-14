"use client";
import { shortlist, useShortlist } from "@/lib/shortlist";

export function AddPart({ id, label, compact = false }: { id: number; label: string; compact?: boolean }) {
  const items = useShortlist();
  const ref = String(id);
  const inList = items.some((x) => x.kind === "part" && x.ref === ref);
  return (
    <button type="button" className={inList ? "btn" : "btn primary"} aria-label={compact ? `${inList ? "Remove from" : "Add to"} enquiry list: ${label}` : undefined}
      onClick={() => (inList ? shortlist.remove({ kind: "part", ref }) : shortlist.add({ kind: "part", ref, label }))}>
      {compact ? (inList ? "✓ Added" : "Enquire") : inList ? "✓ In enquiry list — remove" : "Enquire about this part"}
    </button>
  );
}
