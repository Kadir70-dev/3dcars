import type { Metadata } from "next";
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
    </div>
  );
}
