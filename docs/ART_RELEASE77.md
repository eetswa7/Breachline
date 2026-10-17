# Release 77: Nuketown furniture and privacy-fence construction

18 October 2026. Continue from Release 76 `3e68522`.

## Source and retained image evidence

Nuketown beds, dresser and low storage/table boxes have wooden shell tags that
select the generic `crate` model. Privacy fences use the same selector, stretching
its strips across up to 61 m. The white kitchen base is a plain architectural box.
Release 74 deliberately retained those unrelated objects while replacing actual
shipping crates. The [retained spawn view](art-release67/world-batches/cells/map-15-spawn-centred.png)
and [historical overview](art-release61/map-15.webp) show fence construction;
no saved close interior view establishes furniture quality. These are baseline
images, not new construction renders.

## Original construction and preservation

Add a closed platform-bed plinth with framed sides/ends and supporting deck;
keep the existing mattress/pillow. Closed cabinets with plinth, carcass, doors,
drawer and backed pulls replace storage and kitchen bases. A reversed native
cabinet variant faces the opposite room without rotating its authoritative owner.

Privacy fences have opaque backing, roughly 20 cm vertical-board pitch and two
rear rails. Five existing span/orientation variants share the construction recipe:
51 m X, 61 m Z, 18 m Z, 8.8 m X and 4.2 m X. Existing white caps/posts remain.
Far forms retain opaque silhouette/rails and omit individual joints.

Runtime map edits add only explicit `blenderKind` tags. All existing positions,
dimensions, yaw, surfaces/colours, shell thickness, flags, collision, ballistics,
routes and objectives remain. Solid plinths and fence backing retain the original
cover envelope without apparent firing openings. Native pieces stay inside the
unit bounds; shipping-crate routing and other maps are outside this selector change.

A source review found the existing full-span LOD metric would keep long fences
in near detail throughout Nuketown. Fence selection now uses .188 m board width
and distance to the nearest owner surface, sharing the existing wall quality
thresholds, 3 m close-detail guard, .25 s cadence and hysteresis. The selection reuses existing paired-batch machinery and adds no per-update
geometry/resources. New model kinds can alter batching; draw count and physical
cost remain unmeasured.

## Build and acceptance

Only map 15 selects these new models. Reuse material bakes and fifteen other
lightmaps while rebaking Nuketown:

```sh
npm run assets:blender -- --reuse-bakes --rebake-maps=15
node scripts/release.mjs 77
```

Follow [AGENTS.md](../AGENTS.md): one final `npm run verify`, 74 core tests plus
packaged/offline checks. No additional suites, browser/shader checks, asset audits
or profiles. Source review/export cannot establish furniture/fence appearance,
LOD transitions, professional art or physical iPhone performance. These remain
open in the [overhaul checklist](OVERHAUL_CHECKLIST.md).

## Generated construction and costs

Authoring checkpoint `84acd6d` and runtime `b47e136b67e3e3351305b14b52902a86fa48a01a` are pushed on
`codex/overhaul73`. Sixteen new native mesh entries bring the library to 386.

| Original native construction | Near triangles | Far triangles |
| --- | ---: | ---: |
| Bed plinth | 356 | 84 |
| Cabinet, each facing | 316 | 72 |
| 51 m X privacy fence | 3,096 | 36 |
| 61 m Z privacy fence | 3,696 | 36 |
| 18 m Z privacy fence | 1,116 | 36 |
| 8.8 m X privacy fence | 564 | 36 |
| 4.2 m X privacy fence | 288 | 36 |

The former crate mesh has 924 near/44 far triangles. Beds/cabinets reduce near
construction cost; long fences add board topology at near detail and reduce
far forms. The fence LOD correction matters for those costs, but no actual
all-map draw count, transition images or physical timing is claimed.

| Generated artifact | Release 76 | Release 77 |
| --- | ---: | ---: |
| Compressed mesh library | 13,527,043 bytes | 13,649,845 bytes |
| Decoded mesh library | 42,259,608 bytes | 43,240,984 bytes |
| Production materials/lighting | 67,317,430 bytes | 67,320,094 bytes |
| Packed editable source | 171,960,173 bytes | 172,277,999 bytes |
| Game JavaScript | 711,121 bytes | 711,790 bytes |

Runtime mesh/lighting download adds 125,466 bytes (about 122.5 KiB); game
JavaScript adds 669 bytes. The normal production-manifest diff changes only
`lightmap-15.part000.bin` among its file records; material records and the other
fifteen lightmap records remain unchanged. These are build/manifest observations,
not a separate binary mesh-preservation audit or runtime profile. Source SHA-256:
`e2a4393dfd5762d51644ba776e4add902fc05e892635d63813a42c3c8e53ac66`.

## Recorded verification and remaining work

Benchmark provenance identifies runtime `b47e136b67e3e3351305b14b52902a86fa48a01a` and content fingerprint
`0891ba23f5c701d5cb9bbebfe2704bb707b56228b9b72a246761ec2ddc055d23`. One final `npm run verify` passes **74/74 core tests**, zero
failures, and the **88-module** packaging/offline check, geometry winding, local
assets and Home Screen manifest. [Recorded result](validation-release77.json).
No additional suites, browser/shader checks, asset audits or profiles ran.

Actual furniture/fence gameplay, LOD/batching cost, professional environmental
quality and physical iPhone acceptance remain unverified. The broader checklist
also retains open skeletal animation, terrain/vegetation quality, full streaming,
listening and device work; these source changes do not establish that standard.
