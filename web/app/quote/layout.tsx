import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enquiry list",
  description: "Request a manual quote for Ferrari 488 GTB assemblies or parts. No prices or checkout.",
  robots: { index: false },
};

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
