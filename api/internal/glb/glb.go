// Package glb reads the node/mesh inventory of a glTF 2.0 file (.glb or .gltf)
// without loading geometry. It is used to check that a candidate 3D asset has
// separately selectable, named component meshes before anyone binds parts to it.
package glb

import (
	"bytes"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sort"
)

const (
	magicGLB  = 0x46546C67 // "glTF"
	chunkJSON = 0x4E4F534A // "JSON"
	maxJSON   = 64 << 20
)

// MeshNode is a scene node that carries geometry.
type MeshNode struct {
	Name       string `json:"name"`
	Mesh       string `json:"mesh"`
	Primitives int    `json:"primitives"`
}

// Inventory summarises what a viewer could select in the file.
type Inventory struct {
	Nodes        int        `json:"nodes"`
	MeshNodes    []MeshNode `json:"meshNodes"`
	UnnamedMesh  int        `json:"unnamedMeshNodes"`
	DuplicateIDs []string   `json:"duplicateNames"`
	Generator    string     `json:"generator,omitempty"`
}

// Selectable reports whether the file has at least two uniquely named mesh nodes.
func (inv Inventory) Selectable() bool { return len(inv.MeshNodes) >= 2 && len(inv.DuplicateIDs) == 0 }

type doc struct {
	Asset struct {
		Generator string `json:"generator"`
	} `json:"asset"`
	Nodes []struct {
		Name string `json:"name"`
		Mesh *int   `json:"mesh"`
	} `json:"nodes"`
	Meshes []struct {
		Name       string            `json:"name"`
		Primitives []json.RawMessage `json:"primitives"`
	} `json:"meshes"`
}

// Read parses a .glb container or plain .gltf JSON.
func Read(r io.Reader) (Inventory, error) {
	head := make([]byte, 12)
	n, err := io.ReadFull(r, head)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		return Inventory{}, fmt.Errorf("read header: %w", err)
	}
	head = head[:n]
	var raw []byte
	if len(head) == 12 && binary.LittleEndian.Uint32(head) == magicGLB {
		if v := binary.LittleEndian.Uint32(head[4:]); v != 2 {
			return Inventory{}, fmt.Errorf("unsupported glTF version %d", v)
		}
		var ch [8]byte
		if _, err := io.ReadFull(r, ch[:]); err != nil {
			return Inventory{}, fmt.Errorf("read chunk header: %w", err)
		}
		size, kind := binary.LittleEndian.Uint32(ch[:]), binary.LittleEndian.Uint32(ch[4:])
		if kind != chunkJSON {
			return Inventory{}, errors.New("first GLB chunk is not JSON")
		}
		if size > maxJSON {
			return Inventory{}, errors.New("GLB JSON chunk too large")
		}
		raw = make([]byte, size)
		if _, err := io.ReadFull(r, raw); err != nil {
			return Inventory{}, fmt.Errorf("read JSON chunk: %w", err)
		}
	} else {
		rest, err := io.ReadAll(io.LimitReader(r, maxJSON))
		if err != nil {
			return Inventory{}, err
		}
		raw = append(head, rest...)
		if !bytes.HasPrefix(bytes.TrimSpace(raw), []byte("{")) {
			return Inventory{}, errors.New("not a glTF file")
		}
	}
	var d doc
	if err := json.Unmarshal(raw, &d); err != nil {
		return Inventory{}, fmt.Errorf("parse glTF JSON: %w", err)
	}
	inv := Inventory{Nodes: len(d.Nodes), Generator: d.Asset.Generator, MeshNodes: []MeshNode{}, DuplicateIDs: []string{}}
	seen := map[string]int{}
	for _, nd := range d.Nodes {
		if nd.Mesh == nil {
			continue
		}
		if *nd.Mesh < 0 || *nd.Mesh >= len(d.Meshes) {
			return Inventory{}, fmt.Errorf("node %q references missing mesh %d", nd.Name, *nd.Mesh)
		}
		if nd.Name == "" {
			inv.UnnamedMesh++
			continue
		}
		m := d.Meshes[*nd.Mesh]
		seen[nd.Name]++
		inv.MeshNodes = append(inv.MeshNodes, MeshNode{Name: nd.Name, Mesh: m.Name, Primitives: len(m.Primitives)})
	}
	for name, c := range seen {
		if c > 1 {
			inv.DuplicateIDs = append(inv.DuplicateIDs, name)
		}
	}
	sort.Strings(inv.DuplicateIDs)
	sort.Slice(inv.MeshNodes, func(i, j int) bool { return inv.MeshNodes[i].Name < inv.MeshNodes[j].Name })
	return inv, nil
}
