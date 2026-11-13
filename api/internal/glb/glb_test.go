package glb

import (
	"bytes"
	"encoding/binary"
	"strings"
	"testing"
)

func makeGLB(t *testing.T, js string) []byte {
	t.Helper()
	for len(js)%4 != 0 {
		js += " "
	}
	var b bytes.Buffer
	w := func(v uint32) { _ = binary.Write(&b, binary.LittleEndian, v) }
	w(magicGLB)
	w(2)
	w(uint32(12 + 8 + len(js)))
	w(uint32(len(js)))
	w(chunkJSON)
	b.WriteString(js)
	return b.Bytes()
}

const sample = `{"asset":{"version":"2.0","generator":"test"},
 "nodes":[{"name":"root","children":[1,2,3]},{"name":"wheel_fl","mesh":0},{"name":"door_l","mesh":1},{"mesh":1}],
 "meshes":[{"name":"Wheel","primitives":[{},{}]},{"name":"Door","primitives":[{}]}]}`

func TestReadGLB(t *testing.T) {
	inv, err := Read(bytes.NewReader(makeGLB(t, sample)))
	if err != nil {
		t.Fatal(err)
	}
	if inv.Nodes != 4 || len(inv.MeshNodes) != 2 || inv.UnnamedMesh != 1 || inv.Generator != "test" {
		t.Fatalf("inventory: %+v", inv)
	}
	if inv.MeshNodes[0].Name != "door_l" || inv.MeshNodes[1].Primitives != 2 || !inv.Selectable() {
		t.Fatalf("mesh nodes: %+v", inv.MeshNodes)
	}
}

func TestReadGLTFAndSingleMesh(t *testing.T) {
	inv, err := Read(strings.NewReader(`{"nodes":[{"name":"car_body","mesh":0}],"meshes":[{"primitives":[{}]}]}`))
	if err != nil {
		t.Fatal(err)
	}
	if inv.Selectable() {
		t.Fatal("a single-mesh car must not count as selectable")
	}
}

func TestDuplicatesAndErrors(t *testing.T) {
	inv, err := Read(strings.NewReader(`{"nodes":[{"name":"a","mesh":0},{"name":"a","mesh":0},{"name":"b","mesh":0}],"meshes":[{"primitives":[]}]}`))
	if err != nil || inv.Selectable() || len(inv.DuplicateIDs) != 1 {
		t.Fatalf("duplicates: %+v %v", inv, err)
	}
	if _, err := Read(strings.NewReader(`{"nodes":[{"name":"x","mesh":3}],"meshes":[]}`)); err == nil {
		t.Fatal("expected missing-mesh error")
	}
	if _, err := Read(strings.NewReader("PNG....")); err == nil {
		t.Fatal("expected not-glTF error")
	}
}
