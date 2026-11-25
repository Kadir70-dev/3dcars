"use client";
// Catalogue filters: always visible on desktop; collapsible on tablet/phone.
import { useState } from "react";
import { T } from "@/lib/i18n";

export default function FilterPanel({ children, active }: { children: React.ReactNode; active: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn filter-toggle" aria-expanded={open} aria-controls="filters" onClick={() => setOpen((o) => !o)}>
        <T>Filters</T>{active > 0 ? ` (${active})` : ""}
      </button>
      <aside id="filters" className={open ? "filters open" : "filters"} aria-label="Filters">{children}</aside>
    </>
  );
}
