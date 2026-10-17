# Release 70: pistol magazine construction and contacts

17 October 2026. Continue from the pushed Release 69 checkpoint `cbfe134`.
This scope addresses a specific first-person presentation gap: Sable P, Dire 50,
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

The native foundation is pushed at `898316b`. Blender 4.3.2 rebuilt the library
and editable source successfully. Native pistol bodies have a hollow mouth,
tapered shoulders and witness ports; the fallback uses a solid bevel body.
Floorplate joint dimensions and positions remain fixed. The cached reload-hand
target follows the lower body, while actual ammunition and phase crossings keep
their existing implementation. All core magazine members stay unchanged when
attachments are selected; additive accessories share the magazine's rigid group.

Fast magazines add two runtime pieces, extensions three and drums seven.
Drums take precedence over the retained handling-slot extension, matching the
existing audio-family choice. The four native magazine draw groups are reused;
the rebuild adds no native mesh entries or sound-bank assets. An independent
source review found no rig-contract defect; that review is not rendered evidence.

| Generated artifact | Release 69 | Release 70 |
| --- | ---: | ---: |
| Sable P native magazine triangles | 108 | 1,768 |
| Dire 50 native magazine triangles | 108 | 1,784 |
| Swift 93 native magazine triangles | 108 | 1,788 |
| Paladin 45 native magazine triangles | 108 | 1,792 |
| Compressed mesh library | 13,353,061 bytes | 13,499,841 bytes |
| Decoded mesh library | 41,674,696 bytes | 42,100,476 bytes |
| Production materials and lighting | 67,319,376 bytes | 67,319,376 bytes |
| Packed editable Blender source | 171,886,689 bytes | 172,093,782 bytes |

The native library grows by 146,780 downloaded bytes and 425,780 decoded bytes.
These are export/transport observations, not measured frame time or device
memory. The complete production-material and sixteen-lightmap payloads have no
Git diff. Other native topology records and the audio bank remain unchanged;
binary preservation audits were not run. Editable source SHA-256:
`71aa7ab709b24ba64be3ecd8098d9bf1eec348523e004413efac80d572072600`.

The matching runtime, offline Release 70 and final core verification are being
prepared. The final checkpoint and benchmark fingerprint will be recorded here.

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
