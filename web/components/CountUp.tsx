"use client";
import { useEffect, useRef, useState } from "react";

/** A number that counts up from 1 to `value` the first time it scrolls into view.
 *  Server render and reduced-motion show the final value, so nothing is ever blank or wrong without JS. */
export default function CountUp({ value, suffix = "", duration = 1700 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || value <= 1 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const start = () => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 4); // fast start, soft landing
        setShown(Math.max(1, Math.round(1 + (value - 1) * eased)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) { setShown(1); start(); return () => cancelAnimationFrame(raf); }
    if (r.bottom <= 0) return; // already scrolled past (e.g. restored scroll position): keep the final value
    setShown(1);
    // Fires when it enters the viewport, or if it ends up above it without ever being seen: then just show the final value.
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { io.disconnect(); start(); }
      else if (e.boundingClientRect.bottom <= 0) { io.disconnect(); setShown(value); }
    }, { threshold: 0.4 });
    io.observe(el);
    // A jump (anchor link, scroll restore) can skip past without ever intersecting, which fires no observer event.
    const onScroll = () => { if (el.getBoundingClientRect().bottom <= 0) { io.disconnect(); setShown(value); removeEventListener("scroll", onScroll); } };
    addEventListener("scroll", onScroll, { passive: true });
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [value, duration]);

  return <span ref={ref} className="count-up">{shown.toLocaleString("en-US")}{suffix}</span>;
}
