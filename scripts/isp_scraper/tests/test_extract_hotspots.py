import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from extract_hotspots import extract

SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520">
<g transform="translate(100,50)"><text x="10" y="20">3</text></g>
<g transform="scale(2)"><g transform="translate(5,5)"><text x="10" y="10"><tspan>12</tspan></text></g></g>
<text x="1" y="1">Label</text><g transform="rotate(30)"><text x="0" y="0">9</text></g>
</svg>"""

class T(unittest.TestCase):
    def test_places_transformed_refs_and_reports_rest(self):
        r = extract(SVG, {"3", "12", "9", "7"})
        pos = {c["ref"]: (c["x"], c["y"]) for c in r["callouts"]}
        self.assertEqual(pos["3"], (110, 70)); self.assertEqual(pos["12"], (30, 30))
        self.assertEqual((r["width"], r["height"]), (800, 520))
        self.assertTrue(any("ref 7" in u for u in r["unplaced"]))       # missing, not guessed
        self.assertTrue(any("unsupported transform" in u for u in r["unplaced"]))  # rotate refused
        self.assertNotIn("Label", pos)

if __name__ == "__main__": unittest.main()
