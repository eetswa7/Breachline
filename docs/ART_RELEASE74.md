# Release 74: shared wooden shipping-crate construction

18 October 2026. Continue from pushed Release 73 `53b0825`. The recorded
[Blacksite service view](art-release68/blacksite/services-current.png) shows
prominent wooden crates still built from a solid cube and decorative strips.
This shared model has no previous production construction override.

## Scope

Replace it with original board-built shipping chests: recessed plank panels,
structural corner posts and rails, broad diagonal braces, a closed boarded lid,
floor and three supporting bearers. Back plank seams/chips with opaque lining;
retain the same unit owner envelope, original wood routing and solid gameplay
collision. Far LOD keeps large construction and removes small seams/bevels.

The native selector assigns `crate` to wooden shell cover in the original maps,
Crossfire District, Blacksite and Nuketown. All sixteen static level assemblies
contain this construction. These crates are not marked breakable and participate
in Cycles GI, so all sixteen lightmaps require fresh baking. Material textures,
existing gameplay owners, shell thickness, ballistics and routes stay unchanged.
The generator is outside this modelling change.

## Build and verification

The normal asset build restores the editable source, retains native material
bakes/graphs and compressed material payloads, and rebakes all static lighting:

```sh
npm run source:blender
npm run assets:blender -- --reuse-bakes
node scripts/release.mjs 74
```

Follow [AGENTS.md](../AGENTS.md): one final `npm run verify`, containing the
existing 74 core tests plus packaged/offline checks. No additional tests, browser,
shader, asset-audit or profile runs. New actual gameplay/LOD images and physical
iPhone performance remain unverified. Construction/export observations cannot
establish professional art quality in the [overhaul checklist](OVERHAUL_CHECKLIST.md).
