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
    <>
      <h1 className="sr-only">{v.make} {v.model} explorer</h1>
      <Explorer vehicle={v} assemblies={list} initialCode={initial} />
    </>
  );
}
