// ORIGINAL placeholder diagram + DEMO rows for developing/testing the viewer.
// Not a Ferrari drawing; part numbers are fake ("DEMO-…"). Replaced by real data only after
// written reproduction authorization is on file.
import type { Callout, DiagramRow, DiagramSource } from "./diagramViewer";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
<rect width="800" height="520" fill="#f4f1ea"/>
<g fill="none" stroke="#2b2b30" stroke-width="2" stroke-linejoin="round">
<rect x="250" y="60" width="300" height="70" rx="8"/><rect x="290" y="75" width="220" height="40" rx="4"/>
<circle cx="400" cy="220" r="55"/><circle cx="400" cy="220" r="22"/>
<rect x="355" y="290" width="90" height="120" rx="6"/><path d="M355 330h90M355 370h90"/>
<ellipse cx="170" cy="250" rx="55" ry="24"/><ellipse cx="170" cy="250" rx="30" ry="12"/>
<rect x="590" y="190" width="110" height="60" rx="8"/><circle cx="615" cy="220" r="10"/><circle cx="675" cy="220" r="10"/>
<path d="M400 130v35M400 275v15M225 250h120M510 220h80" stroke-dasharray="6 5" stroke="#8a8a92"/>
<rect x="330" y="440" width="140" height="34" rx="4"/><path d="M345 440v34M455 440v34"/>
</g></svg>`;

export const PLACEHOLDER_DIAGRAM: DiagramSource = {
  src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  width: 800, height: 520,
  alt: "Original placeholder exploded diagram: cover, flange, housing, bushing, bracket and base plate",
};

export const PLACEHOLDER_CALLOUTS: Callout[] = [
  { ref: "1", x: 400, y: 95 }, { ref: "2", x: 400, y: 220 }, { ref: "3", x: 400, y: 350 },
  { ref: "4", x: 170, y: 250 }, { ref: "5", x: 645, y: 220 }, { ref: "6", x: 400, y: 457 },
];

const base = { currency: "EUR", models: ["DEMO MODEL A", "DEMO MODEL B"] };
export const PLACEHOLDER_ROWS: DiagramRow[] = [
  { ...base, ref: "1", partNumber: "DEMO-0001", description: "Demo cover plate", price: 125.5, quantity: 1, availability: "Available" },
  { ...base, ref: "2", partNumber: "DEMO-0002", description: "Demo flange", price: 48.9, quantity: 2, availability: "Available", specification: "M8 x 1.25" },
  { ...base, ref: "3", partNumber: "DEMO-0003", description: "Demo housing", price: 1480, quantity: 1, availability: "On order", supersededBy: "DEMO-0003B" },
  { ...base, ref: "4", partNumber: "DEMO-0004", description: "Demo bushing", price: 9.2, quantity: 4, availability: "Available" },
  { ...base, ref: "5", partNumber: "DEMO-0005", description: "Demo bracket", price: 0, quantity: 1, availability: null },
  { ...base, ref: "6", partNumber: "DEMO-0006", description: "Demo base plate", price: null, quantity: 1, availability: null },
];
