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
thresholds, 3 m close-detail guard, .25 s cadence and hysteresis. No extra batches,
resources or per-frame geometry are introduced. Physical cost remains unmeasured.

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
