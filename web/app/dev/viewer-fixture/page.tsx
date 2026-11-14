import type { Metadata } from "next";
import Workbench from "@/components/Workbench";

export const metadata: Metadata = { title: "3D pipeline test fixture", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow">Developer test page</div>
        <h1>3D pipeline <em>fixture.</em></h1>
        <p>Abstract boxes and rings used to test rotate, zoom, selection and exploded view. <b>This is not a vehicle and not Ferrari geometry.</b>{" "}
          A licensed 488 GTB model plugs into the same viewer once approved.</p>
      </header>
      <Workbench preset="fixture" />
    </div>
  );
}
