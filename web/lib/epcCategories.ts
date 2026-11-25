// Autovivo-defined assembly categories. The Interactive Spares plate tree is flat (no categories),
// so these are editorial keyword rules over plate names - not a Ferrari classification.
const RULES: [string, RegExp][] = [
  ["Engine block & internals", /crankcase|crankshaft|piston|connecting|flywheel|cylinder|head|valve|camshaft|timing|balanc/i],
  ["Intake, exhaust & fuel", /intake|exhaust|manifold|fuel|throttle|injection|turbo|catalyt|silencer|air filter|blow-by/i],
  ["Lubrication & cooling", /lubric|oil|cooling|coolant|radiator|water|thermostat|heat exchanger|pump/i],
  ["Transmission & driveline", /gearbox|transmission|clutch|differential|driveshaft|axle|transaxle|gear/i],
  ["Brakes, steering & suspension", /brake|steering|suspension|damper|spring|wheel|hub|abs|caliper/i],
  ["Electrical & electronics", /electric|wiring|harness|ecu|sensor|battery|alternator|starter|lamp|light|switch|instrument|control unit|audio|display/i],
  ["Body, interior & trim", /body|door|bonnet|hood|bumper|seat|trim|panel|glass|window|roof|mirror|interior|carpet|dashboard|spoiler|cover|lid/i],
];
export const OTHER_CATEGORY = "Other assemblies";

export function categoryOf(name: string): string {
  const n = name.replace(/^\s*\d+\s*[-_]\s*/, "");
  return RULES.find(([, re]) => re.test(n))?.[0] ?? OTHER_CATEGORY;
}
export const CATEGORY_ORDER = [...RULES.map(([c]) => c), OTHER_CATEGORY];
export const displayName = (name: string) => name.replace(/^\s*\d+\s*[-_]\s*/, "").trim() || name;
