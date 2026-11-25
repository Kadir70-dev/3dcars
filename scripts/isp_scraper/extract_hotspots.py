"""Extract numbered-callout hotspot coordinates from an AUTHORIZED local diagram SVG.
Offline only (no portal access). Finds <text>/<tspan> elements whose content is a reference number
(matching the assembly's known ref numbers) and returns centre points normalised to the viewBox,
following simple translate()/matrix() transforms on ancestor groups. Anything it cannot place is
reported, never guessed. Output: {"width","height","callouts":[{"ref","x","y"}],"unplaced":[...]}"""
import json, re, sys
import xml.etree.ElementTree as ET
from pathlib import Path

NUM = r"-?\d+(?:\.\d+)?"


def local(tag): return tag.rsplit("}", 1)[-1]


def parse_transform(s):
    """Return affine (a,b,c,d,e,f) for translate/scale/matrix lists; None if unsupported (rotate/skew)."""
    m = (1, 0, 0, 1, 0, 0)
    for name, args in re.findall(r"(\w+)\s*\(([^)]*)\)", s or ""):
        v = [float(x) for x in re.findall(NUM, args)]
        if name == "translate": t = (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0)
        elif name == "scale": t = (v[0], 0, 0, v[1] if len(v) > 1 else v[0], 0, 0)
        elif name == "matrix" and len(v) == 6: t = tuple(v)
        else: return None
        a, b, c, d, e, f = m; A, B, C, D, E_, F = t
        m = (a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E_ + c * F + e, b * E_ + d * F + f)
    return m


def apply(m, x, y): return (m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5])
def mul(p, q):
    a, b, c, d, e, f = p; A, B, C, D, E_, F = q
    return (a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E_ + c * F + e, b * E_ + d * F + f)


def extract(svg_text, known_refs=None):
    root = ET.fromstring(svg_text)
    vb = [float(x) for x in re.findall(NUM, root.get("viewBox", ""))]
    if len(vb) != 4:
        w, h = (float(re.findall(NUM, root.get(k, "0"))[0]) if re.findall(NUM, root.get(k, "")) else 0 for k in ("width", "height"))
        vb = [0, 0, w, h]
    if vb[2] <= 0 or vb[3] <= 0: raise ValueError("diagram has no usable size")
    found, unplaced = {}, []

    def walk(el, m):
        t = parse_transform(el.get("transform")) if el.get("transform") else (1, 0, 0, 1, 0, 0)
        if t is None: unplaced.append(f"unsupported transform on <{local(el.tag)}>"); return
        m = mul(m, t)
        if local(el.tag) == "text":
            label = "".join(el.itertext()).strip()
            if re.fullmatch(r"\d{1,3}[A-Za-z]?", label) and (known_refs is None or label in known_refs):
                try:
                    x = float(re.findall(NUM, el.get("x", "") or "")[0]); y = float(re.findall(NUM, el.get("y", "") or "")[0])
                except IndexError:
                    unplaced.append(f"ref {label}: text has no x/y"); return
                px, py = apply(m, x, y)
                found.setdefault(label, (round(px - vb[0], 2), round(py - vb[1], 2)))
            return
        for ch in el: walk(ch, m)
    walk(root, (1, 0, 0, 1, 0, 0))
    if known_refs: unplaced += [f"ref {r}: not found in diagram" for r in sorted(set(known_refs) - set(found))]
    return {"width": vb[2], "height": vb[3], "callouts": [{"ref": r, "x": x, "y": y} for r, (x, y) in found.items()], "unplaced": unplaced}


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit("usage: extract_hotspots.py diagram.svg [ref,ref,...]")
    refs = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
    print(json.dumps(extract(Path(sys.argv[1]).read_text(), refs), indent=1))
