"""Build the illustrated-catalogue tree, metadata, relational CSVs, mapping JSON and coverage report.
Read-only on data/interactive_spares_catalogue.sqlite. Downloads nothing (diagram URLs only)."""
import csv, json, re, sqlite3, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CAT = ROOT.parent.parent / "catalogue"
DB = ROOT / "data" / "interactive_spares_catalogue.sqlite"
EXPECTED = {"models": 55, "assemblies": 5909, "groups": 4}


def slug(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-") or "unnamed"


def uniq(seen, base):
    s, n = base, 2
    while s in seen: s, n = f"{base}-{n}", n + 1
    seen.add(s); return s


def main():
    conn = sqlite3.connect(f"file:{DB}?mode=ro", uri=True); conn.row_factory = sqlite3.Row
    for d in ("metadata", "exports", "diagrams"): (CAT / d).mkdir(parents=True, exist_ok=True)

    groups = {}
    vehicles = []
    for m in conn.execute("SELECT * FROM models ORDER BY group_name,name"):
        g = groups.setdefault(m["group_name"], {"slug": slug(m["group_name"]), "id": len(groups) + 1})
        vehicles.append({"vehicle_id": m["model_id"], "engine_group": m["group_name"], "group_slug": g["slug"],
                         "name": m["name"], "slug": slug(m["name"]), "source_url": m["url"]})
    vmap = {v["vehicle_id"]: v for v in vehicles}

    parts_by_asm = {}
    for r in conn.execute("""SELECT ap.*, p.description, p.uom FROM assembly_parts ap
                             LEFT JOIN parts p USING(part_number) ORDER BY assembly_id, CAST(position AS INTEGER), position"""):
        parts_by_asm.setdefault(r["assembly_id"], []).append(r)
    compat = {}
    for r in conn.execute("SELECT model_id,part_number FROM model_parts"):
        compat.setdefault(r["part_number"], []).append(vmap[r["model_id"]]["name"] if r["model_id"] in vmap else r["model_id"])

    assemblies, mapping, slugs = [], [], {}
    for a in conn.execute("SELECT * FROM assemblies ORDER BY model_id, plate_code"):
        v = vmap.get(a["model_id"])
        if not v: continue
        s = uniq(slugs.setdefault(a["model_id"], set()), slug(f'{a["number"] or a["plate_code"]}-{re.sub(r"^\s*\d+\s*[-_]\s*", "", a["name"] or "")}'))
        rel = f'diagrams/{v["group_slug"]}/{v["slug"]}/{s}'
        rows = parts_by_asm.get(a["assembly_id"], [])
        refs = [{
            "ref_no": r["position"], "oem_part_number": r["part_number"], "description": r["description"],
            "price": r["price"], "currency": r["currency"] or "EUR", "quantity": r["quantity"],
            "availability_flag": r["stock_flag"], "purchasable": r["purchasable"], "price_on_request": r["price_on_request"],
            "specification": r["specification"], "superseded_by": r["superseded_by"],
            "compatible_models": sorted(set(compat.get(r["part_number"], []))),
        } for r in rows]
        rec = {"assembly_id": a["assembly_id"], "vehicle": v["name"], "engine_group": v["engine_group"],
               "plate_code": a["plate_code"], "assembly_number": a["number"], "assembly_name": a["name"],
               "slug": s, "path": rel, "diagram_source_url": a["diagram_url"], "diagram_format": "svg",
               "diagram_file": None, "diagram_authorized": False, "source_url": a["source_url"],
               "reference_numbers": sorted({x["ref_no"] for x in refs if x["ref_no"]}, key=lambda t: (len(t), t)),
               "oem_part_numbers": sorted({x["oem_part_number"] for x in refs}), "references": refs}
        assemblies.append(rec)
        (CAT / rel).mkdir(parents=True, exist_ok=True)
        (CAT / rel / "metadata.json").write_text(json.dumps(rec, indent=1))
        mapping.append({k: rec[k] for k in ("assembly_id", "vehicle", "engine_group", "assembly_number", "assembly_name", "path", "references")})

    (CAT / "exports" / "diagram_part_mapping.json").write_text(json.dumps(mapping))
    (CAT / "metadata" / "vehicles.json").write_text(json.dumps(vehicles, indent=1))
    (CAT / "metadata" / "assemblies.json").write_text(json.dumps([{k: v for k, v in a.items() if k != "references"} for a in assemblies]))

    def dump(name, header, rows):
        with open(CAT / "metadata" / f"{name}.csv", "w", newline="") as f:
            w = csv.writer(f); w.writerow(header); w.writerows(rows)
    dump("engine_group", ["engine_group_id", "name", "slug"], [(g["id"], n, g["slug"]) for n, g in groups.items()])
    dump("vehicle", ["vehicle_id", "engine_group_id", "name", "slug", "source_url"],
         [(v["vehicle_id"], groups[v["engine_group"]]["id"], v["name"], v["slug"], v["source_url"]) for v in vehicles])
    dump("assembly", ["assembly_id", "vehicle_id", "plate_code", "assembly_number", "name", "slug", "source_url", "extracted_at"],
         [(a["assembly_id"], conn.execute("SELECT model_id FROM assemblies WHERE assembly_id=?", (a["assembly_id"],)).fetchone()[0],
           a["plate_code"], a["assembly_number"], a["assembly_name"], a["slug"], a["source_url"], None) for a in assemblies])
    dump("diagram", ["assembly_id", "source_url", "format", "local_path", "authorized"],
         [(a["assembly_id"], a["diagram_source_url"], "svg", "", "false") for a in assemblies])
    dump("part", ["part_number", "description", "uom", "image_url", "first_seen", "last_seen"],
         conn.execute("SELECT part_number,description,uom,image_url,first_seen,last_seen FROM parts"))
    dump("diagram_reference", ["assembly_id", "ref_no", "part_number", "quantity", "specification", "purchasable", "price_on_request", "availability_flag", "superseded_by"],
         conn.execute("SELECT DISTINCT assembly_id,position,part_number,quantity,specification,purchasable,price_on_request,stock_flag,superseded_by FROM assembly_parts"))
    dump("price", ["part_number", "amount", "currency", "source", "observed_at", "source_assembly"],
         [(r[0], r[1], r[2] or "EUR", "interactive_spares", r[3], r[4]) for r in conn.execute("SELECT part_number,price,currency,observed_at,source_assembly FROM price_history")])
    dump("vehicle_part", ["vehicle_id", "part_number"], conn.execute("SELECT model_id,part_number FROM model_parts"))

    q = lambda s: conn.execute(s).fetchone()[0]
    done = q("SELECT COUNT(*) FROM checkpoint")
    no_ref = sum(1 for a in assemblies if not a["references"])
    conflicts = q("""SELECT COUNT(*) FROM (SELECT part_number FROM assembly_parts WHERE price>0 GROUP BY part_number
                     HAVING MAX(price)<>MIN(price))""")
    report = {
        "engine_groups": {"found": len(groups), "expected": EXPECTED["groups"]},
        "models": {"found": len(vehicles), "expected": EXPECTED["models"]},
        "assemblies": {"found": len(assemblies), "expected": EXPECTED["assemblies"], "crawl_checkpoints_done": done},
        "assemblies_without_parts": no_ref,
        "reference_rows": q("SELECT COUNT(*) FROM assembly_parts"),
        "reference_rows_without_ref_no": q("SELECT COUNT(*) FROM assembly_parts WHERE position IS NULL OR position=''"),
        "unique_oem_parts": q("SELECT COUNT(DISTINCT part_number) FROM assembly_parts"),
        "parts_in_multiple_assemblies": q("SELECT COUNT(*) FROM (SELECT part_number FROM assembly_parts GROUP BY part_number HAVING COUNT(DISTINCT assembly_id)>1)"),
        "model_compatibility_records": q("SELECT COUNT(*) FROM model_parts"),
        "price": {"eur_gt_zero": q("SELECT COUNT(*) FROM assembly_parts WHERE price>0"), "zero": q("SELECT COUNT(*) FROM assembly_parts WHERE price=0"),
                   "null": q("SELECT COUNT(*) FROM assembly_parts WHERE price IS NULL"), "price_on_request": q("SELECT COUNT(*) FROM assembly_parts WHERE price_on_request=1"),
                   "parts_with_conflicting_prices_across_assemblies": conflicts},
        "diagram_files_downloaded": 0,
        "complete": len(assemblies) == EXPECTED["assemblies"] and done >= EXPECTED["assemblies"] and len(vehicles) == EXPECTED["models"],
        "notes": ["diagram files are URL-only until Ferrari written reproduction authorization is recorded",
                  "diagram callout numbers are the portal 'position' column; per-component hotspot coordinates are not extracted"],
    }
    (CAT / "exports" / "coverage_report.json").write_text(json.dumps(report, indent=1))
    print(json.dumps(report, indent=1))


if __name__ == "__main__":
    sys.exit(main())
