package resources

import "time"

// ActiveVehicleAllowlist is the set of vehicles that may be public. Ferrari
// stays the only active vehicle until its milestone is reviewed.
var ActiveVehicleAllowlist = map[string]bool{"ferrari-488-gtb": true}

// VerifiedAllowed reports whether a record of this resource may be marked
// 'verified' when it cites a source of the given type.
func VerifiedAllowed(resource, sourceType string) bool {
	switch sourceType {
	case "oem_authorized", "licensed_third_party":
		return true
	case "manufacturer_publication":
		// Public Ferrari publications can verify model-level facts only.
		return resource == "vehicle_facts" || resource == "model_years"
	}
	return false
}

// CheckPolicy enforces cross-field rules that do not need the database.
func CheckPolicy(resource string, v map[string]any) error {
	errs := ValidationError{}
	switch resource {
	case "vehicles":
		if v["is_active"] == true {
			if slug, _ := v["slug"].(string); !ActiveVehicleAllowlist[slug] {
				errs["is_active"] = "only the Ferrari 488 GTB may be active until its milestone is approved"
			}
		}
	case "media_assets":
		status, _ := v["license_status"].(string)
		if status == "licensed_verified" {
			for _, k := range []string{"licensor", "license_name", "url"} {
				if v[k] == nil {
					errs[k] = "required when licence is verified"
				}
			}
			if v["commercial_use_permitted"] != true {
				errs["commercial_use_permitted"] = "a verified licence must permit commercial use"
			}
			if v["is_real_vehicle_geometry"] == nil {
				errs["is_real_vehicle_geometry"] = "state whether this is real vehicle geometry"
			}
		}
		if _, ok := v["approved_at"].(time.Time); ok && status != "licensed_verified" {
			errs["approved_at"] = "only a verified licence can be approved"
		}
	case "fitments":
		if v["vin_from"] == nil && v["vin_to"] != nil {
			errs["vin_from"] = "required when VIN to is set"
		}
	}
	if len(errs) > 0 {
		return errs
	}
	return nil
}
