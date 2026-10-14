# Release 67 bounded firing presentation

First-person flashes now expand briefly and fade with the simulation's shot
age, with family-specific durations and deterministic variation across shots.
The existing single muzzle-gas puff uses smaller pistol/SMG/rifle profiles and
a velocity that follows pitched aim. Suppressors retain no flame and emit a
smaller, slower vent. Gas samples the firing event's weapon, so a Gun Game
promotion cannot give the previous shot the new weapon's gas profile.

**The professional firing requirement remains partial.** Reviewed native
frames show a modest muzzle-glint and lighting-pulse improvement. Much of the
flash is hidden by the barrel in this ordinary hip-fire camera, and gas remains
faint. These frames do not establish detailed, authored flame animation or
broad visual acceptance. The existing static atlas tile and approximate
eye-forward gas origin remain limitations.

## Native gameplay evidence

The [after validation](art-release67/firing/validation-after.json) passed all
17 gates using the shipped Game and Renderer, native Blender weapons/hands,
original Blacksite collision and fixed 1/120-second simulation. Native
`Game.shoot` spends one round and emits one shot event and one gas particle,
including the eight-pellet shotgun. Flash/gas expiry, exact paused simulation
and effect state, menu suppression, reflex/scoped rendering, low quality,
suppressed/integral-suppressed/blade exclusion and existing bot flash/tracer
counts passed. All 30 weapons have native shooting/`prepareWeapon` coverage
plus finite, area-bounded flash samples. Legal grounded cameras, native assets,
WebGL2 and zero browser/network errors also passed.

Eighteen images were captured and reviewed. Four matched rifle controls use
the renderer from `0ec0b66`; all other JavaScript modules are identical byte
snapshots of the pushed source `5a7d7c6`. The
[baseline report](art-release67/firing/validation-before.json),
[manifest](art-release67/firing/manifest.json) and
[visual review](art-release67/firing/visual-review.json) preserve source hashes,
draw/resource counts, image hashes, measured pixel differences and limits.

| Rifle stage | Before | After |
| --- | --- | --- |
| Birth | [Fixed square](art-release67/firing/before-rifle-birth-0ms.png) | [Compact initial flash](art-release67/firing/after-rifle-birth-0ms.png) |
| 8 ms | [Constant flash](art-release67/firing/before-rifle-peak-8ms.png) | [Expanded pulse](art-release67/firing/after-rifle-peak-8ms.png) |
| 25 ms | [Constant light](art-release67/firing/before-rifle-fade-25ms.png) | [Fading light](art-release67/firing/after-rifle-fade-25ms.png) |
| 150 ms | [Original gas](art-release67/firing/before-rifle-gas-150ms.png) | [Family gas](art-release67/firing/after-rifle-gas-150ms.png) |

Rifle opacity at 25 ms drops from 1 to 0.480 and light intensity from 0.9 to
0.432. In the actual frames this chiefly softens a small muzzle glint and
nearby weapon/hand lighting. The 150 ms gas comparison differs by at most nine
channel levels, with only three pixels above eight levels: the visible gas
change is subtle. Current peak/gas pairs for
[pistol](art-release67/firing/after-pistol-peak-8ms.png),
[shotgun](art-release67/firing/after-shotgun-peak-8ms.png),
[sniper](art-release67/firing/after-sniper-peak-8ms.png) and
[SMG](art-release67/firing/after-smg-peak-8ms.png) retain native silhouettes;
[low quality](art-release67/firing/after-low-shotgun-peak.png) retains the pulse,
and the [suppressor](art-release67/firing/after-suppressor.png) adds no flame.

The rifle's complete temporal samples use actual `Renderer.render` calls.
Uncaptured intermediate samples for other families explicitly record
`rendered:false` and use native `prepareWeapon`/`updateEffects`. Scoped gates
count actual sprite submissions and preserve world-only magnified rendering;
the separate HUD is not drawn by this harness.

## Bounds and costs

| Family | Flash duration | Gas base size | Gas lifetime |
| --- | ---: | ---: | ---: |
| Pistol | 34 ms | 0.045 m | 260 ms |
| SMG | 36 ms | 0.052 m | 280 ms |
| Rifle / marksman | 43 ms | 0.060 m | 360 ms |
| LMG | 43 ms | 0.065 m | 400 ms |
| Sniper | 45 ms | 0.065 m | 400 ms |
| Shotgun | 45 ms | 0.070 m | 420 ms |

The prior flash lasted 45 ms and its gas used size 0.070 m/lifetime 420 ms
across families. Flash quad area is bounded to 90.2% of the prior family
square, and light intensity stays at or below 0.9. This is a geometry bound,
not a measured projected-overdraw or frame-time improvement.

There are no added draws, textures, sprites, lights, render passes or particle
pools. The existing effect pool remains 200 entries, quality emission budgets
remain unchanged and the shared billboard buffer remains 280 instances.
Matched rifle frames use the same 227 draws while the flash is active, 226
afterward and two render passes. Both controls record 85 tracked textures,
92 GL textures and the same 82,779,926-byte texture estimate. These are
software-renderer resource observations, not physical-device memory readings.

Gas still starts 0.85 m ahead of the eye and 0.13 m lower, rather than at the
animated barrel or suppressor tip. Authored flame/gas sheets, better barrel
alignment, sparks/heat distortion, broad indoor/outdoor and third-person
acceptance, and physical iPhone performance measurements remain open.

To reproduce:

```sh
FIRING_CAPTURE_DIR=work/firing-current node scripts/check-firing-browser.mjs
```

Chromium/SwiftShader supplies native integration evidence and actual gameplay
images. It does not establish physical iPhone speed, thermal behaviour,
sustained frame pacing or professional visual approval.
