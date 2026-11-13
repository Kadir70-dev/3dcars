// Package resources declares the admin-editable tables and validates input.
// Column names used in SQL come only from these definitions, never from input.
package resources

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type Kind string

const (
	Text     Kind = "text"
	LongText Kind = "longtext"
	Int      Kind = "int"
	Float    Kind = "float"
	Bool     Kind = "bool"
	Date     Kind = "date"
	URL      Kind = "url"
	Enum     Kind = "enum"
	Ref      Kind = "ref"
)

type Field struct {
	Name     string   `json:"name"`
	Label    string   `json:"label"`
	Kind     Kind     `json:"kind"`
	Required bool     `json:"required"`
	ReadOnly bool     `json:"readOnly,omitempty"`
	Options  []string `json:"options,omitempty"` // enum values
	RefTable string   `json:"refResource,omitempty"`
	Pattern  string   `json:"pattern,omitempty"`
	Help     string   `json:"help,omitempty"`
	Cast     string   `json:"-"` // SQL cast for enums, e.g. "verification_status"
}

type Resource struct {
	Name      string  `json:"name"`
	Label     string  `json:"label"`
	Table     string  `json:"-"`
	Fields    []Field `json:"fields"`
	ListOrder string  `json:"-"`
	NoCreate  bool    `json:"noCreate,omitempty"`
	NoDelete  bool    `json:"noDelete,omitempty"`
}

var Verification = []string{"verified", "publicly_listed", "unverified", "source_required", "disputed"}

// provenance returns the standard provenance fields.
func provenance(withScope bool) []Field {
	f := []Field{
		{Name: "source_id", Label: "Source", Kind: Ref, RefTable: "sources", Required: true},
		{Name: "source_ref", Label: "Source reference (page, diagram, callout)", Kind: Text},
		{Name: "checked_on", Label: "Date checked", Kind: Date},
	}
	if withScope {
		f = append(f, Field{Name: "scope_note", Label: "Vehicle / model-year scope", Kind: LongText})
	}
	return append(f, Field{Name: "verification_status", Label: "Verification", Kind: Enum, Options: Verification, Required: true, Cast: "verification_status",
		Help: "'verified' is only accepted with an OEM-authorized or licensed source (or a manufacturer publication for vehicle facts)."})
}

func join(a []Field, b ...[]Field) []Field {
	out := append([]Field{}, a...)
	for _, x := range b {
		out = append(out, x...)
	}
	return out
}

var slugRe = `^[a-z0-9-]+$`

var All = []Resource{
	{Name: "sources", Label: "Sources", Table: "sources", ListOrder: "id", Fields: []Field{
		{Name: "title", Label: "Title", Kind: Text, Required: true},
		{Name: "publisher", Label: "Publisher", Kind: Text, Required: true},
		{Name: "source_type", Label: "Type", Kind: Enum, Required: true, Cast: "source_type",
			Options: []string{"oem_authorized", "licensed_third_party", "manufacturer_publication", "public_retailer_index", "project_classification"}},
		{Name: "url", Label: "URL", Kind: URL},
		{Name: "license_notes", Label: "Licence notes", Kind: LongText},
		{Name: "access_requirements", Label: "Access requirements", Kind: LongText},
	}},
	{Name: "vehicles", Label: "Vehicles", Table: "vehicles", ListOrder: "id", NoDelete: true, Fields: []Field{
		{Name: "slug", Label: "Slug", Kind: Text, Required: true, Pattern: slugRe},
		{Name: "make", Label: "Make", Kind: Text, Required: true},
		{Name: "model", Label: "Model", Kind: Text, Required: true},
		{Name: "market", Label: "Market", Kind: Text},
		{Name: "summary", Label: "Summary", Kind: LongText},
		{Name: "is_active", Label: "Active (public)", Kind: Bool, Help: "Only Ferrari 488 GTB may be active until its milestone is approved."},
	}},
	{Name: "vehicle_facts", Label: "Vehicle facts", Table: "vehicle_facts", ListOrder: "vehicle_id, sort_order", Fields: join([]Field{
		{Name: "vehicle_id", Label: "Vehicle", Kind: Ref, RefTable: "vehicles", Required: true},
		{Name: "label", Label: "Label", Kind: Text, Required: true},
		{Name: "value", Label: "Value", Kind: Text, Required: true},
		{Name: "sort_order", Label: "Order", Kind: Int},
	}, provenance(true))},
	{Name: "model_years", Label: "Model years", Table: "model_years", ListOrder: "vehicle_id, year", Fields: join([]Field{
		{Name: "vehicle_id", Label: "Vehicle", Kind: Ref, RefTable: "vehicles", Required: true},
		{Name: "year", Label: "Year", Kind: Int, Required: true},
	}, provenance(true))},
	{Name: "assemblies", Label: "Assemblies", Table: "assemblies", ListOrder: "vehicle_id, code", Fields: join([]Field{
		{Name: "vehicle_id", Label: "Vehicle", Kind: Ref, RefTable: "vehicles", Required: true},
		{Name: "system_id", Label: "System", Kind: Ref, RefTable: "vehicle_systems"},
		{Name: "code", Label: "Group code", Kind: Text, Required: true},
		{Name: "name", Label: "Name", Kind: Text, Required: true},
		{Name: "summary", Label: "Summary", Kind: LongText},
	}, provenance(true))},
	{Name: "parts", Label: "Parts", Table: "parts", ListOrder: "id", Fields: join([]Field{
		{Name: "oem_part_number", Label: "OEM part number", Kind: Text, Help: "Leave empty unless an authorized source provides it."},
		{Name: "name", Label: "Name", Kind: Text, Required: true},
		{Name: "description", Label: "Description", Kind: LongText},
		{Name: "revision", Label: "Revision", Kind: Text},
	}, provenance(true))},
	{Name: "assembly_parts", Label: "Assembly ↔ part links", Table: "assembly_parts", ListOrder: "assembly_id, diagram_ref", Fields: join([]Field{
		{Name: "assembly_id", Label: "Assembly", Kind: Ref, RefTable: "assemblies", Required: true},
		{Name: "part_id", Label: "Part", Kind: Ref, RefTable: "parts", Required: true},
		{Name: "quantity", Label: "Quantity", Kind: Int},
		{Name: "diagram_ref", Label: "Diagram callout", Kind: Text},
	}, provenance(false))},
	{Name: "part_specs", Label: "Part specifications", Table: "part_specs", ListOrder: "part_id, spec_key", Fields: join([]Field{
		{Name: "part_id", Label: "Part", Kind: Ref, RefTable: "parts", Required: true},
		{Name: "spec_key", Label: "Specification", Kind: Text, Required: true},
		{Name: "spec_value", Label: "Value", Kind: Text, Required: true},
		{Name: "unit", Label: "Unit", Kind: Text},
	}, provenance(true))},
	{Name: "fitments", Label: "Fitments", Table: "fitments", ListOrder: "part_id", Fields: join([]Field{
		{Name: "part_id", Label: "Part", Kind: Ref, RefTable: "parts", Required: true},
		{Name: "vehicle_id", Label: "Vehicle", Kind: Ref, RefTable: "vehicles", Required: true},
		{Name: "model_year_id", Label: "Model year", Kind: Ref, RefTable: "model_years"},
		{Name: "market", Label: "Market", Kind: Text},
		{Name: "vin_from", Label: "VIN / chassis from", Kind: Text, Pattern: `^[A-HJ-NPR-Z0-9]{1,17}$`},
		{Name: "vin_to", Label: "VIN / chassis to", Kind: Text, Pattern: `^[A-HJ-NPR-Z0-9]{1,17}$`},
		{Name: "notes", Label: "Notes", Kind: LongText},
	}, provenance(false))},
	{Name: "media_assets", Label: "Media & 3D assets", Table: "media_assets", ListOrder: "id", Fields: []Field{
		{Name: "vehicle_id", Label: "Vehicle", Kind: Ref, RefTable: "vehicles", Required: true},
		{Name: "kind", Label: "Kind", Kind: Enum, Options: []string{"model_3d", "image", "diagram"}, Required: true, Cast: "asset_kind"},
		{Name: "title", Label: "Title", Kind: Text, Required: true},
		{Name: "url", Label: "File URL (.glb for 3D)", Kind: URL},
		{Name: "licensor", Label: "Licensor", Kind: Text},
		{Name: "license_name", Label: "Licence name", Kind: Text},
		{Name: "license_url", Label: "Licence URL", Kind: URL},
		{Name: "license_status", Label: "Licence status", Kind: Enum, Options: []string{"none", "pending_review", "licensed_verified", "rejected"}, Required: true, Cast: "license_status"},
		{Name: "commercial_use_permitted", Label: "Commercial use permitted", Kind: Bool},
		{Name: "is_real_vehicle_geometry", Label: "Real vehicle geometry", Kind: Bool, Help: "True only if the asset reproduces the actual car (scan/CAD/accurate model)."},
		{Name: "source_id", Label: "Source", Kind: Ref, RefTable: "sources"},
		{Name: "notes", Label: "Notes", Kind: LongText},
		{Name: "mesh_node_count", Label: "Named mesh nodes in file", Kind: Int, Help: "From `atlas-api glb-meshes <file>`. A single-mesh car cannot drive the parts explorer."},
		{Name: "approved_at", Label: "Approved at", Kind: Date, Help: "Set only after the owner approves the licence."},
	}},
	{Name: "asset_mesh_bindings", Label: "3D mesh bindings", Table: "asset_mesh_bindings", ListOrder: "asset_id, mesh_name", Fields: []Field{
		{Name: "asset_id", Label: "Asset", Kind: Ref, RefTable: "media_assets", Required: true},
		{Name: "mesh_name", Label: "Mesh name (exact, from the asset)", Kind: Text, Required: true},
		{Name: "assembly_id", Label: "Assembly", Kind: Ref, RefTable: "assemblies"},
		{Name: "part_id", Label: "Part", Kind: Ref, RefTable: "parts"},
		{Name: "explode_x", Label: "Explode X", Kind: Float},
		{Name: "explode_y", Label: "Explode Y", Kind: Float},
		{Name: "explode_z", Label: "Explode Z", Kind: Float},
		{Name: "explode_step", Label: "Disassembly step (1 = first out)", Kind: Int},
		{Name: "notes", Label: "Notes (where offsets came from)", Kind: LongText},
	}},
	{Name: "data_gaps", Label: "Data gaps", Table: "data_gaps", ListOrder: "vehicle_id, sort_order", Fields: []Field{
		{Name: "vehicle_id", Label: "Vehicle", Kind: Ref, RefTable: "vehicles", Required: true},
		{Name: "area", Label: "Area", Kind: Text, Required: true},
		{Name: "missing", Label: "What is missing", Kind: LongText, Required: true},
		{Name: "access_needed", Label: "Access / licence needed", Kind: LongText, Required: true},
		{Name: "status", Label: "Status", Kind: Enum, Options: []string{"open", "in_progress", "resolved"}, Required: true},
		{Name: "sort_order", Label: "Order", Kind: Int},
	}},
	{Name: "quote_requests", Label: "Quote requests", Table: "quote_requests", ListOrder: "id DESC", NoCreate: true, Fields: []Field{
		{Name: "name", Label: "Name", Kind: Text, ReadOnly: true},
		{Name: "email", Label: "Email", Kind: Text, ReadOnly: true},
		{Name: "vin", Label: "VIN", Kind: Text, ReadOnly: true},
		{Name: "message", Label: "Message", Kind: LongText, ReadOnly: true},
		{Name: "status", Label: "Status", Kind: Enum, Options: []string{"received", "reviewing", "closed"}, Required: true},
	}},
}

func Get(name string) (Resource, bool) {
	for _, r := range All {
		if r.Name == name {
			return r, true
		}
	}
	return Resource{}, false
}

// ValidationError lists field-level problems.
type ValidationError map[string]string

func (v ValidationError) Error() string {
	parts := make([]string, 0, len(v))
	for k, m := range v {
		parts = append(parts, k+": "+m)
	}
	return "validation failed: " + strings.Join(parts, "; ")
}

// Normalize validates raw JSON input against the resource and returns column
// values ready for SQL. Missing optional fields become NULL; read-only fields
// are ignored. Unknown keys are rejected.
func (r Resource) Normalize(in map[string]any) (map[string]any, error) {
	errs := ValidationError{}
	known := map[string]bool{"id": true}
	out := map[string]any{}
	for _, f := range r.Fields {
		known[f.Name] = true
		if f.ReadOnly {
			continue
		}
		raw, present := in[f.Name]
		v, err := coerce(f, raw, present)
		if err != nil {
			errs[f.Name] = err.Error()
			continue
		}
		out[f.Name] = v
	}
	for k := range in {
		if !known[k] {
			errs[k] = "unknown field"
		}
	}
	if len(errs) > 0 {
		return nil, errs
	}
	return out, nil
}

func blank(raw any) bool {
	if raw == nil {
		return true
	}
	s, ok := raw.(string)
	return ok && strings.TrimSpace(s) == ""
}

func coerce(f Field, raw any, present bool) (any, error) {
	if !present || blank(raw) {
		if f.Required {
			return nil, fmt.Errorf("required")
		}
		if f.Kind == Bool && f.Name == "is_active" {
			return false, nil
		}
		return nil, nil
	}
	switch f.Kind {
	case Text, LongText, URL, Enum:
		s, ok := raw.(string)
		if !ok {
			return nil, fmt.Errorf("must be a string")
		}
		s = strings.TrimSpace(s)
		max := 300
		if f.Kind == LongText {
			max = 5000
		}
		if len(s) > max {
			return nil, fmt.Errorf("too long (max %d)", max)
		}
		if f.Pattern != "" && !regexp.MustCompile(f.Pattern).MatchString(s) {
			return nil, fmt.Errorf("invalid format")
		}
		if f.Kind == URL {
			u, err := url.Parse(s)
			if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.Host == "" {
				return nil, fmt.Errorf("must be an http(s) URL")
			}
		}
		if f.Kind == Enum {
			for _, o := range f.Options {
				if o == s {
					return s, nil
				}
			}
			return nil, fmt.Errorf("must be one of %s", strings.Join(f.Options, ", "))
		}
		return s, nil
	case Int, Ref:
		n, ok := raw.(float64)
		if !ok || n != float64(int64(n)) {
			return nil, fmt.Errorf("must be an integer")
		}
		if f.Kind == Ref && n <= 0 {
			return nil, fmt.Errorf("must reference an existing record")
		}
		return int64(n), nil
	case Float:
		n, ok := raw.(float64)
		if !ok {
			return nil, fmt.Errorf("must be a number")
		}
		return n, nil
	case Bool:
		b, ok := raw.(bool)
		if !ok {
			return nil, fmt.Errorf("must be true or false")
		}
		return b, nil
	case Date:
		s, ok := raw.(string)
		if !ok {
			return nil, fmt.Errorf("must be a date (YYYY-MM-DD)")
		}
		t, err := time.Parse("2006-01-02", strings.TrimSpace(s))
		if err != nil {
			return nil, fmt.Errorf("must be a date (YYYY-MM-DD)")
		}
		return t, nil
	}
	return nil, fmt.Errorf("unsupported field kind")
}
