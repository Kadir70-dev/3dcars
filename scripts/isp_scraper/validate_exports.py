"""Cross-validate the final deliverables against the completed SQLite database. Read-only.
Checks record counts across SQLite/CSV/Excel/JSON, pricing + metadata coverage at record and
unique-OEM level, 55 models / 5,909 assemblies, compatibility mappings and the illustrated catalogue."""
import csv, json, sqlite3, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CAT = ROOT.parent.parent / "catalogue"
csv.field_size_limit(10**9)


def main():
    conn = sqlite3.connect(f"file:{ROOT/'data'/'interactive_spares_catalogue.sqlite'}?mode=ro", uri=True)
    q = lambda s: conn.execute(s).fetchone()[0]
    res, ok = {}, True
    def check(name, got, want):
        nonlocal ok
        good = got == want; ok &= good; res[name] = {"got": got, "expected": want, "ok": good}

    rows = q("SELECT COUNT(*) FROM assembly_parts")
    check("sqlite.models", q("SELECT COUNT(*) FROM models"), 55)
    check("sqlite.engine_groups", q("SELECT COUNT(DISTINCT group_name) FROM models"), 4)
    check("sqlite.assemblies", q("SELECT COUNT(*) FROM assemblies"), 5909)
    check("sqlite.checkpoints_done", q("SELECT COUNT(*) FROM checkpoint WHERE status='done'"), 5909)
    check("sqlite.assemblies_without_model", q("SELECT COUNT(*) FROM assemblies WHERE model_id NOT IN (SELECT model_id FROM models)"), 0)
    check("sqlite.models_without_assemblies", q("SELECT COUNT(*) FROM models WHERE model_id NOT IN (SELECT model_id FROM assemblies)"), 0)
    check("sqlite.rows_without_part_master", q("SELECT COUNT(*) FROM assembly_parts WHERE part_number NOT IN (SELECT part_number FROM parts)"), 0)
    check("sqlite.rows_without_assembly", q("SELECT COUNT(*) FROM assembly_parts WHERE assembly_id NOT IN (SELECT assembly_id FROM assemblies)"), 0)
    uniq = q("SELECT COUNT(DISTINCT part_number) FROM assembly_parts")
    check("sqlite.unique_oem_equals_parts_table", q("SELECT COUNT(*) FROM parts"), uniq)
    check("sqlite.parts_without_any_model_link", q("SELECT COUNT(*) FROM parts WHERE part_number NOT IN (SELECT part_number FROM model_parts)"), 0)

    # --- pricing coverage ---
    pos, zero, null = q("SELECT COUNT(*) FROM assembly_parts WHERE price>0"), q("SELECT COUNT(*) FROM assembly_parts WHERE price=0"), q("SELECT COUNT(*) FROM assembly_parts WHERE price IS NULL")
    check("price.record_partition_sums_to_rows", pos + zero + null, rows)
    check("price.currency_all_EUR", q("SELECT COUNT(*) FROM assembly_parts WHERE currency<>'EUR' OR currency IS NULL"), 0)
    check("price.negative", q("SELECT COUNT(*) FROM assembly_parts WHERE price<0"), 0)
    # unique-OEM level: OEMs whose every row is zero vs having at least one positive price
    conn.execute("CREATE TEMP TABLE t AS SELECT part_number, MAX(price) mx, MIN(price) mn, COUNT(*) n FROM assembly_parts GROUP BY part_number")
    oem_priced = q("SELECT COUNT(*) FROM t WHERE mx>0"); oem_zero_only = q("SELECT COUNT(*) FROM t WHERE mx=0"); oem_null = q("SELECT COUNT(*) FROM t WHERE mx IS NULL")
    oem_mixed = q("SELECT COUNT(*) FROM t WHERE mx>0 AND mn=0")
    oem_conflict = q("SELECT COUNT(*) FROM t WHERE mn>0 AND mx<>mn")
    check("price.unique_oem_partition_sums", oem_priced + oem_zero_only + oem_null, uniq)

    # --- metadata coverage (record level) ---
    meta = {c: q(f"SELECT COUNT(*) FROM assembly_parts ap JOIN parts p USING(part_number) WHERE {w}") for c, w in {
        "missing_description": "p.description IS NULL OR p.description=''", "missing_uom": "p.uom IS NULL OR p.uom=''"}.items()}
    meta["missing_quantity"] = q("SELECT COUNT(*) FROM assembly_parts WHERE quantity IS NULL")
    meta["missing_ref_no"] = q("SELECT COUNT(*) FROM assembly_parts WHERE position IS NULL OR position=''")
    meta["missing_stock_flag"] = q("SELECT COUNT(*) FROM assembly_parts WHERE stock_flag IS NULL")
    meta["with_specification"] = q("SELECT COUNT(*) FROM assembly_parts WHERE specification IS NOT NULL AND specification<>''")
    meta["with_supersession"] = q("SELECT COUNT(*) FROM assembly_parts WHERE superseded_by IS NOT NULL AND superseded_by<>''")
    meta["parts_missing_description_unique"] = q("SELECT COUNT(*) FROM parts WHERE description IS NULL OR description=''")

    # --- exports ---
    exp = ROOT / "exports"
    with open(exp / "interactive_spares_pricing.csv", newline="", encoding="utf-8") as f:
        r = csv.reader(f); hdr = next(r); n = 0; zero_csv = 0; oems = set(); pi = hdr.index("price_eur"); oi = hdr.index("oem_part_number"); bad_cur = 0
        ci = hdr.index("currency")
        for row in r:
            n += 1; oems.add(row[oi]); zero_csv += (row[pi] not in ("",) and float(row[pi]) == 0); bad_cur += row[ci] != "EUR"
    check("csv.rows", n, rows); check("csv.unique_oem", len(oems), uniq); check("csv.zero_price_rows_preserved", zero_csv, zero); check("csv.non_EUR_rows", bad_cur, 0)
    xl = exp / "interactive_spares_pricing.xlsx"
    if xl.exists():
        from openpyxl import load_workbook
        wb = load_workbook(xl, read_only=True)
        sheets = {ws.title: sum(1 for _ in ws.iter_rows(values_only=True)) - 1 for ws in wb.worksheets}
        res["xlsx.sheets"] = sheets
        check("xlsx.Complete Pricing.rows", sheets.get("Complete Pricing"), rows)
        check("xlsx.All Unique Parts.rows", sheets.get("All Unique Parts"), uniq)
        check("xlsx.Model Compatibility.rows", sheets.get("Model Compatibility"), q("SELECT COUNT(*) FROM model_parts"))
        check("xlsx.Assembly Metadata.rows", sheets.get("Assembly Metadata"), 5909)
        check("xlsx.Zero Price.rows", sheets.get("Zero Price (source 0.00)"), zero)
    else:
        ok = False; res["xlsx"] = "MISSING"
    rep = ROOT / "extraction_report.json"
    if rep.exists():
        j = json.loads(rep.read_text())
        check("json.plates_done", j.get("plates_done"), 5909); check("json.part_rows", j.get("part_rows"), rows)
        check("json.unique_parts", j.get("unique_parts"), uniq); check("json.complete", j.get("complete"), True)
    # --- illustrated catalogue ---
    mp = CAT / "exports" / "diagram_part_mapping.json"
    if mp.exists():
        m = json.loads(mp.read_text())
        check("catalogue.assemblies_mapped", len(m), 5909)
        check("catalogue.reference_rows", sum(len(a["references"]) for a in m), rows)
        check("catalogue.unique_oem", len({r["oem_part_number"] for a in m for r in a["references"]}), uniq)
        check("catalogue.vehicles", len({a["vehicle"] + "|" + a["engine_group"] for a in m}), 55)
        check("catalogue.metadata_json_files", sum(1 for a in m if (CAT / a["path"] / "metadata.json").exists()), 5909)
    else:
        ok = False; res["catalogue"] = "MISSING"
    summary = {"ok": ok, "record_level": {"rows": rows, "price_gt_zero": pos, "price_zero_source_value": zero, "price_null": null,
               "pct_gt_zero": round(pos / rows * 100, 2), "pct_zero": round(zero / rows * 100, 2)},
               "unique_oem_level": {"unique_oem": uniq, "has_positive_price": oem_priced, "zero_only": oem_zero_only, "null_only": oem_null,
                                    "mixed_zero_and_positive_across_assemblies": oem_mixed, "conflicting_positive_prices": oem_conflict,
                                    "pct_with_positive_price": round(oem_priced / uniq * 100, 2)},
               "metadata_record_level": meta, "checks": res}
    (ROOT / "validation_report.json").write_text(json.dumps(summary, indent=1))
    print(json.dumps({k: v for k, v in summary.items() if k != "checks"}, indent=1))
    print("FAILED:", [k for k, v in res.items() if isinstance(v, dict) and "ok" in v and not v["ok"]] or "none")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
