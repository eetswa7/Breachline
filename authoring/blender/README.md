# Blender art source

Run `npm run source:blender` to reconstruct the SHA-256-checked
`breachline-assets.blend`. The source includes the editable indexed asset kit,
all 30 weapon rigs, all 16 complete level assemblies, native material graphs,
six original diffuse input sheets, nine material/auxiliary atlas bakes and
16 packed ground-lighting bakes. Enable a hidden level collection to inspect it.
The source archive is about 164 MiB; it is authoring data, not a runtime download.

Three.js draws the exported library. Arena and the existing weapon simulation
retain collision, ballistics, movement, AI, controls, objectives and progression.
Render proxies do not replace colliders. Optic alignment, weapon joint tags and
both hand anchors stay tied to their original transforms.

## Rebuild

Requirements: Node 20+, Blender 4.0+ with glTF export and NumPy, Python with
Pillow/NumPy, and `astcenc`. Audio authoring also needs SciPy and FFmpeg. This
checkpoint used Blender 4.0.2, Cycles CPU and astcenc 4.7.

```sh
npm run source:blender
npm run assets:blender
npm run assets:audio
node scripts/release.mjs 69
npm run verify
```

Follow [the current verification policy](../../docs/TESTING.md): only the 74
core tests and packaging/offline check run. Historical release instructions do
not authorize additional browser, shader, asset-audit or profiling checks.

`BLENDER_BIN` and `PYTHON_BIN` select installed executables. Native modelling is
in `build_assets.py`, `art_geometry.py`, `production_assets.py`,
`environment_models.py` and `hero_models.py`; material
construction and Cycles bakes are in `materials.py` and `bake_lighting.py`.
`export-blender-input.mjs` extracts exact live weapon transforms and visual map
assemblies. Rebuilding regenerates the saved project, so incorporate manual
geometry edits into these definitions before regenerating.

`npm run assets:blender -- --reuse-bakes` restores the packed material bakes and
editable graphs for geometry iteration. Add `--reuse-lightmaps` only if lighting
and static level geometry have not changed. A full build is required for material
or lighting changes. `restore_bakes.py` recovers images through atomic writes;
source and runtime segments carry length and integrity metadata.

Material-preserving geometry iterations verify the freshly cropped fallback
pixels against committed material containers, then retain the exact existing
ASTC payloads. New production manifests also record the complete native material
PNG hashes; a changed source or fallback rejects reuse. This path needs no ASTC
encoder and still produces new lighting maps. For a change confined to one map,
`npm run assets:blender -- --reuse-bakes --rebake-maps=14` rebakes Blacksite GI
and retains the other fifteen packed Cycles images. Use that selective option
only when those other maps' static geometry, materials and lighting are unchanged.

The shared generator occurs on Foundry, Relay, Citadel, Monsoon and Blacksite.
For a change confined to that model, use
`npm run assets:blender -- --reuse-bakes --rebake-maps=1,3,5,11,14` to rebuild
those five ground-lighting maps and retain the other eleven packed images.

## Art and texture production

The kit includes native bevels, Boolean receiver pockets and handguard vents,
profiled magazines, rounded cloth sections, gloves, helmets, plate carriers,
facade reveals, panel joints, switchgear, roof trusses, cooling stacks and vehicle
bodywork. Per-vertex occlusion and roughness/metalness retain mixed materials
inside merged moving groups. Near/far meshes, instancing and spatial batching
remain live. The operator animation system uses rigid articulated pieces with
IK and blending, rather than deforming skinned human meshes.

The six input sheets in `textures/` are original AI-generated diffuse artwork.
They are not photographs or photogrammetry scans. Native Blender graphs add
microstructure, roughness and approximate relief derived from source luminance.
Cycles bakes 4096 px surface and hero atlases. Runtime crops provide 1024 px
world maps and up to 2048 px hero maps, each with normal and packed ORM data.
ASTC uses 6×6 albedo, 4×4 normal and 8×8 physical blocks with complete mip chains.
WebP fallbacks use 512 px world maps and up to 1024 px hero maps.

`level_materials.py` assigns the actual architectural reflectance, tint and
emission to each editable level instance. Blender display colours alone do not
participate in light transport. `bake_lighting.py` runs actual 32-sample Cycles diffuse direct/indirect baking
for each 512 px ground plane. RGBM range 6 preserves linear radiance. The floor
uses that bake; walls sample an approximate ground bounce, while actors and
raised surfaces retain live lighting. This is not complete per-surface lightmapping.
Breakable props are excluded from static lighting. The existing sky, cutout
foliage and auxiliary effect artwork remain packed in the Blender source.

See [current budgets and validation](../../docs/ART_RELEASE58.md) and
[provenance](../../docs/ART_PROVENANCE.md). Runtime/native intermediates are ignored
by git. Committed asset segments restore the complete editable project and ship
the actual runtime art; no external asset account or decoder download is needed.
