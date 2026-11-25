import { describe, expect, it } from "vitest";
import { categoryOf, displayName, OTHER_CATEGORY } from "./epcCategories";

describe("epc categories", () => {
  it("maps plate names to editorial categories", () => {
    expect(categoryOf("008-Pistons And Connecting Rods")).toBe("Engine block & internals");
    expect(categoryOf("023-Lubrication System - Tank")).toBe("Lubrication & cooling");
    expect(categoryOf("021-Exhaust System")).toBe("Intake, exhaust & fuel");
    expect(categoryOf("~Crankcase")).toBe("Engine block & internals");
  });
  it("falls back to Other and strips the plate number prefix", () => {
    expect(categoryOf("999-Zzz Widget")).toBe(OTHER_CATEGORY);
    expect(displayName("005-Engine Suspension")).toBe("Engine Suspension");
    expect(displayName("~Crankcase")).toBe("~Crankcase");
  });
});
