"use client";
// Original illustrative side-view schematic carried over from the prototype.
// It is NOT Ferrari geometry or an OEM drawing; regions are navigation shortcuts
// to assembly groups chosen by this project.

export const SCHEMATIC_REGIONS = [
  { id: "body", label: "Body & panels", code: "0100" },
  { id: "engine", label: "Powertrain", code: "0001" },
  { id: "front", label: "Front structure", code: "0101" },
  { id: "rear", label: "Rear aero", code: "0118" },
  { id: "wheels", label: "Wheels", code: "0042" },
] as const;

interface Props {
  selected?: string | null;
  separated?: boolean;
  onSelect?: (code: string) => void;
  className?: string;
}

export function Schematic({ selected, separated, onSelect, className }: Props) {
  const region = (code: string) => ({
    className: "sch-part" + (selected === code ? " on" : ""),
    onClick: onSelect ? () => onSelect(code) : undefined,
    style: onSelect ? { cursor: "pointer" } : undefined,
  });
  const lift = (dy: number) => ({ transform: separated ? `translate(0px, ${dy}px)` : "none", transition: "transform .6s cubic-bezier(.2,.8,.2,1)" });
  return (
    <svg className={className} viewBox="0 0 700 290" role="img" aria-labelledby="sch-t sch-d">
      <title id="sch-t">Illustrative Ferrari 488 GTB side-view schematic</title>
      <desc id="sch-d">Original diagram for navigation only. Not factory geometry, not an OEM drawing and not a 3D model.</desc>
      <defs>
        <linearGradient id="sch-paint" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#e64a50" /><stop offset="1" stopColor="#8c2026" /></linearGradient>
        <style>{`.sch-part{transition:filter .2s,opacity .2s}.sch-part:hover{filter:brightness(1.25)}.sch-part.on{filter:drop-shadow(0 0 10px #d8b36b) brightness(1.15)}`}</style>
      </defs>
      <ellipse cx="350" cy="244" rx="270" ry="14" fill="#060707" />
      <g {...region("0100")} style={{ ...region("0100").style, ...lift(-26) }}>
        <path d="M72 205 Q98 177 153 172 L225 155 Q267 105 329 95 Q375 88 421 101 L479 128 L562 148 Q606 158 626 187 L639 210 L620 223 L85 224Z" fill="url(#sch-paint)" stroke="#ff8887" strokeWidth="2" />
        <path d="M236 156 Q273 111 329 102 Q374 97 414 111 L458 132 L401 133 L346 119 L301 126 L280 153Z" fill="#252e31" stroke="#e2aaa6" strokeWidth="2" />
        <path d="M414 111 478 132 548 152 484 154 457 136Z" fill="#252e31" stroke="#e2aaa6" strokeWidth="2" />
      </g>
      <g {...region("0001")} style={{ ...region("0001").style, ...lift(4) }}>
        <path d="M454 169h87l21 31h-99z" fill="#8b9690" stroke="#d8ddd7" strokeWidth="2" />
        <rect x="475" y="158" width="48" height="13" rx="4" fill="#c0c8c2" />
      </g>
      <g {...region("0101")} style={{ ...region("0101").style, ...lift(10) }}>
        <path d="M79 198 150 177l23 16-18 20H87Z" fill="#bec6c0" stroke="#f3f4ef" strokeWidth="2" />
      </g>
      <g {...region("0118")} style={{ ...region("0118").style, ...lift(-12) }}>
        <path d="M572 165 619 184l14 27h-52Z" fill="#d0d4cf" stroke="#fff" strokeWidth="2" />
      </g>
      <g {...region("0042")} style={{ ...region("0042").style, ...lift(18) }}>
        <g fill="#090a0b" stroke="#89928e" strokeWidth="5"><circle cx="213" cy="217" r="31" /><circle cx="542" cy="217" r="31" /></g>
        <g fill="#202526" stroke="#d8ddd7"><circle cx="213" cy="217" r="14" /><circle cx="542" cy="217" r="14" /></g>
      </g>
    </svg>
  );
}
