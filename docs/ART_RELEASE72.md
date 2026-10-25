# Release 72: operator magazine exchange and shared component contacts

18 October 2026. Baseline: merged Release 71 `e2a4ab8`. Scope checkpoint:
`f7c7307`. Packaged runtime: `f55d6ba050e9704e0fdb83eea916b8fe546e1c0e`.

Operator reload presentation previously had a separate approximate magazine
travel curve. Native carried weapons used the original single returning
magazine. Release 72 extends the existing removed/replacement presentation to
both paths and drives the body support-hand IK from the shared component contact.

## Implementation

- `prepareWeaponAnimation` now prepares full weapons or compact operator rigs.
  The default exporter construction and original native core indices remain.
- Simplified operators select at most 24 original pieces. Magazine parts, original
  moving-joint anchors and representative action surfaces take priority; remaining
  slots use the largest silhouette pieces. Source order preserves joint pivots.
  Tiny belt/action surfaces may be omitted by this simplified representation.
- Each operator caches its own compact animation state, one contact-only palm
  and replacement parts. The palm is excluded from drawing. Template data stays
  neutral and shared through the existing bounded 32-entry cache.
- The shared sampler supplies source/replacement visibility, rigid magazine
  motion, hand retrieval and family timing for the 26 magazine-fed rigs.
  Tactical reloads stow the source; empty reloads let it depart. Shell-fed weapons,
  the revolver and blade retain their distinct mechanisms.
- The simplified weapon now uses the existing shell, cylinder, feed-cover,
  slide, bolt and pump animation instead of approximate magazine-only motion.
  The original IK reach limit remains; this does not guarantee anatomical grasp.
- Local rotations compose with operator aim. Source/replacement pieces inherit
  matching far-detail eligibility from the same original piece. The five-largest
  far silhouette policy remains, though selected parts can change.
- Close native operator weapons opt into the same exchange and alias the existing
  native magazine mesh. Their accessory list excludes cloned native core
  primitives, avoiding simultaneous native and primitive replacement cores.
- Each animation call restores neutral transforms/visibility before posing.
  Existing weapon/optic/barrel/handling/magazine/ammunition keys rebuild both
  operator paths on selection changes. A new weapon with the same key safely
  reuses pose state because timing comes from the current weapon each call.

No new clocks, ammunition transfers, sound contacts, world inventory, collision
objects, gameplay RNG or asset rebuilds are introduced. Native assets, material
and lighting payloads, sound bank and packed editable source have no Git diff.
The default first-person choreography retains the Release 71 sampler.

## Verification and costs

`npm run verify` ran once on the final runtime state and passed **74/74 existing
core tests**, followed by the **88-module packaging/offline check**. No tests
were added, restored or executed separately. Source and diff review covered
native aliases, clone filtering, per-actor state, cancellation, attachment keys,
far visibility and component targets. These source reviews are not gameplay
image acceptance. [Recorded result](validation-release72.json).

Offline Release 72 retains 84 game modules and 160 asset entries. Game JavaScript
is 704,164 bytes, up 699 bytes from Release 71's 703,465. Native/media payloads
are unchanged in Git. These are static package observations, not measured heap,
GPU time or physical iPhone performance. Compact rigs hold at most 24 original
render pieces, one contact-only palm and at most one replacement per selected
magazine piece; only one magazine role is visible at a time. Native rigs retain
full detail and their existing close-range selection thresholds.

Benchmark provenance identifies the committed runtime `f55d6ba` with fingerprint
`a83265d8ada9d7af6e02d42c30bcdd95f548ddbf4a0ace355c03374548185fa5`.

## Remaining acceptance and continuation boundary

Actual native/fallback gameplay images, transitions across native/far detail,
clipping, hand reach and professional motion quality remain unverified. No
physical discarded-world magazines, magazine collision/landing sound, finger
articulation or skinned-human animation is added. Physical Safari frame time,
memory, thermal behaviour and listening acceptance remain open.

The [production brief](PRODUCTION_BRIEF.md) requires actual gameplay review after
every substantial integrated checkpoint. The current [verification policy](../AGENTS.md)
says: “Do not run additional test files, retired tests, full suites, bot soaks,
browser checks, shader checks, asset audits or profiles.” Accordingly this pass
implements and records source-reviewable gaps, but does not run the required
next gameplay-image acceptance or claim that the broad production overhaul is
complete. Further art acceptance needs an authorized gameplay review path;
physical acceptance needs real iPhone evidence. The original thirteen checklist
sections remain intact and their quality claims stay partial/unverified.
