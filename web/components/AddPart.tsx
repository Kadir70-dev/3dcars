"use client";
import { shortlist, useShortlist } from "@/lib/shortlist";
import { T, useT } from "@/lib/i18n";

export function AddPart({ id, label, compact = false }: { id: number; label: string; compact?: boolean }) {
  const items = useShortlist();
  const t = useT();
  const ref = String(id);
  const inList = items.some((x) => x.kind === "part" && x.ref === ref);
  return (
    <button type="button" className={inList ? "btn" : "btn primary"} aria-label={compact ? t(inList ? "Remove from enquiry list: {label}" : "Add to enquiry list: {label}", { label }) : undefined}
      onClick={() => (inList ? shortlist.remove({ kind: "part", ref }) : shortlist.add({ kind: "part", ref, label }))}>
      <T>{compact ? (inList ? "✓ Added" : "Enquire") : inList ? "✓ In enquiry list — remove" : "Enquire about this part"}</T>
    </button>
  );
}
