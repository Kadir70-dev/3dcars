import type { Metadata } from "next";
import Image from "next/image";
import Workbench from "@/components/Workbench";

export const metadata: Metadata = {
  title: "Maserati-inspired GT 3D concept explorer",
  description: "An original Maserati-inspired procedural GT coupe concept with selectable parts and exploded-view controls. Not OEM geometry.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="wrap demo-page">
      <header className="page-head">
        <div className="eyebrow">Interactive concept · generated in code</div>
        <h1>Maserati GT <em>concept.</em></h1>
        <p>
          Explore an original Italian GT-inspired coupe with selectable body, glass, lighting, wheels, and rear details.
          This procedural demo is not an exact Maserati production car or OEM parts reference.
        </p>
        <p><a className="btn small" href="/models/demo/maserati-gt-concept-procedural.glb" download>Download 3D model (.glb)</a></p>
      </header>
      <Workbench preset="maseratiConcept" />

      <section className="concept-gallery" aria-labelledby="maserati-reference-title">
        <div className="section-head">
          <div>
            <div className="eyebrow">Generated visual references</div>
            <h2 id="maserati-reference-title">Design views &amp; assemblies</h2>
          </div>
          <p>Reference artwork supports the interactive procedural 3D concept above; it is not an OEM parts diagram.</p>
        </div>
        <div className="concept-gallery-grid">
          <figure className="concept-visual-card">
            <span className="concept-badge">AI concept art · not OEM</span>
            <Image src="/images/maserati-concept/hero.webp" alt="Deep blue Italian GT coupe concept, front three-quarter studio view" width={1672} height={941} priority />
            <figcaption><strong>01 / Exterior</strong><span>Front three-quarter concept view</span></figcaption>
          </figure>
          <figure className="concept-visual-card">
            <span className="concept-badge">AI concept art · not OEM</span>
            <Image src="/images/maserati-concept/turntable.webp" alt="Blue GT coupe concept shown from multiple angles in a studio turntable sheet" width={2172} height={724} />
            <figcaption><strong>02 / Turntable</strong><span>Multi-angle visual reference sheet</span></figcaption>
          </figure>
          <figure className="concept-visual-card">
            <span className="concept-badge">AI concept art · not OEM</span>
            <Image src="/images/maserati-concept/exploded-parts.webp" alt="Illustrative exploded view of major GT coupe assemblies, including body, engine, chassis, suspension, wheels, and interior" width={1672} height={941} />
            <figcaption><strong>03 / Major assemblies</strong><span>Illustrative exploded parts overview</span></figcaption>
          </figure>
        </div>
        <p className="concept-gallery-note">All three images are original AI-generated concept artwork. The 3D viewer uses procedural Three.js geometry, not reconstructed factory CAD or model-specific Maserati parts data.</p>
      </section>
    </div>
  );
}
