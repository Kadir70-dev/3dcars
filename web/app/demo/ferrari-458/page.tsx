import type { Metadata } from "next";
import Link from "next/link";
import Workbench from "@/components/Workbench";
import { DEMO458_ATTRIBUTION as A } from "@/lib/demo458";

export const metadata: Metadata = {
  title: "3D workbench demo — community Ferrari 458 model",
  description: "Interactive exploded-view demo using a community Ferrari 458 Italia model (CC BY 4.0). Not the 488 GTB and not OEM data.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow">3D workbench demo</div>
        <h1>Take it <em>apart.</em></h1>
        <p>Rotate, zoom, pick a part on the car or in the list, isolate it, hide it, and disassemble the car step by step.
          <b> This is a free community model of a Ferrari 458 Italia, not the 488 GTB</b>, and its groups come from the
          model’s own mesh names — not Ferrari part data. The licensed 488 GTB will use this same workbench.</p>
      </header>
      <Workbench preset="demo458" />
      <p className="help" style={{ marginTop: 16 }}>
        “<a href={A.sourceUrl} target="_blank" rel="noreferrer">{A.title}</a>” 3D model by {A.author}, licensed under{" "}
        <a href={A.licenseUrl} target="_blank" rel="noreferrer">{A.license}</a>, obtained via the{" "}
        <a href={A.via} target="_blank" rel="noreferrer">three.js examples</a> (licence checked {A.checked}). {A.changes}{" "}
        Ferrari is a trademark of Ferrari S.p.A.; this independent project is not affiliated with or endorsed by Ferrari.{" "}
        <Link href="/vehicles/ferrari-488-gtb">Back to the 488 GTB explorer →</Link>
      </p>
    </div>
  );
}
