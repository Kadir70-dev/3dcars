"use client";
// Gives every product image in the grid a gentle 3D tilt that follows the pointer.
// One delegated listener for the whole grid; off for touch and reduced motion.
import { useEffect, useRef } from "react";

export default function TiltGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const grid = ref.current!;
    if (window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    let active: HTMLElement | null = null, raf = 0;
    const reset = (el: HTMLElement | null) => { if (el) { el.style.removeProperty("--rx"); el.style.removeProperty("--ry"); el.style.removeProperty("--gx"); } };
    const move = (e: PointerEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>(".product");
      if (card !== active) { reset(active); active = card; }
      if (!card) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
        card.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
        card.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
      });
    };
    const leave = () => { reset(active); active = null; };
    grid.addEventListener("pointermove", move);
    grid.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); grid.removeEventListener("pointermove", move); grid.removeEventListener("pointerleave", leave); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
