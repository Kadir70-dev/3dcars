// Regenerate the standalone procedural GT concept GLB with Node 24:
// node --experimental-strip-types scripts/export_maserati_concept_glb.mjs
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { GLTFExporter } from "../web/node_modules/three/examples/jsm/exporters/GLTFExporter.js";
import { buildMaseratiConcept } from "../web/lib/maseratiConcept.ts";

// Three.js' exporter uses FileReader for binary serialization; Node provides
// Blob but no FileReader, so this small adapter keeps the export dependency-free.
class NodeFileReader {
  async readAsArrayBuffer(blob) {
    this.result = await blob.arrayBuffer();
    this.onloadend?.();
  }

  async readAsDataURL(blob) {
    const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
    this.result = `data:${blob.type};base64,${data}`;
    this.onloadend?.();
  }
}

globalThis.FileReader = NodeFileReader;
const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(buildMaseratiConcept(), { binary: true, onlyVisible: true });
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../web/public/models/demo");
await writeFile(resolve(root, "maserati-gt-concept-procedural.glb"), Buffer.from(glb));
console.log(`Exported ${glb.byteLength} bytes to web/public/models/demo/maserati-gt-concept-procedural.glb`);
