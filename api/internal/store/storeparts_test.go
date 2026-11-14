package store

import "testing"

func TestModelWord(t *testing.T) {
	cases := map[[2]string]string{
		{"Ferrari", "FERRARI 488 GTB (USA)"}:            "488",
		{"Ferrari", "488 SPIDER (EUROPE)"}:              "488",
		{"Ferrari", "FERRARI458"}:                       "458",
		{"Lamborghini", "Lamborghini Huracan (Europe)"}: "HURACAN",
		{"Maserati", "MASERATI QUATTROPORTE M156"}:      "QUATTROPORTE",
		{"Lamborghini", "2016 Hurancan LP610"}:          "HURANCAN",
		{"Lamborghini", "2019"}:                         "",
		{"Ferrari", "(EUROPE)"}:                         "",
		{"Ferrari", ""}:                                 "",
		{"Ferrari", "FERRARI 812 COMPETIZIONE"}:         "812",
	}
	for in, want := range cases {
		if got := ModelWord(in[0], in[1]); got != want {
			t.Errorf("ModelWord(%q, %q) = %q, want %q", in[0], in[1], got, want)
		}
	}
}
