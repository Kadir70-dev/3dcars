package httpapi

// Integration tests run against a real PostgreSQL. Set TEST_ADMIN_DATABASE_URL
// to a URL whose user may CREATE DATABASE; a fresh "atlas_test" database is
// created, migrated and seeded. Skipped when the variable is unset.

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"

	"github.com/Kadir70-dev/3dcars/api/internal/dbx"
	"github.com/Kadir70-dev/3dcars/api/internal/store"
)

type client struct {
	t  *testing.T
	ts *httptest.Server
	hc *http.Client
}

func (c *client) do(method, path string, body any, hdr ...string) (int, map[string]any) {
	c.t.Helper()
	var rd *bytes.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		rd = bytes.NewReader(b)
	} else {
		rd = bytes.NewReader(nil)
	}
	req, _ := http.NewRequest(method, c.ts.URL+path, rd)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	for i := 0; i+1 < len(hdr); i += 2 {
		req.Header.Set(hdr[i], hdr[i+1])
	}
	res, err := c.hc.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer res.Body.Close()
	out := map[string]any{}
	_ = json.NewDecoder(res.Body).Decode(&out)
	return res.StatusCode, out
}

func setup(t *testing.T) *client {
	adminURL := os.Getenv("TEST_ADMIN_DATABASE_URL")
	if adminURL == "" {
		t.Skip("TEST_ADMIN_DATABASE_URL not set")
	}
	ctx := context.Background()
	conn, err := pgx.Connect(ctx, adminURL)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(ctx, "DROP DATABASE IF EXISTS atlas_test WITH (FORCE)"); err != nil {
		t.Fatal(err)
	}
	if _, err := conn.Exec(ctx, "CREATE DATABASE atlas_test"); err != nil {
		t.Fatal(err)
	}
	conn.Close(ctx)
	u, err := url.Parse(adminURL)
	if err != nil {
		t.Fatal(err)
	}
	u.Path = "/atlas_test"
	pool, err := dbx.Connect(ctx, u.String())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	for _, sub := range []string{"migrations", "seed"} {
		if _, err := dbx.ApplyDir(ctx, pool, filepath.Join("..", "..", "..", "db", sub), sub); err != nil {
			t.Fatal(err)
		}
	}
	st := &store.Store{DB: pool}
	if err := st.CreateAdmin(ctx, "owner@example.com", "correct horse battery"); err != nil {
		t.Fatal(err)
	}
	ts := httptest.NewServer(New(st, Config{AllowedOrigins: []string{"http://localhost:3020"}}).Handler())
	t.Cleanup(ts.Close)
	jar, _ := cookiejar.New(nil)
	return &client{t: t, ts: ts, hc: &http.Client{Jar: jar}}
}

func TestPublicCatalog(t *testing.T) {
	c := setup(t)

	code, v := c.do("GET", "/api/v1/vehicles/ferrari-488-gtb", nil)
	if code != 200 {
		t.Fatalf("vehicle: %d %v", code, v)
	}
	counts := v["counts"].(map[string]any)
	if counts["assemblies"].(float64) != 95 || counts["parts"].(float64) != 0 || counts["fitments"].(float64) != 0 {
		t.Fatalf("unexpected counts %v", counts)
	}
	if v["model3d"] != nil {
		t.Fatal("no licensed 3D asset exists; model3d must be null")
	}
	for _, f := range v["facts"].([]any) {
		p := f.(map[string]any)["provenance"].(map[string]any)
		if p["sourceType"] != "manufacturer_publication" || p["checkedOn"] == nil {
			t.Fatalf("fact without provenance: %v", f)
		}
	}

	code, v = c.do("GET", "/api/v1/vehicles/ferrari-488-gtb/search?q=brake&system=chassis-brakes", nil)
	if code != 200 {
		t.Fatal(code)
	}
	as := v["assemblies"].([]any)
	if len(as) != 6 { // 0030, 0032, 0033, 0034, plus 0038/0040 "... and brake disc"
		t.Fatalf("expected 6 brake assemblies, got %d", len(as))
	}
	for _, a := range as {
		if a.(map[string]any)["provenance"].(map[string]any)["verificationStatus"] != "publicly_listed" {
			t.Fatal("assembly titles must be publicly_listed, not verified")
		}
	}

	if code, _ = c.do("GET", "/api/v1/vehicles/ferrari-488-gtb/search?q=%25", nil); code != 200 {
		t.Fatal("wildcard query should be escaped, not fail")
	}
	if code, _ = c.do("GET", "/api/v1/vehicles/lamborghini-huracan", nil); code != 404 {
		t.Fatalf("inactive vehicle should 404, got %d", code)
	}
	if code, v = c.do("GET", "/api/v1/vehicles/ferrari-488-gtb/assemblies/0042", nil); code != 200 || v["name"] != "Wheels" {
		t.Fatalf("assembly detail: %d %v", code, v)
	}
}

func TestQuotes(t *testing.T) {
	c := setup(t)
	good := map[string]any{"name": "A Buyer", "email": "buyer@example.com", "vin": "",
		"items": []map[string]string{{"kind": "assembly", "ref": "0042", "label": "Wheels"}}}
	if code, v := c.do("POST", "/api/v1/quotes", good); code != 201 || v["status"] != "received" {
		t.Fatalf("quote: %d %v", code, v)
	}
	bad := map[string]any{"name": "", "email": "nope", "vin": "123", "items": []any{}}
	code, v := c.do("POST", "/api/v1/quotes", bad)
	if code != 422 || len(v["fields"].(map[string]any)) != 4 {
		t.Fatalf("expected 4 field errors, got %d %v", code, v)
	}
	if code, _ := c.do("POST", "/api/v1/quotes", good, "Origin", "https://evil.example"); code != 403 {
		t.Fatalf("cross-origin quote should be rejected, got %d", code)
	}
}

func TestAdminFlow(t *testing.T) {
	c := setup(t)
	if code, _ := c.do("GET", "/api/v1/admin/me", nil); code != 401 {
		t.Fatal("admin must require sign-in")
	}
	if code, _ := c.do("POST", "/api/v1/admin/login", map[string]string{"email": "owner@example.com", "password": "wrong password!"}); code != 401 {
		t.Fatal("wrong password accepted")
	}
	if code, _ := c.do("POST", "/api/v1/admin/login", map[string]string{"email": "owner@example.com", "password": "correct horse battery"}); code != 200 {
		t.Fatal("login failed")
	}

	// A retailer index cannot verify a part.
	code, v := c.do("POST", "/api/v1/admin/r/parts", map[string]any{"name": "Front brake pad set", "source_id": 2, "verification_status": "verified"})
	if code != 422 {
		t.Fatalf("expected policy rejection, got %d %v", code, v)
	}
	// An unverified part with NULL OEM number is fine and appears via its assembly.
	code, v = c.do("POST", "/api/v1/admin/r/parts", map[string]any{"name": "Test part (admin flow)", "source_id": 2, "verification_status": "source_required"})
	if code != 201 {
		t.Fatalf("create part: %d %v", code, v)
	}
	partID := v["id"]
	code, v = c.do("GET", "/api/v1/admin/options/assemblies", nil)
	var wheels any
	for _, o := range v["options"].([]any) {
		if strings.HasPrefix(o.(map[string]any)["label"].(string), "0042") {
			wheels = o.(map[string]any)["id"]
		}
	}
	if code, v = c.do("POST", "/api/v1/admin/r/assembly_parts", map[string]any{"assembly_id": wheels, "part_id": partID, "source_id": 2, "verification_status": "unverified"}); code != 201 {
		t.Fatalf("link: %d %v", code, v)
	}
	_, v = c.do("GET", "/api/v1/vehicles/ferrari-488-gtb/search?q=admin+flow", nil)
	if len(v["parts"].([]any)) != 1 {
		t.Fatalf("part not searchable: %v", v)
	}

	// Activating a second vehicle is blocked.
	code, _ = c.do("POST", "/api/v1/admin/r/vehicles", map[string]any{"slug": "maserati-mc20", "make": "Maserati", "model": "MC20", "is_active": true})
	if code != 422 {
		t.Fatalf("second active vehicle allowed: %d", code)
	}

	// 3D asset only becomes public when licence gates pass.
	asset := map[string]any{"vehicle_id": 1, "kind": "model_3d", "title": "Gate test", "url": "https://example.com/m.glb",
		"license_status": "pending_review"}
	code, v = c.do("POST", "/api/v1/admin/r/media_assets", asset)
	if code != 201 {
		t.Fatalf("asset: %d %v", code, v)
	}
	assetID := v["id"].(float64)
	if _, v = c.do("GET", "/api/v1/vehicles/ferrari-488-gtb", nil); v["model3d"] != nil {
		t.Fatal("pending asset leaked to public")
	}
	asset["license_status"], asset["licensor"], asset["license_name"] = "licensed_verified", "Example Vendor", "Commercial licence"
	asset["commercial_use_permitted"], asset["is_real_vehicle_geometry"], asset["approved_at"] = true, false, "2026-11-14"
	if code, v = c.do("PUT", "/api/v1/admin/r/media_assets/"+jsonNum(assetID), asset); code != 200 {
		t.Fatalf("approve: %d %v", code, v)
	}
	if code, v = c.do("POST", "/api/v1/admin/r/asset_mesh_bindings", map[string]any{"asset_id": assetID, "mesh_name": "wheel_fl", "assembly_id": wheels,
		"explode_x": 0, "explode_y": 0, "explode_z": 0.4}); code != 201 {
		t.Fatalf("binding: %d %v", code, v)
	}
	_, v = c.do("GET", "/api/v1/vehicles/ferrari-488-gtb", nil)
	m := v["model3d"].(map[string]any)
	if m["isRealVehicleGeometry"] != false || len(m["bindings"].([]any)) != 1 {
		t.Fatalf("model3d: %v", m)
	}

	if code, _ = c.do("DELETE", "/api/v1/admin/r/vehicles/1", nil); code != 405 {
		t.Fatal("vehicles must not be deletable")
	}
	c.do("POST", "/api/v1/admin/logout", nil)
	if code, _ = c.do("GET", "/api/v1/admin/me", nil); code != 401 {
		t.Fatal("session should end on logout")
	}
}

func jsonNum(f float64) string { b, _ := json.Marshal(f); return string(b) }
