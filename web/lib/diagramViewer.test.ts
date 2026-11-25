import { describe, expect, it } from "vitest";
import { centerOn, clampTransform, formatPrice, IDENTITY, matchesQuery, zoomAt, type DiagramRow } from "./diagramViewer";

const row: DiagramRow = { ref: "12", partNumber: "313700-A", description: "Gasket, crankcase", price: 10, currency: "EUR", quantity: 2 };

describe("diagramViewer helpers", () => {
  it("zoomAt keeps the focal point fixed and clamps zoom", () => {
    const t = zoomAt(IDENTITY, 2, 200, 100, 400, 300);
    expect(t.k).toBe(2);
    expect((200 - t.x) / t.k).toBeCloseTo(200); // content point under cursor unchanged
    expect(zoomAt(IDENTITY, 100, 0, 0, 400, 300).k).toBe(8);
    expect(zoomAt(IDENTITY, 0.01, 0, 0, 400, 300).k).toBe(1);
  });
  it("clampTransform never exposes empty space", () => {
    expect(clampTransform({ k: 2, x: 50, y: 50 }, 400, 300)).toEqual({ k: 2, x: 0, y: 0 });
    expect(clampTransform({ k: 2, x: -999, y: -999 }, 400, 300)).toEqual({ k: 2, x: -400, y: -300 });
  });
  it("centerOn targets a diagram point", () => {
    const t = centerOn({ k: 4, x: 0, y: 0 }, 0.5, 0.5, 400, 300);
    expect(t.x).toBe(-600); expect(t.y).toBe(-450);
  });
  it("search matches OEM number ignoring punctuation, description and exact ref", () => {
    expect(matchesQuery(row, "3137 00a")).toBe(true);
    expect(matchesQuery(row, "gasket")).toBe(true);
    expect(matchesQuery(row, "12")).toBe(true);
    expect(matchesQuery(row, "99")).toBe(false);
    expect(matchesQuery(row, "")).toBe(true);
  });
  it("formats EUR and never invents a price", () => {
    expect(formatPrice(null)).toBe("Request Price");
    expect(formatPrice(0)).toBe("Request Price");
    expect(formatPrice(7572.99)).toContain("7,572.99");
  });
});
