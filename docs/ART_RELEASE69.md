# Release 69: shared generator construction

17 October 2026. Continuation from Release 68 runtime `b9c3fa8` and current
source `4a28af0`; editable-definition checkpoint `063369e`. This release targets the repeated coarse generators identified
in [the Release 68 gameplay review](ART_RELEASE68.md). The complete graphics
and audio overhaul remains open in [the original checklist](OVERHAUL_CHECKLIST.md).

## Scope

Replaced the shared generator with original editable diesel-engine, alternator,
radiator and service-equipment construction in
[the native environment definitions](../authoring/blender/environment_models.py).
Retain its unit envelope, shared material routing and near/far LOD contract.
Arena continues to own collision, ballistics, AI, routes and gameplay state.
The detailed construction and simplified far silhouette must both remain
readable; added small parts alone do not establish better art.

The shared model appears on Foundry (1), Relay (3), Citadel (5), Monsoon (11)
and Blacksite (14). All five ground irradiance maps were rebaked with Cycles.
The production manifest diff changes only those five lightmap records and the
total byte count: all material containers and eleven other lightmaps retain
their hashes. The build reused exact packed native bakes and editable graphs,
and its material-reuse path checked the cropped fallback pixels before retaining
the existing ASTC payloads. No new finishes or textures were introduced.

## Implementation and verification status

The editable construction definitions now include an open channel skid and
fuel tank, shouldered inline-three diesel with rocker covers and injection
lines, stepped alternator and terminal box, recessed radiator core and guard,
air cleaner, coolant hoses and supported exhaust silencer. Explicit far-LOD
construction retains the principal machinery and removes small fittings.
Blender 4.3.2 exported the library and editable source, and the normal packaging
pipeline completed. Release 69 advances all module URLs and the complete offline
shell together. Gameplay and collision code have no changes beyond release URLs.
The native mesh manifest changes only the two generator topology records;
byte-exact comparisons of the other meshes' binary streams were not run.

| Generated artifact | Release 68 | Release 69 |
| --- | ---: | ---: |
| Generator near triangles | 2,296 | 2,180 |
| Generator far triangles | 516 | 468 |
| Compressed mesh library | 13,354,545 bytes | 13,353,061 bytes |
| Production materials and lighting | 67,322,712 bytes | 67,319,376 bytes |
| Packed editable Blender source | 171,870,849 bytes | 171,886,689 bytes |

The library and production lighting together decrease by 4,820 bytes. These are
export metadata and transport sizes, not measured rendering or device costs.
The source archive SHA-256 is
`471d33c1ce515b9dd320e651d50b35f45a0dbc8e7d2e1b7f31c856f7bae74393`.
Final core verification and the integrated runtime checkpoint are pending.

The current [repository verification policy](../AGENTS.md) supersedes older
release instructions: run `npm run verify` once on the final runtime source.
It runs exactly the existing 74 core tests and the packaged/offline check.
Do not run retired suites, additional tests, browser checks, shader checks,
asset audits, profiles or soaks, or regenerate historical release evidence.
Documentation changes require diff and link review.

Matched native close, room-scale, low-quality and far-LOD gameplay images have
not been reviewed for this release. The 74 core tests and packaging check do not
establish the generator's visual quality, all-map presentation or device costs.
Gameplay image acceptance remains unchecked under the current verification
scope. Physical iPhone 16 Pro FPS, frame pacing, memory, touch responsiveness
and thermal acceptance also remain unverified; the measured Release 57 baseline
is preserved, not replaced by source or payload observations.

## Build recipe

Restore the editable source and reuse native material bakes while rebaking
only the five affected maps:

```sh
npm run source:blender
npm run assets:blender -- --reuse-bakes --rebake-maps=1,3,5,11,14
node scripts/release.mjs 69
npm run verify
```

The final command is the complete permitted runtime validation set. Historical
shader, browser, asset-audit and profiling recipes remain historical evidence;
they are not additional Release 69 tasks. No new professional-quality,
premium-audio or physical-device checklist requirement is complete from this
scoped generator replacement alone.
