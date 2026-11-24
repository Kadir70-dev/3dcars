"use client";
// Home hero: one full-screen looping video (photo is the poster until it plays).
// The navbar is fully transparent over the video and turns solid once you scroll past it.
import { useEffect, useState } from "react";

export default function HomeVideo() {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => setPast(window.scrollY > window.innerHeight - 90);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.documentElement.toggleAttribute("data-past", past);
    return () => document.documentElement.removeAttribute("data-past");
  }, [past]);
  return (
    <section className="home-video" aria-label="Autovivo">
      {/* Inline: the CSS minifier rewrites backdrop-filter overrides incorrectly. */}
      {!past && <style>{"header.nav{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}"}</style>}
      <video autoPlay muted loop playsInline preload="auto" poster="/photos/ferrari-488-gtb.jpg">
        <source src="/videos/hero.mp4" type="video/mp4" />
      </video>
    </section>
  );
}
