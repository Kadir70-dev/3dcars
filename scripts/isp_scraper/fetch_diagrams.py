"""Download original diagram SVGs into catalogue/diagrams/... - AUTHORIZATION-GATED, not run by default.
Requires auth/diagram_authorization.txt (reference of Ferrari S.p.A. written reproduction permission)
and --i-confirm-diagram-authorization. Read-only GETs via the existing rate-limited client; copyright
notices inside the files are kept untouched. Resumable (skips files already present)."""
import argparse, hashlib, json, sys
from pathlib import Path
import isp_scraper as isp
from extract_hotspots import extract

CAT = isp.ROOT.parent.parent / "catalogue"


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--delay", type=float, default=1.5)
    ap.add_argument("--limit", type=int, default=0); ap.add_argument("--i-confirm-diagram-authorization", action="store_true")
    a = ap.parse_args()
    auth = isp.ROOT / "auth" / "diagram_authorization.txt"
    if not (a.i_confirm_diagram_authorization and auth.exists() and auth.read_text().strip()):
        print("Refused: need auth/diagram_authorization.txt (non-empty) and --i-confirm-diagram-authorization", file=sys.stderr)
        return isp.EXIT_GATE
    from playwright.sync_api import sync_playwright
    recs = json.loads((CAT / "metadata" / "assemblies.json").read_text()); n = 0
    with sync_playwright() as p:
        cl = isp.Client(p, a.delay)
        for r in recs:
            out = CAT / r["path"] / "diagram.svg"
            if out.exists(): continue
            try: svg = cl.fetch("get", r["diagram_source_url"])
            except isp.SessionExpired: print("session expired - re-run login"); return isp.EXIT_SESSION
            out.write_text(svg); n += 1
            try:  # offline hotspot extraction; anything unplaceable is reported, never guessed
                refs = set(json.loads((CAT / r["path"] / "metadata.json").read_text())["reference_numbers"])
                (CAT / r["path"] / "hotspots.json").write_text(json.dumps(extract(svg, refs), indent=1))
            except Exception as e: print("hotspots failed", r["assembly_id"], e)
            (CAT / r["path"] / "diagram.sha256").write_text(hashlib.sha256(svg.encode()).hexdigest())
            if a.limit and n >= a.limit: break
    print("downloaded", n)


if __name__ == "__main__":
    sys.exit(main())
