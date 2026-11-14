// Lists the disconnected geometry "islands" of each mesh in a glTF/GLB file, with
// world-space centres and sizes. Used for the Phase 2 exterior audit of the demo model.
// Run from a scratch folder:  npm i @gltf-transform/core @gltf-transform/extensions draco3dgltf
//   node glb_islands.mjs path/to/model.glb [meshName]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule() });
const doc = await io.read(process.argv[2]);
const only = process.argv[3];
const out = {};
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  if (only && node.getName() !== only) continue;
  const wm = node.getWorldMatrix();
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
    const n = pos.getCount(); const key = new Map(); const id = new Int32Array(n);
    const v = [0,0,0];
    for (let i=0;i<n;i++){ pos.getElement(i,v); const k=v.map(x=>Math.round(x*1e4)).join(','); if(!key.has(k)) key.set(k,key.size); id[i]=key.get(k); }
    const par = new Int32Array(key.size).map((_,i)=>i); const f=x=>{while(par[x]!==x){par[x]=par[par[x]];x=par[x];}return x;};
    const tri = idx ? idx.getCount() : n;
    for (let t=0;t<tri;t+=3){ const a=id[idx?idx.getScalar(t):t], b=id[idx?idx.getScalar(t+1):t+1], c=id[idx?idx.getScalar(t+2):t+2]; par[f(a)]=f(b); par[f(b)]=f(c); }
    const isl = new Map();
    for (let i=0;i<n;i++){ pos.getElement(i,v); const x=wm[0]*v[0]+wm[4]*v[1]+wm[8]*v[2]+wm[12], y=wm[1]*v[0]+wm[5]*v[1]+wm[9]*v[2]+wm[13], z=wm[2]*v[0]+wm[6]*v[1]+wm[10]*v[2]+wm[14];
      const r=f(id[i]); let s=isl.get(r); if(!s){s={n:0,min:[1e9,1e9,1e9],max:[-1e9,-1e9,-1e9]};isl.set(r,s);} s.n++; [x,y,z].forEach((q,j)=>{s.min[j]=Math.min(s.min[j],q);s.max[j]=Math.max(s.max[j],q);}); }
    const list=[...isl.values()].sort((a,b)=>b.n-a.n);
    out[node.getName()] = { verts:n, tris: tri/3, islands: list.length, material: prim.getMaterial()?.getName(), top: list.slice(0, only?80:6).map(s=>({n:s.n, min:s.min.map(q=>+q.toFixed(2)), max:s.max.map(q=>+q.toFixed(2))})) };
  }
}
console.log(JSON.stringify(out, null, only ? 1 : 0).slice(0, 60000));
