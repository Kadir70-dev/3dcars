import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api, ApiError, type Assembly, type VehicleDetail } from "@/lib/api";
import Explorer from "@/components/Explorer";
import { ApiDown } from "@/components/ApiDown";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ assembly?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  try {
    const v = await api<VehicleDetail>(`/vehicles/${slug}`);
    return {
      title: `${v.make} ${v.model} explorer`,
      description: `Browse ${v.counts.assemblies} ${v.make} ${v.model} assembly groups by vehicle system, with sources and verification status.`,
      alternates: { canonical: `/vehicles/${slug}` },
    };
  } catch {
    return { title: "Vehicle explorer" };
  }
}

export default async function VehiclePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { assembly } = await searchParams;
  let v: VehicleDetail, list: Assembly[];
  try {
    [v, { assemblies: list }] = await Promise.all([
      api<VehicleDetail>(`/vehicles/${slug}`),
      api<{ assemblies: Assembly[] }>(`/vehicles/${slug}/assemblies`),
    ]);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    return <ApiDown />;
  }
  const initial = assembly && list.some((a) => a.code === assembly) ? assembly : null;
  return (
    <div className="wrap">
      <div className="explorer-head">
        <div>
          <div className="eyebrow">{v.make} · {v.market ?? "All markets"} index</div>
          <h1 style={{ fontSize: "clamp(40px,5.5vw,72px)", marginTop: 12 }}>{v.model} <em>explorer</em></h1>
        </div>
        <p className="muted" style={{ maxWidth: 440, margin: 0 }}>
          Select a region of the car or any group below. Details, parts and sources update alongside.
          Drag to rotate and scroll to zoom when a licensed 3D model is available.
        </p>
      </div>
      <Explorer vehicle={v} assemblies={list} initialCode={initial} />
    </div>
  );
}
