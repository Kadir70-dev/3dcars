import type { Metadata } from "next";
import FullscreenDemo from "@/components/FullscreenDemo";

// Model credit (CC BY 4.0) is on the Sources page and in /models/demo/ATTRIBUTION.txt.
export const metadata: Metadata = {
  title: "3D demo — community Lamborghini Centenario model",
  description: "Full-screen exploded-view demo using a community Lamborghini Centenario model (CC BY 4.0). Not OEM data.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <>
      <h1 className="sr-only">3D demo — community Lamborghini Centenario model (not OEM data)</h1>
      <FullscreenDemo preset="lamborghini" />
    </>
  );
}
