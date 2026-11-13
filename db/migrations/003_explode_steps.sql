-- Step-by-step disassembly order for a licensed asset. Steps come from the
-- asset's own assembly metadata (or an admin's documented mapping); NULL means
-- "no recorded order" and the mesh moves with the final step.
ALTER TABLE asset_mesh_bindings
  ADD COLUMN explode_step integer CHECK (explode_step IS NULL OR explode_step BETWEEN 1 AND 99);

-- Mesh inventory captured from the uploaded file by `atlas-api glb-meshes`,
-- so admins can confirm the asset really has separately selectable parts.
ALTER TABLE media_assets
  ADD COLUMN mesh_node_count integer CHECK (mesh_node_count IS NULL OR mesh_node_count >= 0);
