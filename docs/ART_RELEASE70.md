# Release 70: pistol magazine construction and contacts

17 October 2026. Continue from the pushed Release 69 checkpoint `cbfe134`.
This scope addresses a specific first-person presentation gap: Sable 9, Dire 50,
Swift 93 and Paladin 45 previously moved only small floorplates during reloads.
Their fast, extended and drum choices changed weapon statistics without visible
magazine attachments or the existing attachment-specific contact sounds.

## Construction scope

Build original complete magazine bodies, feed lips, followers and floorplates
for the four semiautomatic pistols. The existing floorplate stays the native
group anchor. Fast loops, extensions and drums use additive geometry so native
and fallback components share the existing rigid reload transform. Legacy
handling-slot extensions use the same presentation as the magazine slot.
The revolver retains its cylinder action and existing attachment limitations.

Use the existing original Fast/Extended/Drum extraction, manipulation and seating
voices at the unchanged reload crossings. No new audio files or buffers are
needed. Timing, ammunition, attachment statistics, recoil, muzzle positions and
sight alignment remain authoritative gameplay inputs.

## Integration status

Implementation and native asset integration are in progress. Build costs,
the packaged runtime checkpoint, benchmark provenance and the final permitted
verification result will be recorded here after integration.

Weapon geometry does not change static level lighting or material imagery.
Rebuild with the existing native bakes and all sixteen lightmaps:

```sh
npm run source:blender
npm run assets:blender -- --reuse-bakes --reuse-lightmaps
node scripts/release.mjs 70
```

## Acceptance limits

Follow [the current verification policy](../AGENTS.md): run only
`npm run verify` once on the final runtime state, containing the existing 74
core tests and packaging/offline check. Additional suites, asset audits,
browser and shader checks, profiles and listening fixtures are outside this
verification scope.

No matched native gameplay images or fresh listening evidence are claimed.
Rigid finger grasp, real discarded/replacement magazines, professional weapon
quality and subjective premium sound remain incomplete or unverified. Physical
iPhone performance and thermal acceptance remain open in the
[overhaul checklist](OVERHAUL_CHECKLIST.md).
