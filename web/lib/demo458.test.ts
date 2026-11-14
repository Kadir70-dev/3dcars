import { describe, expect, it } from "vitest";
import { DEMO458_BINDINGS, DEMO458_GROUPS, DEMO458_SPLITS, DEMO458_SYSTEMS, DEMO_BATCH } from "./demo458";
import { EXTERIOR_MISSING, EXTERIOR_PARTS } from "./demo458Exterior";
import { EXTERIOR_FROM_INTERIOR_AUDIT, INTERIOR_MISSING, INTERIOR_PARTS } from "./demo458Interior";

describe("458 demo data", () => {
  it("binds every mesh once, in steps of ten", () => {
    const names = DEMO458_BINDINGS.map((b) => b.meshName);
    expect(new Set(names).size).toBe(names.length);
    DEMO458_GROUPS.slice(0, -1).forEach((g) => expect(g.parts).toHaveLength(DEMO_BATCH));
    DEMO458_BINDINGS.forEach((b, i) => expect(b.explodeStep).toBe(Math.floor(i / DEMO_BATCH) + 1));
  });

  it("puts exterior components first and gives every part a known system", () => {
    const codes = new Set(DEMO458_SYSTEMS.map((s) => s.code));
    const parts = DEMO458_GROUPS.flatMap((g) => g.parts);
    parts.forEach((p) => expect(codes.has(p.system!)).toBe(true));
    expect(parts.slice(0, EXTERIOR_PARTS.length).every((p) => p.system!.startsWith("EXT-"))).toBe(true);
  });

  it("derives split rules only from listed components and carries no OEM data", () => {
    const all = [...EXTERIOR_PARTS, ...EXTERIOR_FROM_INTERIOR_AUDIT, ...INTERIOR_PARTS];
    expect(Object.values(DEMO458_SPLITS).flat()).toHaveLength(all.filter((p) => p.rule).length);
    expect(all.every((p) => !/\d{5,}/.test(p.name))).toBe(true);
    expect(EXTERIOR_MISSING.length).toBeGreaterThan(0);
    expect(INTERIOR_MISSING.length).toBeGreaterThan(0);
  });

  it("orders exterior, then wheels and steering, then interior, then unmapped pieces", () => {
    const sys = DEMO458_GROUPS.flatMap((g) => g.parts.map((p) => p.system!));
    const firstInterior = sys.findIndex((s) => s.startsWith("INT-") || s === "STRUCT");
    expect(sys.slice(0, firstInterior).every((s) => s.startsWith("EXT-") || s === "WHEELS" || s === "STEER")).toBe(true);
    expect(sys.slice(sys.indexOf("OTHER")).every((s) => s === "OTHER")).toBe(true);
  });
});
