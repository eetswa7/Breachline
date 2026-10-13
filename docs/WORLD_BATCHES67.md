# Centred world batches, 14 October 2026

The pre-existing Blacksite centre fixture exceeded the 220 active-world-batch
budget at 223. Spatial cells split at both map axes, dividing the central hall
into four independently submitted quadrants. Centring the cells on the map
origin preserves the existing cell width, instancing, per-instance detail
selection, conservative bounds and frustum culling while reducing that split.

The isolated Release 66 source comparison covers all sixteen maps and 49
viewpoints. Its maximum falls from 223 to 212; every centred fixture passes the
existing 220 limit. The source baseline is `d38e0f1`. No new geometry, texture,
shader, pass, pool or collider is introduced by this batching change.

| Blacksite view | Original active batches | Centred active batches |
| --- | ---: | ---: |
| Spawn | 219 | 198 |
| Centre | 223 | 194 |
| Approach | 218 | 197 |
| Interior | 222 | 196 |

Full-detail geometry is retained. Selected triangle counts change slightly
because the existing batch-based far-detail policy observes different bounds;
individual near/far instance selection remains available. Actual native visual
comparison and the final new-architecture budget gate will follow integration.
These are scene-construction counts, not GPU timings or physical iPhone FPS.

Reproduce the established scene budget with
`node scripts/validate-art-scenes.mjs work/scene-budgets.json`.
