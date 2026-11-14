import type { Metadata } from "next";
import AdminApp from "@/components/admin/AdminApp";
import { STATIC_DATA } from "@/lib/api";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="wrap">
      <header className="page-head">
        <div className="eyebrow">Catalogue CMS</div>
        <h1>Admin</h1>
        <p>Manage vehicles, assemblies, parts, specifications, sources, fitment and licensed 3D assets. The server refuses “verified”
          status without an authorized or licensed source, and hides 3D assets until their licence is verified and approved.</p>
      </header>
      {STATIC_DATA
        ? <p className="err-box">This preview is a static snapshot without the catalogue server, so the admin is not available here.</p>
        : <AdminApp />}
    </div>
  );
}
