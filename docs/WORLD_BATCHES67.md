# Centred world batches and conservative LOD bounds, 14 October 2026

The pre-existing Blacksite centre fixture exceeded the 220 active-world-batch
budget at 223. Spatial cells split at both map axes, dividing the central hall
into four independently submitted quadrants. Centring the cells on the map
origin preserves the existing cell width, instancing, per-instance detail
selection, retained batch bounds and frustum culling while reducing that split.

The isolated source comparison covers all sixteen maps and 49 viewpoints. Its
maximum falls from 223 to 212; every centred fixture passes the existing 220
limit. The original cell assignment is from `d38e0f1` and the centred change is
`3d36f64`. The [reproduced source comparison](art-release67/world-batches/source-comparison.json)
also passes after the separate bounds correction below. Full-detail geometry is
identical in every map. No new geometry, texture, shader, pass, pool or collider
is introduced by this batching change.

| Blacksite view | Original active batches | Centred active batches |
| --- | ---: | ---: |
| Spawn | 219 | 198 |
| Centre | 223 | 194 |
| Approach | 218 | 197 |
| Interior | 222 | 196 |

## Native cell-only gameplay comparison

[The native browser report](art-release67/world-batches/cells/validation.json)
compares immutable snapshots of the same runtime modules, changing only the
cell assignment. It renders all sixteen maps at 49 legal standing gameplay
cameras, then four Blacksite positions beside the positive/negative cell edges.
Four additional full-detail Blacksite comparisons disable detail selection to
check identical source geometry. The 844 × 390 SwiftShader viewport is desktop
software WebGL, not a physical iPhone. Bots are removed to hold paired fixtures
fixed; native world assets and first-person weapon presentation remain loaded.

All camera, collision-free placement, full appearance descriptor, authoritative
map-state, per-instance detail-selection, texture estimate and render-pass checks
pass. Every centred normal fixture stays within the 220 active-world-batch cap;
the native maximum is 210. Source and native counts differ because their camera
projection, legal placement and LOD history differ.

| Blacksite native view | Original batches | Centred batches | Original frame draws | Centred frame draws |
| --- | ---: | ---: | ---: | ---: |
| Spawn | 215 | 195 | 251 | 245 |
| Centre | 224 | 195 | 213 | 192 |
| Approach | 219 | 198 | 277 | 233 |
| Interior | 222 | 195 | 232 | 201 |

Inspected matched [approach](art-release67/world-batches/cells/map-14-approach-centred.png),
[interior](art-release67/world-batches/cells/blacksite-interior-centred.png),
[centre](art-release67/world-batches/cells/map-14-centre-centred.png) and
[spawn](art-release67/world-batches/cells/map-14-spawn-centred.png) frames retain
the hall silhouette, portal reveals, loading slabs, trusses, machinery, shadows,
surface markings and weapon framing. The centre is pixel-exact. The other three
normal Blacksite pairs differ at only 14–36 pixels above two RGB levels out of
329,160 pixels. Full-detail and cell-edge pairs show the same visible forms.
Matched Old Quarter, Canopy, Monsoon and Nuketown spawn frames were also inspected.
[The image manifest](art-release67/world-batches/cells/manifest.json) records
the 32 untouched screenshot files and hashes. The separate
[manual image review](art-release67/world-batches/visual-review.json) lists the
34 inspected images across both comparisons. This is preservation acceptance
of the cell change; coarse architecture, foliage and weapon forms still fall
short of the professional art target.

Selected triangle counts can change because the retained batch-based far-detail
policy observes different bounds. Per-instance near/far selection is identical.
Fewer draws do not guarantee less submitted geometry: Blacksite approach frame
triangles rise from 269,120 to 277,028 and interior triangles from 273,664 to
298,068 as the new cells affect frustum submission. These are complete software
frame counts, including the scheduled shadow update and weapon pass. They do
not establish GPU cost or improved device performance.

## Separate near/far bounds correction

The extra culling probe exposed a pre-existing limitation: simplified strata
rock vertices can extend beyond a sphere derived only from the near mesh. The
cell-only report deliberately retains its failed conservative-bounds gate.
Dustline has one protruding instance with original cells and two with centred
cells; Iron Quarry has a protrusion in its centre/approach views. Iron Quarry's
centred spawn also reports one conservative instance-sphere/frustum disagreement,
with no actual vertex outside its batch sphere. That probe alone does not prove
visible geometry loss, but the retained bounds needed correction.

`unionBlenderLODBounds` now unions each native near/far pair's existing local box
and sphere before scene construction and stores the union on both alternatives.
The [real-asset regressions](../tests/blender-lod-bounds.test.mjs) reproduce the
original protrusion, verify all 112 authored near/far pairs under rotated and
nonuniform transforms, and preserve containment through LOD swaps, destruction
and rebuilding. No additional retained bound objects or rendering resources are
created.

[The targeted post-fix native comparison](art-release67/world-batches/bounds/validation.json)
uses centred cells on both sides and changes only the bounds-union constructor
call. All nine spawn/centre/approach fixtures across Dustline, Citadel and Iron
Quarry pass, with zero sphere/vertex protrusions and zero instance-sphere/frustum
disagreements after the fix. All nine before/after framebuffers are pixel-exact.
Inspected [Dustline](art-release67/world-batches/bounds/map-2-spawn-centred.png),
[Citadel](art-release67/world-batches/bounds/map-5-centre-centred.png) and
[Iron Quarry](art-release67/world-batches/bounds/map-9-spawn-centred.png) pairs
preserve their ground, architecture, rocks, silhouettes, shadows and weapon.
[The 18-image manifest](art-release67/world-batches/bounds/manifest.json) and
module hashes distinguish this bounds correction from the earlier cell-only
capture. All nine preserve active batch counts, instance counts, native
presentation, gameplay state, per-instance detail, texture estimates and passes.

More conservative bounds admit one additional Iron Quarry spawn draw and 64
complete-frame triangles without changing its pixels. Citadel centre selects 88
additional world triangles outside the visible frame. Those bounded changes
restore the conservative contract; they are not a performance improvement claim.
Comprehensive render occlusion culling and physical iPhone/Safari performance
remain outside this acceptance.

Reproduce source counts with
`node scripts/compare-world-batch-scenes.mjs work/world-batches67-source.json`.
Reproduce the complete native cell comparison with
`node scripts/check-world-batches-browser.mjs --out=work/world-batches67-cells`.
Reproduce targeted bounds acceptance with
`node scripts/check-world-batches-browser.mjs --comparison=bounds --maps=2,5,9 --views=spawn,centre,approach --out=work/world-batches67-bounds`.
The existing source budget gate remains
`node scripts/validate-art-scenes.mjs work/scene-budgets.json`.
