#!/usr/bin/env python3
"""Read-only catalogue extractor for the Interactive Spares portal (Microcom).

Subcommands: login | models | crawl | export | report
Safety: only GET/POST navigation calls the portal UI itself makes to render a
catalogue. Cart/orders/profile/logout paths are hard-blocked. A full crawl needs
auth/bulk_authorization.txt AND --i-confirm-bulk-authorization.
"""
import argparse, base64, csv, hashlib, html, json, logging, os, random, re, sqlite3, sys, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(__file__).resolve().parent
SESSION = ROOT / "auth" / "session.json"
AUTH_FILE = ROOT / "auth" / "bulk_authorization.txt"
DB_PATH = ROOT / "data" / "interactive_spares_catalogue.sqlite"
BASE = "https://cloud.interactivespares.com/microcom/"
GROUPS = ["Ferrari+6+Cilindri", "Ferrari+8+Cilindri", "Ferrari+12+Cilindri", "Ferrari+Challenge"]
BLOCKED = ("carrello", "ordini", "profilo", "logout", "aggiungi", "aggiorna", "password", "register")
EXIT_SESSION, EXIT_ACCESS, EXIT_GATE = 3, 4, 5

log = logging.getLogger("isp")
now = lambda: datetime.now(timezone.utc).isoformat(timespec="seconds")


class SessionExpired(Exception): pass
class AccessRestricted(Exception): pass


SCHEMA = """
CREATE TABLE IF NOT EXISTS models(model_id TEXT PRIMARY KEY, catalogue_key TEXT, name TEXT, group_name TEXT, url TEXT, seen_at TEXT);
CREATE TABLE IF NOT EXISTS assemblies(assembly_id TEXT PRIMARY KEY, model_id TEXT, node_id TEXT, plate_code TEXT,
  number TEXT, name TEXT, diagram_url TEXT, source_url TEXT, extracted_at TEXT);
CREATE TABLE IF NOT EXISTS parts(part_number TEXT PRIMARY KEY, description TEXT, uom TEXT, image_url TEXT, first_seen TEXT, last_seen TEXT);
CREATE TABLE IF NOT EXISTS assembly_parts(assembly_id TEXT, position TEXT, part_number TEXT, quantity TEXT, specification TEXT,
  price REAL, currency TEXT, purchasable INTEGER, price_on_request INTEGER, disabled INTEGER, stock_flag TEXT, min_dispo TEXT,
  kit_link TEXT, superseded_by TEXT, supersede_raw TEXT, row_type TEXT, raw_row TEXT, extracted_at TEXT,
  PRIMARY KEY(assembly_id, position, part_number));
CREATE TABLE IF NOT EXISTS model_parts(model_id TEXT, part_number TEXT, PRIMARY KEY(model_id, part_number));
CREATE TABLE IF NOT EXISTS price_history(part_number TEXT, price REAL, currency TEXT, observed_at TEXT, source_assembly TEXT);
CREATE TABLE IF NOT EXISTS checkpoint(key TEXT PRIMARY KEY, status TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS errors(at TEXT, scope TEXT, message TEXT);
CREATE INDEX IF NOT EXISTS ix_ph ON price_history(part_number, observed_at);
CREATE INDEX IF NOT EXISTS ix_ap_pn ON assembly_parts(part_number);
"""


def db():
    DB_PATH.parent.mkdir(exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.executescript(SCHEMA)
    return c


def setup_logging():
    (ROOT / "logs").mkdir(exist_ok=True)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s",
                        handlers=[logging.FileHandler(ROOT / "logs" / "isp.log"), logging.StreamHandler()])


class Client:
    """HTTP client bound to the saved Playwright session. Rate-limited, read-only."""

    def __init__(self, pw, delay):
        if not SESSION.exists():
            sys.exit("auth/session.json missing - run: isp_scraper.py login")
        self.ctx = pw.chromium.launch().new_context(storage_state=str(SESSION))
        self.delay, self.last = delay, 0.0

    def _wait(self):
        gap = self.delay + random.uniform(0, self.delay / 2) - (time.time() - self.last)
        if gap > 0: time.sleep(gap)
        self.last = time.time()

    def fetch(self, method, path, retries=3):
        if any(b in path.lower() for b in BLOCKED):
            raise AccessRestricted(f"blocked path {path}")
        url = path if path.startswith("http") else BASE + path
        for n in range(retries):
            self._wait()
            r = getattr(self.ctx.request, method)(url, max_redirects=0)
            if r.status in (301, 302, 303) and "login" in r.headers.get("location", ""):
                raise SessionExpired(url)
            if r.status in (401, 403): raise AccessRestricted(f"{r.status} {url}")
            if r.status == 429 or r.status >= 500:
                wait = 15 * (n + 1); log.warning("HTTP %s on %s, backing off %ss", r.status, path, wait); time.sleep(wait); continue
            if r.status != 200: raise RuntimeError(f"HTTP {r.status} {url}")
            return r.text()
        raise RuntimeError(f"retries exhausted {url}")


def cid_of(url): return url.rsplit("/catalogo/", 1)[1].split("?")[0]
def b64(s): return base64.b64decode(unquote(s)).decode(errors="replace")
def num(s):
    s = (s or "").strip().replace(",", "")
    try: return float(s)
    except ValueError: return None


def cmd_login(a):
    from playwright.sync_api import sync_playwright
    user, pw_ = os.environ.get("ISP_USER"), os.environ.get("ISP_PASS")
    if not user or not pw_: sys.exit("set ISP_USER and ISP_PASS in the environment (never on the command line)")
    with sync_playwright() as p:
        ctx = p.chromium.launch().new_context(); pg = ctx.new_page()
        pg.goto(BASE + "login", wait_until="networkidle")
        try: pg.click("text=OK", timeout=2000)
        except Exception: pass
        pg.fill("input[name=username]", user); pg.fill("input[name=password]", pw_); pg.click("text=LOGIN")
        pg.wait_for_load_state("networkidle")
        if "login" in pg.url: sys.exit("login failed")
        SESSION.parent.mkdir(exist_ok=True, mode=0o700)
        ctx.storage_state(path=str(SESSION)); os.chmod(SESSION, 0o600)
    print("session saved (mode 600)")


def cmd_models(a, conn=None):
    """Group pages paginate client-side, so a browser is used for this step only."""
    from playwright.sync_api import sync_playwright
    conn = conn or db(); found = 0
    with sync_playwright() as p:
        pg = p.chromium.launch().new_context(storage_state=str(SESSION)).new_page()
        for g in GROUPS:
            pg.goto(BASE + "categorie/" + g, wait_until="networkidle")
            if "login" in pg.url: raise SessionExpired(g)
            seen = {}
            def grab():
                for el in pg.query_selector_all("a[href*='/catalogo/']"):
                    if el.is_visible():
                        h, t = el.get_attribute("href"), el.inner_text().strip()
                        if t or h not in seen: seen[h] = t or seen.get(h, "")
            grab()
            for i in range(len(pg.query_selector_all("ul.pagination li a"))):
                el = pg.query_selector_all("ul.pagination li a")[i]
                if el.inner_text().strip().isdigit(): el.click(); pg.wait_for_timeout(500); grab()
            for h, t in seen.items():
                cid = cid_of(h); key = b64(cid)
                conn.execute("INSERT OR REPLACE INTO models VALUES(?,?,?,?,?,?)", (cid, key, t or key, g.replace("+", " "), h, now()))
            found += len(seen); log.info("%s: %d models", g, len(seen))
    conn.commit(); print(f"{found} models stored")


ROW = re.compile(r"<tr data-ordinamento=.*?</tr>", re.S)
def attrs(tag): return {k: html.unescape(v) for k, v in re.findall(r'([\w-]+)="([^"]*)"', tag)}
def text(s): return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def parse_plate(fragment):
    cap = re.search(r'class="caption">\s*(.*?)\s*</div>', fragment, re.S)
    code = re.search(r'id="tavola_container"[^>]*data-code="([^"]+)"', fragment)
    rows = []
    for raw in ROW.findall(fragment):
        at = attrs(raw[: raw.index(">") + 1]); tds = re.findall(r"<td[^>]*>(.*?)</td>", raw, re.S)
        if len(tds) < 7: continue
        btn = re.search(r"<button[^>]*>", raw); b = attrs(btn.group(0)) if btn else {}
        spec = " ".join(text(x) for x in re.findall(r'<span data-type="(?:specifica|info)">(.*?)</span>', tds[3], re.S))
        rows.append(dict(position=text(tds[0]), part_number=text(tds[1]) or at.get("data-code", ""), description=text(tds[2]),
                         specification=spec, uom=text(tds[4]), quantity=text(tds[5]), price=num(text(tds[6])),
                         purchasable=int(at.get("data-acquistabile") == "1"), price_on_request=int(at.get("data-price-request") == "1"),
                         disabled=int(at.get("data-disabled-part") == "1"), stock_flag=b.get("data-magazzino"),
                         min_dispo=b.get("data-min-dispo"), kit_link=at.get("data-link") or None,
                         has_image=bool(at.get("data-immagine")), row_type=at.get("data-type"),
                         supersede_raw=at.get("data-sostitutivo") or None, raw_row=raw))
    return (text(cap.group(1)) if cap else None), (code.group(1) if code else None), rows


def supersede(raw):
    if not raw: return None
    try: return str(json.loads(raw).get("sostituzione") or "") or None
    except Exception: return raw[:80]


def store_plate(conn, model_id, node_id, name, plate, rows, label=""):
    ts, aid = now(), f"{model_id}|{plate}"
    conn.execute("INSERT OR REPLACE INTO assemblies VALUES(?,?,?,?,?,?,?,?,?)",
                 (aid, model_id, node_id, plate, (re.match(r"\s*(\d+)\s*[-_]", label or "") or [None, None])[1], (label or name), f"{BASE}tavola/{quote(plate)}",
                  f"{BASE}catalogo/{model_id}?path={node_id}", ts))
    for r in rows:
        pn = r["part_number"]
        img = f"{BASE}ricambio/immagine?thumb=1&ricambio={quote(pn)}" if r["has_image"] else None
        conn.execute("INSERT INTO parts VALUES(?,?,?,?,?,?) ON CONFLICT(part_number) DO UPDATE SET description=excluded.description,"
                     "uom=excluded.uom, image_url=COALESCE(excluded.image_url,image_url), last_seen=excluded.last_seen", (pn, r["description"], r["uom"], img, ts, ts))
        conn.execute("INSERT OR REPLACE INTO assembly_parts VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                     (aid, r["position"], pn, r["quantity"], r["specification"], r["price"], "EUR", r["purchasable"], r["price_on_request"],
                      r["disabled"], r["stock_flag"], r["min_dispo"], r["kit_link"], supersede(r["supersede_raw"]), r["supersede_raw"],
                      r["row_type"], r["raw_row"], ts))
        conn.execute("INSERT OR IGNORE INTO model_parts VALUES(?,?)", (model_id, pn))
        if r["price"] is not None:
            last = conn.execute("SELECT price FROM price_history WHERE part_number=? ORDER BY observed_at DESC LIMIT 1", (pn,)).fetchone()
            if not last or last[0] != r["price"]:
                conn.execute("INSERT INTO price_history VALUES(?,?,?,?,?)", (pn, r["price"], "EUR", ts, aid))


def cmd_crawl(a):
    from playwright.sync_api import sync_playwright
    setup_logging(); conn = db()
    if a.scope == "full":
        if not (a.i_confirm_bulk_authorization and AUTH_FILE.exists() and AUTH_FILE.read_text().strip()):
            print("GATED: full crawl needs auth/bulk_authorization.txt (reference to the written permission) "
                  "and --i-confirm-bulk-authorization"); return EXIT_GATE
    if not conn.execute("SELECT 1 FROM models").fetchone(): cmd_models(a, conn)
    models = conn.execute("SELECT model_id,name FROM models ORDER BY group_name,name").fetchall()
    if a.model: models = [m for m in models if a.model.lower() in m[1].lower()]
    if a.max_models: models = models[: a.max_models]
    done = {k for (k,) in conn.execute("SELECT key FROM checkpoint WHERE status='done'")}
    stats = dict(plates=0, rows=0, errors=0)
    with sync_playwright() as p:
        cl = Client(p, a.delay)
        try:
            for mid, mname in models:
                nodes = json.loads(cl.fetch("get", f"catalogo/{mid}/tree?parent=%23"))
                if a.max_plates: nodes = nodes[: a.max_plates]
                log.info("%s: %d plates", mname, len(nodes))
                for n in nodes:
                    key = f"{mid}|{n['id']}"
                    if key in done and not a.refresh: continue
                    try:
                        frag = cl.fetch("post", f"catalogo/{mid}/tree/tavola/{n['id']}")
                        name, plate, rows = parse_plate(frag)
                        if not plate: raise ValueError("plate code not found in fragment")
                        store_plate(conn, mid, n["id"], name, plate, rows, n["text"])
                        conn.execute("INSERT OR REPLACE INTO checkpoint VALUES(?,?,?)", (key, "done", now())); conn.commit()
                        stats["plates"] += 1; stats["rows"] += len(rows)
                    except (SessionExpired, AccessRestricted): raise
                    except Exception as e:
                        stats["errors"] += 1; log.error("%s: %s", key, e)
                        conn.execute("INSERT INTO errors VALUES(?,?,?)", (now(), key, str(e))); conn.commit()
        except SessionExpired as e:
            log.error("session expired (%s) - re-run login, then crawl resumes", e); return EXIT_SESSION
        except AccessRestricted as e:
            log.error("access restriction (%s) - stopping", e); return EXIT_ACCESS
    log.info("run done: %s", stats); cmd_export(a); return 0


ENGINE = {"Ferrari 6 Cilindri": "V6", "Ferrari 8 Cilindri": "V8", "Ferrari 12 Cilindri": "V12", "Ferrari Challenge": "Challenge (race)"}
PRICING_COLS = ["part_id", "oem_part_number", "part_name", "part_description", "price_eur", "currency", "vehicle_brand", "vehicle_model",
                "engine_category", "assembly_number", "assembly_name", "diagram_ref", "quantity_per_assembly", "unit_of_measure",
                "specifications", "availability_status", "purchasable", "price_on_request", "superseded_part_number",
                "compatible_models", "source_url", "extracted_at"]
FLAG = {"1": "stock_flag=1 (portal flag, meaning unverified)", "0": "stock_flag=0 (portal flag, meaning unverified)"}


def pricing_rows(conn):
    compat = {pn: "; ".join(sorted(x.split("|")[0] for x in ms.split(",")))
              for pn, ms in conn.execute("SELECT part_number, group_concat(DISTINCT m.name||'|'||m.model_id) FROM model_parts mp JOIN models m USING(model_id) GROUP BY part_number")}
    cur = conn.execute("""SELECT ap.part_number, p.description, ap.price, ap.currency, m.group_name, m.name, a.number, a.name, ap.position,
        ap.quantity, p.uom, ap.specification, ap.stock_flag, ap.purchasable, ap.price_on_request, ap.superseded_by, a.source_url, ap.extracted_at
        FROM assembly_parts ap JOIN assemblies a USING(assembly_id) JOIN models m ON m.model_id=a.model_id JOIN parts p USING(part_number)
        ORDER BY m.group_name, m.name, a.number, CAST(ap.position AS INTEGER)""")
    out = []
    for r in cur:
        pn, desc, price, cur_, grp, mod, anum, anam, pos, qty, uom, spec, stock, buy, por, sup, src, ts = r
        out.append([pn, pn, desc, desc, price, cur_, "Ferrari", mod, ENGINE.get(grp, grp), anum, anam, pos, qty, uom, spec or None,
                    FLAG.get(stock) if stock is not None else None, "yes" if buy else "no", "yes" if por else "no", sup,
                    compat.get(pn), src, ts])
    return out


def cmd_export(a):
    conn = db(); out = ROOT / "exports"; out.mkdir(exist_ok=True); rows = pricing_rows(conn); ix = {c: i for i, c in enumerate(PRICING_COLS)}
    with open(out / "interactive_spares_pricing.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f); w.writerow(PRICING_COLS); w.writerows(rows)
    from openpyxl import Workbook
    wb = Workbook(write_only=True)
    def sheet(name, cols, data):
        ws = wb.create_sheet(name); ws.append(cols)
        for r in data: ws.append(list(r))
    sheet("All Unique Parts", ["part_id", "oem_part_number", "part_name", "unit_of_measure", "first_price_eur", "price_variants", "models_count", "first_seen", "last_seen"],
          conn.execute("""SELECT p.part_number,p.part_number,p.description,p.uom,(SELECT price FROM price_history h WHERE h.part_number=p.part_number ORDER BY observed_at LIMIT 1),
            (SELECT COUNT(DISTINCT price) FROM assembly_parts x WHERE x.part_number=p.part_number),(SELECT COUNT(*) FROM model_parts mp WHERE mp.part_number=p.part_number),
            p.first_seen,p.last_seen FROM parts p ORDER BY p.part_number"""))
    sheet("Complete Pricing", PRICING_COLS, rows)
    sheet("Model Compatibility", ["oem_part_number", "vehicle_model", "engine_category", "model_source_url"],
          conn.execute("SELECT mp.part_number,m.name,m.group_name,m.url FROM model_parts mp JOIN models m USING(model_id) ORDER BY 1,2"))
    sheet("Assembly Metadata", ["assembly_id", "vehicle_model", "engine_category", "assembly_number", "assembly_name", "parts_rows", "diagram_reference_url", "source_url", "extracted_at"],
          conn.execute("""SELECT a.assembly_id,m.name,m.group_name,a.number,a.name,(SELECT COUNT(*) FROM assembly_parts ap WHERE ap.assembly_id=a.assembly_id),a.diagram_url,a.source_url,a.extracted_at
            FROM assemblies a JOIN models m USING(model_id) ORDER BY m.name,a.number"""))
    sheet("Price on Request", PRICING_COLS, [r for r in rows if r[ix["price_on_request"]] == "yes"])
    miss = []
    for r in rows:
        for c in ("price_eur", "part_name", "unit_of_measure", "quantity_per_assembly", "availability_status"):
            if r[ix[c]] in (None, ""): miss.append([r[ix["oem_part_number"]], r[ix["vehicle_model"]], r[ix["assembly_number"]], r[ix["diagram_ref"]], c, r[ix["source_url"]]])
    sheet("Missing Data", ["oem_part_number", "vehicle_model", "assembly_number", "diagram_ref", "missing_field", "source_url"], miss)
    rep = build_report(conn, len(miss)); sheet("Extraction Summary", ["metric", "value"], [[k, json.dumps(v) if isinstance(v, (list, dict)) else v] for k, v in rep.items()])
    wb.save(out / "interactive_spares_pricing.xlsx"); print(f"exported {len(rows)} rows, {len(miss)} missing-data entries")


def build_report(conn, missing=0):
    q = lambda s: conn.execute(s).fetchone()[0]
    priced = q("SELECT COUNT(*) FROM assembly_parts WHERE price IS NOT NULL"); total = q("SELECT COUNT(*) FROM assembly_parts")
    return dict(generated_at=now(), models=q("SELECT COUNT(*) FROM models"), plates_expected=5909, plates_done=q("SELECT COUNT(*) FROM checkpoint WHERE status='done'"),
                assemblies=q("SELECT COUNT(*) FROM assemblies"), unique_parts=q("SELECT COUNT(*) FROM parts"), part_rows=total,
                rows_with_price=priced, price_coverage_pct=round(100 * priced / total, 2) if total else None,
                price_on_request_rows=q("SELECT COALESCE(SUM(price_on_request),0) FROM assembly_parts"),
                rows_with_supersession=q("SELECT COUNT(superseded_by) FROM assembly_parts"), model_part_links=q("SELECT COUNT(*) FROM model_parts"),
                price_points=q("SELECT COUNT(*) FROM price_history"), errors=q("SELECT COUNT(*) FROM errors"), missing_data_entries=missing,
                complete=q("SELECT COUNT(*) FROM checkpoint WHERE status='done'") >= 5909,
                notes=["currency 'EUR' comes from the portal column header 'Price (EUR)'", "quantity is quantity per assembly, never stock",
                       "availability_status is the raw portal stock flag (data-magazzino); meaning unverified", "not exposed: VAT, dealer/retail split, stock quantity, model year",
                       "unique part id = OEM part number (portal exposes no separate id)", "diagram and image files not downloaded; URLs only"])


def cmd_report(a):
    rep = build_report(db()); (ROOT / "extraction_report.json").write_text(json.dumps(rep, indent=2)); print(json.dumps(rep, indent=2))


def main():
    ap = argparse.ArgumentParser(description=__doc__); sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("login"); sub.add_parser("models"); sub.add_parser("export"); sub.add_parser("report")
    c = sub.add_parser("crawl"); c.add_argument("--scope", choices=["sample", "full"], default="sample")
    c.add_argument("--model", help="substring of model name"); c.add_argument("--max-models", type=int, default=2)
    c.add_argument("--max-plates", type=int, default=5); c.add_argument("--delay", type=float, default=1.5)
    c.add_argument("--refresh", action="store_true"); c.add_argument("--i-confirm-bulk-authorization", action="store_true")
    a = ap.parse_args()
    if a.cmd == "crawl" and a.scope == "full": a.max_models = a.max_plates = None
    setup_logging()
    sys.exit({"login": cmd_login, "models": cmd_models, "crawl": cmd_crawl, "export": cmd_export, "report": cmd_report}[a.cmd](a) or 0)


if __name__ == "__main__":
    main()
