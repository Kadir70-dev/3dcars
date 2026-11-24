"use client";
// Black intro screen: centred logo with loading lines; fades out once the page has loaded (min 1.8s).
import { useEffect, useState } from "react";

const MIN_MS = 1800;

export default function Splash() {
  const [gone, setGone] = useState(false);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    const start = performance.now();
    let t1 = 0, t2 = 0;
    const finish = () => {
      t1 = window.setTimeout(() => { setFade(true); t2 = window.setTimeout(() => setGone(true), 700); }, Math.max(0, MIN_MS - (performance.now() - start)));
    };
    if (document.readyState === "complete") finish(); else window.addEventListener("load", finish, { once: true });
    document.documentElement.classList.add("splash-on");
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener("load", finish); };
  }, []);
  useEffect(() => { if (gone) document.documentElement.classList.remove("splash-on"); }, [gone]);
  if (gone) return null;
  return (
    <div className={fade ? "splash splash-out" : "splash"} role="status" aria-label="Loading Autovivo">
      <div className="splash-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/autovivo/logo.png" alt="Autovivo" width={132} height={132} />
        <span className="splash-ring" />
      </div>
      <div className="splash-brand">AUTOVIVO</div>
      <div className="splash-lines" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    </div>
  );
}
