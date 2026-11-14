import { describe, expect, it } from "vitest";
import { modelWord, staticApi, StaticApiError } from "./staticApi";
import type { AssemblyDetail, PartDetail, StoreResponse, VehicleDetail } from "./api";

describe("static snapshot API", () => {
  it("serves the vehicle and its 95 assembly groups", async () => {
    const v = await staticApi<VehicleDetail>("/vehicles/ferrari-488-gtb");
    expect(v.counts.assemblies).toBe(95);
    const { assemblies } = await staticApi<{ assemblies: unknown[] }>("/vehicles/ferrari-488-gtb/assemblies?q=brake&system=chassis-brakes");
    expect(assemblies).toHaveLength(6); // same answer as the Go integration test
    const d = await staticApi<AssemblyDetail>("/vehicles/ferrari-488-gtb/assemblies/0042");
    expect(d.code).toBe("0042");
  });

  it("filters the store like the Go API (brand, model, search, paging)", async () => {
    const all = await staticApi<StoreResponse>("/store-parts");
    expect(all.result.total).toBe(482);
    expect(all.result.brands).toEqual({ Ferrari: 300, Lamborghini: 138, Maserati: 44 });
    expect(all.result.parts).toHaveLength(48);
    const cent = await staticApi<StoreResponse>("/store-parts?brand=Lamborghini&model=CENTENARIO");
    expect(cent.result.total).toBe(27);
    const hit = await staticApi<StoreResponse>("/store-parts?q=329267");
    expect(hit.result.parts.map((p) => p.oemPartNumber)).toEqual(["329267"]);
    expect(all.result.parts.every((p) => p.provenance.verificationStatus !== "verified")).toBe(true);
  });

  it("rejects bad input and unknown paths with the API's status codes", async () => {
    await expect(staticApi("/store-parts?brand=Porsche")).rejects.toMatchObject({ status: 400 });
    await expect(staticApi("/store-parts?page=0")).rejects.toMatchObject({ status: 400 });
    await expect(staticApi("/parts/999999")).rejects.toBeInstanceOf(StaticApiError);
    await expect(staticApi("/admin/me")).rejects.toMatchObject({ status: 404 });
  });

  it("serves part pages with listing data", async () => {
    const hit = await staticApi<StoreResponse>("/store-parts?q=329267");
    const part = await staticApi<PartDetail>(`/parts/${hit.result.parts[0].id}`);
    expect(part.listingUrl).toMatch(/^https:\/\/autovivo\.it\//);
  });

  it("extracts model words the same way as the Go store", () => {
    expect(modelWord("Ferrari", "FERRARI 488 GTB (USA)")).toBe("488");
    expect(modelWord("Lamborghini", "2016 Hurancan LP610")).toBe("HURANCAN");
    expect(modelWord("Ferrari", "(EUROPE)")).toBe("");
    expect(modelWord("Ferrari", "UP TO 2016")).toBe("");
  });
});
