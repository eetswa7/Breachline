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

The render assembly assigns the new `shipping_crate` model only to wooden
shell cover with the existing .035 shell thickness in the original maps,
Crossfire District, Blacksite and Nuketown. All sixteen static level assemblies
contain this construction. The older `crate` model remains for unrelated
Nuketown furniture/fences selected by the historical broad shell predicate;
those assets do not become shipping chests. These crates are not marked breakable and participate
in Cycles GI, so all sixteen lightmaps require fresh baking. Material textures,
existing gameplay owners, shell thickness, ballistics and routes stay unchanged.
The generator is outside this modelling change. The render assembly suppresses
only the two exact decorative steel-band shapes emitted by `Arena.crate`; nearby
equipment remains. Crate wrappers retain `blenderColour:false` and wood tile 10,
so both runtime and Cycles keep the existing wood-map reflectance while native
per-vertex wood colour/roughness adds the board hierarchy. Two early builds were stopped before packaging to incorporate source-review
corrections: remove redundant strips, preserve textured GI reflectance, join
the deck to its bearers, and keep non-crate wooden furniture/fences unchanged.

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

## Packaged construction and costs

Source checkpoints `98a94e9`, `17f7ae9` and `a903888` are pushed. The new
`shipping_crate` occupies two additional native mesh entries; the old generic
crate remains for furniture/fences. Native near/far construction has 1,308/332
triangles, compared with 924/44 in the old cube/strip model. Thus selected crate
instances add 384 near or 288 far triangles; no measured frame-time claim follows.
Both levels keep closed backed faces, frame, diagonal braces, lid and bearers.

| Generated artifact | Release 73 | Release 74 |
| --- | ---: | ---: |
| Compressed mesh library | 13,499,841 bytes | 13,527,043 bytes |
| Decoded mesh library | 42,100,476 bytes | 42,259,608 bytes |
| Production materials/lighting | 67,319,376 bytes | 67,317,430 bytes |
| Packed editable source | 172,093,782 bytes | 171,960,173 bytes |
| Game JavaScript | 705,873 bytes | 706,470 bytes |

Runtime mesh/lighting download increases 25,256 bytes. The production manifest's
material records are unchanged; all sixteen lightmap segment records change.
These are normal build metadata and Git/manifest diff observations. No separate
binary mesh-preservation audit or runtime profile ran. Native source SHA-256:
`27e3153d49ba08093faa14ff14731a3dbe8822d222bccf890f0931c6d6202e73`.

## Recorded verification

Runtime `c594b4ce04931a7946208d34690dc03bc7178da0` and its benchmark provenance are pushed on `codex/overhaul73`.
Content fingerprint: `eaf93634bdbb0334b9812664596abab55d67ad8ba46aa9bc1fc02f3b4a73d712`. One final `npm run verify` passes **74/74
core tests**, then the **88-module** packaging/offline check, geometry winding,
local assets and Home Screen manifest. [Recorded result](validation-release74.json).
No additional suites, browser/shader checks, asset audits or profiles ran.

No new native gameplay images are claimed. Professional environmental quality,
all-map/LOD appearance and physical iPhone costs remain open; the source triangle
increase in particular needs real-device acceptance. The complete original
thirteen-section overhaul checklist remains unfinished.
