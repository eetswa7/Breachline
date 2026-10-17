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
Old Quarter0 (21), Dustline2 (21), Switchyard6 (15), Skybridge10 (21),
Monsoon11 (23), Emberworks12 (21), Crossfire13 (21), Blacksite14 (21).
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
