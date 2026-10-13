# World material variation, 13 October 2026

This checkpoint reduces synchronized texture motifs on broad natural ground and
masonry surfaces. Each eligible world instance receives a stable texture phase.
Medium, high and ultra quality blend two translated samples of the existing
albedo, normal and packed material maps; low quality uses one phased sample.
The three maps retain the same offsets and blend weight. Explicit derivatives
come from the original metric UV, so offset transitions do not select excessively
blurry mip levels. Translation preserves the existing tangent-space normals.

Weapons, operators, glass, alpha foliage, snow, directional manufactured finishes
and painted service lanes retain their authored presentation. No new texture,
geometry, lighting or full-screen pass is introduced. The existing native sources,
texture payloads, collision, openings and gameplay remain authoritative.

## Preliminary native gameplay review

These unmodified 844 × 390 PNGs use the shipped Game and native Blender renderer
in Chromium/SwiftShader, with a grounded, collision-free standing player. Bots
are removed to hold the scene fixed. Before and after use one renderer at the
same camera, time, quality and LOD; a shared shader uniform disables or enables
the material treatment. Returning to disabled restores the exact raw framebuffer
hash in each scene.

| High-quality view | Disabled treatment | Enabled treatment |
| --- | --- | --- |
| Blacksite approach | [Before](art-release66/materials/blacksite-approach-high-before.png) | [After](art-release66/materials/blacksite-approach-high-after.png) |
| Blacksite interior | [Before](art-release66/materials/blacksite-interior-high-before.png) | [After](art-release66/materials/blacksite-interior-high-after.png) |
| Blacksite forecourt | [Before](art-release66/materials/blacksite-forecourt-high-before.png) | [After](art-release66/materials/blacksite-forecourt-high-after.png) |

The interior shows the clearest change: repeating rectilinear floor streaks give
way to less synchronized finish detail. Concrete-wall stain motifs also vary.
The distant forecourt asphalt changes subtly. Native slab joints, tyre marks,
casting grooves and the building silhouette remain readable. The review finds no
new visible texture seams or displaced surface highlights in these three views.
Blending reduces some fine contrast; closer views, moving cameras and the other
quality tiers still require final integrated review.

This is a bounded material improvement. The dark ceiling, sparse surroundings,
repeated architecture and coarse hero presentation still keep the environment
below the requested professional standard.

## Provenance and measured scope

The [preliminary browser record](validation-world-materials66-preliminary-browser.json)
retains runtime module hashes, native-source identity, image hashes, exact camera
placement and comparison results. The capture was made from a dirty working tree
based on `8ea3391a449cbf2562cf2f9e033d2cd327149098`, still stamped Release 65.
Its staged material-helper hash is
`27b6083ba897937c29b7b60b64518d7269a34106870a1c5e82cc98f0ddc8ecc4`.
The subsequent explicit painted-service-lane exemption is not present in those
preliminary images. They do not claim final Release 66 provenance. Runtime
material-world modules stayed fixed throughout this preliminary capture; the
saved PNGs are byte-exact copies of the captured images.

| High-quality scene | Frame draws | Frame triangles | Active world batches | Selected world triangles |
| --- | ---: | ---: | ---: | ---: |
| Approach | 277 | 269,120 | 219 | 197,254 |
| Interior | 230 | 256,456 | 221 | 208,498 |
| Forecourt | 265 | 241,968 | 219 | 177,426 |

Enabling the treatment changes none of those paired scene counts, the existing
two render passes or the 82,779,926-byte texture estimate. The comparison retains
the new material cache partition in both states; it does not measure the batch
difference from an exact archived Release 65 renderer. Medium/high/ultra add one
sample per PBR map on eligible fragments and additional shader arithmetic, so
unchanged geometry and resource estimates do not establish unchanged GPU cost.
Counts are software scene evidence, not physical iPhone frame times or memory.

All three preliminary comparisons preserve authoritative map state and exact
player-eye cameras, exercise native weapon groups and finish without browser,
request or GL errors. Full quality-tier, representative-map and all-map native
validation will follow the integrated source checkpoint.

Run `node scripts/check-world-materials-browser.mjs --stage=materials66` for the
complete gate, or add `--qualities=high --showcase-only --skip-map-sweep` for the
three-view preliminary pass. Intermediate images and reports default to `work/`.
