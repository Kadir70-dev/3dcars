"""Fast single-pass export from the completed SQLite DB (no crawl, no portal access).
Replaces the per-row correlated subqueries in `isp_scraper.py export`: every relationship is precomputed with
one GROUP BY each, then CSV + write-only XLSX are streamed in one pass. Original source prices (incl. 0.00)
are preserved untouched in all files; zero is flagged, not rewritten."""
import csv, json, sys, time
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # -I mode omits the script dir
import isp_scraper as isp

t0 = time.time()
def log(m): print(f"[{time.time()-t0:6.1f}s] {m}", flush=True)


def main():
    conn = isp.db(); out = isp.ROOT / "exports"; out.mkdir(exist_ok=True)
    cols = isp.PRICING_COLS; ix = {c: i for i, c in enumerate(cols)}
    compat = {pn: "; ".join(sorted(x.split("|")[0] for x in ms.split(",")))
              for pn, ms in conn.execute("SELECT part_number, group_concat(DISTINCT m.name||'|'||m.model_id) FROM model_parts mp JOIN models m USING(model_id) GROUP BY part_number")}
    log(f"compat {len(compat)}")
    parts = {r[0]: r for r in conn.execute("SELECT part_number,description,uom,first_seen,last_seen FROM parts")}
    variants = dict(conn.execute("SELECT part_number, COUNT(DISTINCT price) FROM assembly_parts GROUP BY part_number"))
    models_n = dict(conn.execute("SELECT part_number, COUNT(*) FROM model_parts GROUP BY part_number"))
    asm_rows = dict(conn.execute("SELECT assembly_id, COUNT(*) FROM assembly_parts GROUP BY assembly_id"))
    first_price = {}
    for pn, price in conn.execute("SELECT part_number, price FROM price_history ORDER BY part_number, observed_at"):
        first_price.setdefault(pn, price)
    log(f"precomputed parts={len(parts)} variants={len(variants)} first_price={len(first_price)}")

    from openpyxl import Workbook
    wb = Workbook(write_only=True)
    ws_parts = wb.create_sheet("All Unique Parts"); ws_pr = wb.create_sheet("Complete Pricing")
    ws_cmp = wb.create_sheet("Model Compatibility"); ws_asm = wb.create_sheet("Assembly Metadata")
    ws_por = wb.create_sheet("Price on Request"); ws_zero = wb.create_sheet("Zero Price (source 0.00)")
    ws_miss = wb.create_sheet("Missing Data"); ws_sum = wb.create_sheet("Extraction Summary")

    ws_parts.append(["part_id", "oem_part_number", "part_name", "unit_of_measure", "first_price_eur", "price_variants", "models_count", "first_seen", "last_seen"])
    for pn in sorted(parts):
        _, d, u, fs, ls = parts[pn]
        ws_parts.append([pn, pn, d, u, first_price.get(pn), variants.get(pn), models_n.get(pn, 0), fs, ls])
    log("sheet All Unique Parts")

    ws_cmp.append(["oem_part_number", "vehicle_model", "engine_category", "model_source_url"])
    for r in conn.execute("SELECT mp.part_number,m.name,m.group_name,m.url FROM model_parts mp JOIN models m USING(model_id) ORDER BY 1,2"): ws_cmp.append(list(r))
    log("sheet Model Compatibility")

    ws_asm.append(["assembly_id", "vehicle_model", "engine_category", "assembly_number", "assembly_name", "parts_rows", "diagram_reference_url", "source_url", "extracted_at"])
    for a, mn, gn, num_, nm, du, su, ts in conn.execute("SELECT a.assembly_id,m.name,m.group_name,a.number,a.name,a.diagram_url,a.source_url,a.extracted_at FROM assemblies a JOIN models m USING(model_id) ORDER BY m.name,a.number"):
        ws_asm.append([a, mn, gn, num_, nm, asm_rows.get(a, 0), du, su, ts])
    log("sheet Assembly Metadata")

    for ws in (ws_pr, ws_por, ws_zero): ws.append(cols)
    ws_miss.append(["oem_part_number", "vehicle_model", "assembly_number", "diagram_ref", "missing_field", "source_url"])
    cur = conn.execute("""SELECT ap.part_number, p.description, ap.price, ap.currency, m.group_name, m.name, a.number, a.name, ap.position,
        ap.quantity, p.uom, ap.specification, ap.stock_flag, ap.purchasable, ap.price_on_request, ap.superseded_by, a.source_url, ap.extracted_at
        FROM assembly_parts ap JOIN assemblies a USING(assembly_id) JOIN models m ON m.model_id=a.model_id JOIN parts p USING(part_number)
        ORDER BY m.group_name, m.name, a.number, CAST(ap.position AS INTEGER)""")
    n = miss = zero = 0
    chk = ("price_eur", "part_name", "unit_of_measure", "quantity_per_assembly", "availability_status")
    with open(out / "interactive_spares_pricing.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(cols)
        for r in cur:
            pn, desc, price, cu, grp, mod, anum, anam, pos, qty, uom, spec, stock, buy, por, sup, src, ts = r
            row = [pn, pn, desc, desc, price, cu, "Ferrari", mod, isp.ENGINE.get(grp, grp), anum, anam, pos, qty, uom, spec or None,
                   isp.FLAG.get(stock) if stock is not None else None, "yes" if buy else "no", "yes" if por else "no", sup, compat.get(pn), src, ts]
            w.writerow(row); ws_pr.append(row); n += 1
            if por: ws_por.append(row)
            if price == 0: ws_zero.append(row); zero += 1
            for c in chk:
                if row[ix[c]] in (None, ""): ws_miss.append([pn, mod, anum, pos, c, src]); miss += 1
    log(f"streamed {n} rows, zero={zero}, missing={miss}")

    rep = isp.build_report(conn, miss)
    q = lambda s: conn.execute(s).fetchone()[0]
    rep.update(rows_with_price=q("SELECT COUNT(*) FROM assembly_parts WHERE price>0"), rows_with_zero_source_price=zero,
               rows_with_null_price=q("SELECT COUNT(*) FROM assembly_parts WHERE price IS NULL"),
               price_coverage_pct=round(100 * q("SELECT COUNT(*) FROM assembly_parts WHERE price>0") / n, 2))
    rep["notes"].append("price_coverage_pct counts rows with price > 0 only; 0.00 is the portal's own displayed value, preserved unchanged and shown to customers as 'Request Price'")
    ws_sum.append(["metric", "value"])
    for k, v in rep.items(): ws_sum.append([k, json.dumps(v) if isinstance(v, (list, dict)) else v])
    wb.save(out / "interactive_spares_pricing.xlsx"); log("xlsx saved")
    (isp.ROOT / "extraction_report.json").write_text(json.dumps(rep, indent=2)); log("report saved")


if __name__ == "__main__":
    sys.exit(main())
