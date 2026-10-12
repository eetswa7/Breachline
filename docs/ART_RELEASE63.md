# Release 63: native hero forms and component-aware reloads

This continuation follows the finished [20 vs 20 checkpoint](ROSTERS62.md).
Crossfire District and Blacksite retain 40 combatants in every team mode.

## Actual changes

All thirty native weapon rigs now use revised family-specific receiver shells,
broad recessed panels, shaped lower receivers and swept cheek/butt profiles.
Finish differences follow real panel, cavity and bevel surfaces in the existing
vertex colour/physical-material streams. Original textures and lighting bakes
are retained byte-exactly; this is not a new high-resolution texture set.

Native gloves use asymmetric palms, thenar/thumb masses, bent/tapered fingers,
rounded knuckle pads and continuous oval cuffs. The support sleeve's cuff is now
at its wrist rather than its elbow. Source matrices, component IDs, rig anchors
and attachment joins remain intact. The editable Blender source is committed.

First-person reload hands approach and follow actual travelling magazines,
top loaders, shells, feed covers and revolver chambers. Empty reloads reach the
selected charging handle or pistol slide. Complete rigid groups share one pivot
in native and fallback renderers. Ammunition, timing, damage, muzzle/ADS alignment,
inspection cancellation and gameplay audio remain unchanged.

## Gameplay review

These are unmodified 844 × 390 screenshots of the shipped native renderer in
software WebGL, not physical iPhone captures. The reload baseline was served from
an exact archive of Release 62 `c80191bfca029965d611a6b3909d55f12b407fca`.
Inspection baselines use the unchanged matching Release 61 camera sequence.

| View | Before | Release 63 |
| --- | --- | --- |
| Rifle receiver and stock | [Image](art-release61/inspect-0-left.webp) | [Image](art-release63/inspect-0-left.png) |
| Pistol and glove | [Image](art-release61/inspect-10-right.webp) | [Image](art-release63/inspect-10-right.png) |
| Empty rifle charging action | [Image](art-release63/before-reload-0-empty-89.png) | [Image](art-release63/reload-0-empty-89.png) |
| Top-loading PDW magazine | [Image](art-release63/before-reload-4-empty-40.png) | [Image](art-release63/reload-4-empty-40.png) |
| Empty pistol action | [Image](art-release63/before-reload-10-empty-89.png) | [Image](art-release63/reload-10-empty-89.png) |

Additional reviewed frames show [rifle drum](art-release63/reload-0-mag3-empty-89.png),
[shell loading](art-release63/reload-5-empty-40.png),
[feed-cover opening](art-release63/reload-9-empty-16.png),
[revolver chamber reach](art-release63/reload-22-empty-40.png),
[heavy receiver](art-release63/inspect-9-left.png) and
[aimed firing](art-release63/ads-0-fire-turn.png).

The new receiver steps, recesses, stock shapes and glove contours are visible.
The charging-action and top-loader operations are more readable. Lower magazine
extraction/seating often occurs below the camera; those frames do not establish
convincing anatomical contact. Centre-distance checks establish bounded targets,
not finger grasp or commercial-game realism.

## Validation and cost

- The full regression run passed 345 of 346 checks and caught two new library
  segments missing from the offline cache. Regenerating the cache list fixed it;
  all eleven native-asset tests and nine cache/production-texture tests then
  passed, including the originally failing check. Other runtime code was unchanged.
- The final 78-module, local-asset and Home Screen shell check passed.
- [26 native motion frames](validation-weapon-motion63-browser.json) passed
  inspection, interruption, pause, recoil recovery and exact aimed alignment.
- [36 native reload frames](validation-reload63-browser.json) passed finite
  transforms, coherent native joints, pause and loaded presentation, with no
  browser errors or failed requests. [The exact baseline](validation-reload-baseline62-browser.json)
  and [image hashes](art-release63/manifest.json) retain provenance.
- [All thirty standard weapon scene counts](validation-release63-scene-profile.json)
  peak at 28,200 triangles and thirteen batches. Exhaustive visual-attachment
  tests retain the existing 32,000-triangle and 16/17-batch limits.
- [All twelve full 40-player crowd fixtures](validation-release63-operator-crowd.json)
  passed. The current close-frustum fixture submits 628,456 actor triangles;
  the unculled worst case submits 1,529,192. These are scene counts.
- The native asset download increases from 15.25 to 18.31 MB; the decoded
  library grows to 39,843,296 bytes. Library triangles increase 26.9% and
  vertices 31.9%. Core/hand draw-group counts stay at 95/59. This is not a
  cost-neutral change or a physical-device performance result.

Source checkpoints: reload/native modelling
`c51316ca2f4c07bf2a81f5c53ee5aced70b1322f`, exported native assets
`2884259ef473b2e7e0a635002982cb2329d34a98`, corrected offline list
`325fd9e57182485a2ee8e4be725ccc483f454db3`.

## Remaining limits

Broad surfaces remain mostly uniform gray and sleeves remain tubular. Fingers,
hands and sleeves are rigid; magazines are reused, the pistol retains a simple
baseplate and the revolver lacks a true loader. Third-person reload choreography
was not rebuilt in this checkpoint. Professional weapon/hand quality and full
physical interaction remain partial. Environment repetition, natural skeletal
animation, other open effects/audio work and physical iPhone performance remain
in the [overhaul checklist](OVERHAUL_CHECKLIST.md).
