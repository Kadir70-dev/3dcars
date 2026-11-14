import type { Metadata } from "next";
import FullscreenDemo from "@/components/FullscreenDemo";

// Model credit (CC BY 4.0) is on the Sources page and in /models/demo/ATTRIBUTION.txt.
export const metadata: Metadata = {
  title: "3D demo — community Ferrari 458 model",
  description: "Full-screen exploded-view demo using a community Ferrari 458 Italia model (CC BY 4.0). Not the 488 GTB and not OEM data.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <h1 className="sr-only">3D demo — community Ferrari 458 model (not the 488 GTB, not OEM data)</h1>
      <FullscreenDemo />
    </>
  );
}
