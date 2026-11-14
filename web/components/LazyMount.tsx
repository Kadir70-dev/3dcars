"use client";
// Mounts its children only once they come near the viewport (keeps heavy 3D off the initial load).
import { useEffect, useRef, useState } from "react";

export default function LazyMount({ children, minHeight }: { children: React.ReactNode; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ minHeight }}>{show ? children : null}</div>;
}
