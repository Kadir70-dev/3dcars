import { describe, expect, it } from "vitest";
import { LAMBO_BATCH, LAMBO_BINDINGS, LAMBO_GROUPS, LAMBO_SPLITS } from "./demoLambo";

describe("Lamborghini demo data", () => {
  it("binds every part once, in steps of ten, with an explode offset", () => {
    const names = LAMBO_BINDINGS.map((b) => b.meshName);
    expect(new Set(names).size).toBe(names.length);
    LAMBO_GROUPS.slice(0, -1).forEach((g) => expect(g.parts).toHaveLength(LAMBO_BATCH));
    expect(LAMBO_BINDINGS.every((b) => b.explode && b.explode.some((v) => v !== 0))).toBe(true);
  });

  it("only splits named source meshes and carries no OEM numbers", () => {
    const split = Object.values(LAMBO_SPLITS).flat().map((r) => r.name);
    expect(split.every((n) => LAMBO_BINDINGS.some((b) => b.meshName === n))).toBe(true);
    expect(LAMBO_GROUPS.flatMap((g) => g.parts).every((p) => !/\d{5,}/.test(p.name))).toBe(true);
  });
});
