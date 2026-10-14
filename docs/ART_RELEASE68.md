# Release 68: Blacksite hall construction and interior

14 October 2026. Runtime source: `b9c3fa8d9b51c10e805e3fc747bd8d775145bca1`.
Benchmark provenance checkpoint: `55fe955`. This is a focused continuation of
[the overhaul checklist](OVERHAUL_CHECKLIST.md), not completion of the full
professional graphics/audio production objective.

## What changed

Blacksite's four central hall walls now use original complete native shells
with the existing four loading doors and eight unglazed firing windows. Broad
pale cast panels replace the repeated concrete artwork on the lower exterior.
The interior has a blue-green dado, warm upper walls, structural columns and
continuous ledgers. Recessed panel joints have solid backing rather than new
gaps through the building.

A pale soffit, I-section beams and sloped end haunches replace the black ceiling
slab and seven separate overhead kit pieces. The existing upper gable/cladding,
opening surrounds, machinery and floor remain. The three new model pairs are
editable in [the Blender definitions](../authoring/blender/blacksite_models.py)
and the complete reconstructed native project. Blacksite received a fresh
32-sample Cycles ground-lighting bake.

The Arena still owns the original collision, shots, AI, routes, objectives and
audio occlusion. New render geometry replaces 36 wall proxies and the central
roof presentation without changing those simulation objects. The compatibility
renderer retains the original Arena presentation.

## Gameplay image review

Matched native gameplay images compare the complete preserved Release 67
distribution with Release 68. They use identical grounded player cameras,
1280 by 600 viewports, seed, time and quality settings with bots removed.

| View | Release 67 | Release 68 |
| --- | --- | --- |
| Hall approach | [Before](art-release68/blacksite/approach-baseline.png) | [After](art-release68/blacksite/approach-current.png) |
| Interior | [Before](art-release68/blacksite/interior-baseline.png) | [After](art-release68/blacksite/interior-current.png) |
| Close lower wall | [Before](art-release68/blacksite/wall-close-baseline.png) | [After](art-release68/blacksite/wall-close-current.png) |
| Interior lower wall | [Before](art-release68/blacksite/wall-inside-baseline.png) | [After](art-release68/blacksite/wall-inside-current.png) |
| Oblique exterior | [Before](art-release68/blacksite/oblique-baseline.png) | [After](art-release68/blacksite/oblique-current.png) |
| Low-quality interior | [Before](art-release68/blacksite/interior-low-baseline.png) | [After](art-release68/blacksite/interior-low-current.png) |

Actual exterior review finds less synchronized concrete mottling and a clearer
lower-wall construction; the new broad panels remain clean and regular, with
strong contrast around the old weathered opening frames. Interior review finds
a clearer construction and paint hierarchy, with a readable illuminated ceiling
replacing the nearly black overhead plane.
The room still has regular flat surfaces, strong contrast around the retained
weathered opening surrounds, a smear-like floor and repeated coarse generators.
This is a substantial local asset replacement; it does not establish finished
professional realism, complete-library architecture or premium material quality.
The final matched comparison and remaining view findings are recorded in
[the native evidence](art-release68/blacksite/validation.json).
All thirteen matched views pass legal-camera, authoritative-state, complete
native-shell, culling, batch/triangle, shader and source-integrity gates. They
include both side walls, the north approach, close interior/exterior walls,
high/low quality and explicitly forced far geometry for all ten hall instances.

The matched high-quality interior selects 268,742 to 235,686 world triangles,
200 to 198 active world batches and 207 to 203 complete-frame draws. Total
submitted triangles decrease from 360,732 to 294,620 in this no-bot fixture.
The low-quality forecourt is an explicit cost exception: selected world
triangles rise from 141,074 to 146,658 (+3.96%), while batches decrease from
194 to 192. Its complete-frame triangles rise from 121,304 to 126,888. Larger
complete wall meshes keep detail differently from the previous small proxies;
the release does not reduce triangle cost at every distance/quality.

An [isolated interior repeat](art-release68/blacksite/repeat-camera.json) confirms
exact world/LOD selections, draws and resource counts after a different camera
history. Ten weapon pixels differ by more than two channel levels (maximum
four; 0.001302% of the image), reflecting retained first-person light warmup.
Whole-frame byte-exact independence is not claimed. The main baseline/current
set uses the same final harness and camera order, with fresh world/detail LOD
state at every camera.

## Costs and preservation

| Measure | Release 67 | Release 68 |
| --- | ---: | ---: |
| Blacksite full-detail world triangles | 372,182 | 332,694 |
| Blacksite full-detail active world batches | 193 | 192 |
| Blacksite selected interior world triangles, source fixture | 216,854 | 204,702 |
| Blacksite selected interior active batches, source fixture | 196 | 194 |
| Shared native mesh count | 362 | 368 |
| Packed native library bytes | 13,111,098 | 13,354,545 |
| Complete Blender runtime art download bytes | 18,312,298 | 18,555,745 |
| Production material/lighting download bytes | 67,315,200 | 67,322,712 |

The new geometry and lighting add 250,959 runtime download bytes. Existing
material payloads and estimated texture allocation are preserved. All sixteen
maps and 49 source views stay within the existing 220-batch allowance; the
maximum remains 212. Production dressing decreases from 127 to 125 instances.
Whole-wall bounds replace many smaller proxies, so fewer submissions and
triangles alone do not establish reduced GPU cost.

[Asset-stream comparison](validation-blacksite68-preservation.json) verifies
all 362 previous meshes' attribute/index data unchanged, all sixty original
material containers unchanged, and the other fifteen lighting maps unchanged.
Only three near/far native pairs and Blacksite's lighting are new. The reopened
[editable-source check](validation-blacksite68-native.json) confirms those
models, all 25 required packed bakes, no linked libraries and no embedded scripts.
The native source archive is 171,870,849 bytes.

These are software-renderer/source scene measurements and payload counts, not
physical iPhone FPS, GPU timing, Safari memory, latency or thermal measurements.
The physical Release 57 reference remains at `release57-baseline`.

## Validation and scope

All 421 regressions, the 87-module packaged/offline source check, all 58 Mesa
shader variants and all sixteen-map/49-view source budget gates pass. New
regressions cover exact other-map presentation/source bindings, authoritative
Blacksite state, destroyed-parent rebuilds, wall-specific bounds at both LODs,
full door/window aperture-volume intersection and the four standing capsule
entry routes. The final tightened four architecture regressions also pass
[independently](validation-blacksite68-tests.json).

All sixteen real application lifecycle gates pass, including normal recording,
saved/reloaded reports, actual manual JSON downloads, offline boot/export,
keyboard/touch inspection and cancelled stress restoration. Evidence is in
[the application report](validation-release68-benchmark-browser.json).
Application/offline acceptance and final native comparison are consolidated in
[the aggregate validation](validation-release68.json). The current hosted Sites
version was not changed: publication is blocked because this environment lacks
the Sites skill's required bundled `site-workflow.mjs` source helper. Source and
runtime assets are pushed to GitHub.

Broader environment/weapon/character realism, natural skeletal animation,
premium subjective audio and physical iPhone acceptance remain open on the
original thirteen-section checklist.

## Reproduce

Restore the editable source and run the Blacksite-only geometry/GI iteration:

```sh
npm run source:blender
npm run assets:blender -- --reuse-bakes --rebake-maps=14
node scripts/release.mjs 68
npm test
npm run check
node scripts/validate-art-scenes.mjs docs/profile-release68-scenes.json
```

For matched native images, preserve the complete baseline `dist` from `df2e14e`
in `work/release68-baseline/dist`, then run
`ART_TEST_BROWSER=/usr/bin/chromium node scripts/check-blacksite-browser.mjs`.
The image harness requires the installed Playwright dependency and Chromium.
