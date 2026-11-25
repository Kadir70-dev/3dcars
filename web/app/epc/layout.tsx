import "@/components/diagram-viewer.css";
export default function EpcLayout({ children }: { children: React.ReactNode }) {
  return <main className="wrap" style={{ padding: "32px 0 64px" }}>{children}</main>;
}
