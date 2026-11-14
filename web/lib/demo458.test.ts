import { describe, expect, it } from "vitest";
import { DEMO458_BINDINGS, DEMO458_GROUPS, DEMO458_SYSTEMS, DEMO_BATCH } from "./demo458";
import { EXTERIOR_MISSING, EXTERIOR_PARTS, EXTERIOR_SPLITS } from "./demo458Exterior";

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

  it("derives split rules only from listed exterior parts and carries no OEM data", () => {
    const ruled = EXTERIOR_PARTS.filter((p) => p.rule).length;
    expect(Object.values(EXTERIOR_SPLITS).flat()).toHaveLength(ruled);
    expect(EXTERIOR_PARTS.every((p) => !/\d{5,}/.test(p.name))).toBe(true);
    expect(EXTERIOR_MISSING.length).toBeGreaterThan(0);
  });
});
