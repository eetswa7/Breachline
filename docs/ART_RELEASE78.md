# Release 78: attached, arched palm crowns

18 October 2026. Continue from Release 77 `b0bde98`.

## Retained evidence and original construction

The [Blacksite forecourt](art-release68/blacksite/forecourt-current.png) and
[Monsoon overview](art-release61/map-11.webp) show sparse palm starbursts.
These are historical baseline gameplay images. The old native model places
leaflet roots on a quadratic curve while its single midrib follows the straight
chord, leaving intermediate pinnae above that strip.

Replace only `crown('palm')` with three whorls: lower drooping, middle spreading
and upper rising fronds. Segmented tapered midrib ribbons follow the actual
pinna centreline. Near pinnae have a raised ridge and four broad facets; far
pinnae retain a broad two-triangle fold and drooping tip. Twelve/eight fronds
with ten/seven pinna pairs replace ten/seven same-level arms with seventeen/nine
pairs. This changes structure and leaf volume while retaining the instance count.

Original local roots at `(0,.22,0)`, spear height .48 and unit bounds remain.
Trunks, crown placement/scale, gameplay collision/visibility/navigation, opaque
DoubleSide vertex-coloured material, wind, instancing and distance/quality LOD
code remain. `tree_crown`, `conifer` and generic leaf geometry are outside this
modelling change. Independent source review found no actionable topology,
attachment, bound or integration issue; this is not new gameplay acceptance.

## Static coverage and build

The normal current build input lists 164 crowns across eight maps:
Old Quarter (0, 21 crowns), Dustline (2, 21), Switchyard (6, 15), Skybridge (10, 21),
Monsoon (11, 23), Emberworks (12, 21), Crossfire (13, 21), Blacksite (14, 21).
Those static assemblies need fresh Cycles GI. Reuse native material bakes and
the other eight lighting maps:

```sh
npm run assets:blender -- --reuse-bakes --rebake-maps=0,2,6,10,11,12,13,14
node scripts/release.mjs 78
```

Follow [AGENTS.md](../AGENTS.md): only one final `npm run verify`, containing
74 existing core tests and packaged/offline checks. No additional suites,
browser/shader checks, asset audits or profiles. New near/far gameplay, broad
vegetation realism and physical iPhone cost remain open in the
[overhaul checklist](OVERHAUL_CHECKLIST.md).

## Generated construction and costs

Authoring `16bde92` and runtime `570d918b1494369f78d035431bc6c7f50a9d1b2e` are pushed on `codex/overhaul73`.
The native library retains 386 mesh entries; palm groups replace their existing
two meshes. Construction records are 1,096 triangles/1,364 vertices near and
280/528 far, compared with 708/1,416 and 274/548. Each selected palm adds 388
near triangles or six far triangles; file/topology counts do not measure GPU time.

| Generated artifact | Release 77 | Release 78 |
| --- | ---: | ---: |
| Compressed mesh library | 13,649,845 bytes | 13,666,984 bytes |
| Decoded mesh library | 43,240,984 bytes | 43,284,628 bytes |
| Production materials/lighting | 67,320,094 bytes | 67,310,782 bytes |
| Packed editable source | 172,277,999 bytes | 172,289,463 bytes |
| Game JavaScript | 711,790 bytes | 711,790 bytes |

Combined runtime mesh/lighting download adds 7,827 bytes. The normal production
manifest diff retains material records and eight unaffected lightmap records;
only maps 0,2,6,10,11,12,13,14 change. Other native definitions remain; no separate
binary stream-preservation audit or profile ran. Source SHA-256:
`34f59e5cd41a6f282318843beb095bd55074e6cb5609d15359234475f199fab5`.

## Recorded verification

Benchmark provenance identifies runtime `570d918b1494369f78d035431bc6c7f50a9d1b2e` and content fingerprint
`3c6e38b015e6456b87c4c42efea8ed0c77b432a38b95ad42edf9cd64020b182f`. One final `npm run verify` passes **74/74 core tests**, zero
failures, and the **88-module** packaging/offline check, geometry winding, local
assets and Home Screen manifest. [Recorded result](validation-release78.json).
No additional suites, browser/shader checks, asset audits or profiles ran.

Actual new gameplay, close/far crown appearance, professional vegetation quality
and physical iPhone costs remain unverified. This source work advances palm
construction while broader natural vegetation remains incomplete.
