package resources

import (
	"testing"
	"time"
)

func mustGet(t *testing.T, name string) Resource {
	t.Helper()
	r, ok := Get(name)
	if !ok {
		t.Fatalf("resource %s missing", name)
	}
	return r
}

func TestNormalizeKeepsUnknownValuesNull(t *testing.T) {
	r := mustGet(t, "parts")
	v, err := r.Normalize(map[string]any{"name": "Brake pad", "source_id": float64(2), "verification_status": "unverified"})
	if err != nil {
		t.Fatal(err)
	}
	if v["oem_part_number"] != nil || v["revision"] != nil || v["checked_on"] != nil {
		t.Fatalf("missing optional values must stay nil, got %#v", v)
	}
}

func TestNormalizeRejects(t *testing.T) {
	r := mustGet(t, "fitments")
	cases := map[string]map[string]any{
		"unknown field":     {"part_id": 1.0, "vehicle_id": 1.0, "source_id": 1.0, "verification_status": "unverified", "price": "10"},
		"bad enum":          {"part_id": 1.0, "vehicle_id": 1.0, "source_id": 1.0, "verification_status": "probably"},
		"VIN with letter O": {"part_id": 1.0, "vehicle_id": 1.0, "source_id": 1.0, "verification_status": "unverified", "vin_from": "ZFFO"},
		"missing source":    {"part_id": 1.0, "vehicle_id": 1.0, "verification_status": "unverified"},
		"fractional id":     {"part_id": 1.5, "vehicle_id": 1.0, "source_id": 1.0, "verification_status": "unverified"},
	}
	for name, in := range cases {
		if _, err := r.Normalize(in); err == nil {
			t.Errorf("%s: expected validation error", name)
		}
	}
}

func TestNormalizeParsesDatesAndURLs(t *testing.T) {
	r := mustGet(t, "sources")
	if _, err := r.Normalize(map[string]any{"title": "x", "publisher": "y", "source_type": "oem_authorized", "url": "javascript:alert(1)"}); err == nil {
		t.Fatal("non-http URL accepted")
	}
	p := mustGet(t, "parts")
	v, err := p.Normalize(map[string]any{"name": "n", "source_id": 1.0, "verification_status": "unverified", "checked_on": "2026-11-14"})
	if err != nil {
		t.Fatal(err)
	}
	if v["checked_on"].(time.Time).Format("2006-01-02") != "2026-11-14" {
		t.Fatal("date not parsed")
	}
}

func TestReadOnlyFieldsIgnored(t *testing.T) {
	r := mustGet(t, "quote_requests")
	v, err := r.Normalize(map[string]any{"email": "changed@example.com", "status": "reviewing"})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := v["email"]; ok {
		t.Fatal("read-only email must not be writable")
	}
}

func TestVerifiedAllowed(t *testing.T) {
	if VerifiedAllowed("parts", "public_retailer_index") {
		t.Fatal("retailer index must not verify parts")
	}
	if VerifiedAllowed("parts", "manufacturer_publication") {
		t.Fatal("prospectus must not verify part data")
	}
	if !VerifiedAllowed("vehicle_facts", "manufacturer_publication") {
		t.Fatal("prospectus may verify model-level facts")
	}
	if !VerifiedAllowed("fitments", "oem_authorized") {
		t.Fatal("OEM source must verify fitment")
	}
}

func TestPolicy(t *testing.T) {
	if CheckPolicy("vehicles", map[string]any{"slug": "lamborghini-huracan", "is_active": true}) == nil {
		t.Fatal("second active vehicle must be rejected")
	}
	if CheckPolicy("vehicles", map[string]any{"slug": "ferrari-488-gtb", "is_active": true}) != nil {
		t.Fatal("ferrari should be allowed")
	}
	if CheckPolicy("media_assets", map[string]any{"license_status": "licensed_verified", "licensor": "x", "license_name": "y", "url": "https://a/b.glb"}) == nil {
		t.Fatal("verified licence without commercial use must be rejected")
	}
	if CheckPolicy("media_assets", map[string]any{"license_status": "pending_review", "approved_at": time.Now()}) == nil {
		t.Fatal("approval without verified licence must be rejected")
	}
	ok := map[string]any{"license_status": "licensed_verified", "licensor": "x", "license_name": "y", "url": "https://a/b.glb",
		"commercial_use_permitted": true, "is_real_vehicle_geometry": false, "approved_at": time.Now()}
	if err := CheckPolicy("media_assets", ok); err != nil {
		t.Fatal(err)
	}
}
