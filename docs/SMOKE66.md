# Release 66 smoke grenade presentation

Smoke grenades now erupt as a compact ground plume and grow into a lower,
denser rolling bank. The former renderer drew a 3.7 m tall strip immediately,
then rotated largely unchanged density stamps. The new bounded lobes change
width, height and lift over time; the shared smoke shader advects its density
and applies a denser optical transfer.

**The professional smoke requirement remains partial.** Actual native frames
show better eruption, ground contact and concealment, but mature clouds still
read as smooth billboard fog. Authored animated smoke sheets, soft intersections,
volumetric lighting and broad indoor/outdoor, all-angle acceptance remain open.

## Actual gameplay evidence

The [native validation](validation-smoke66-browser.json) records eleven after
frames at 844 × 390 from the shipped Game and Renderer, original Blacksite
collision, native Blender world and first-person weapon/hands. The first cloud
comes from actual thrown smoke equipment, including its fuse and bounce. Fixed
1/120 s gameplay simulation continues between captured frames. Three matched
before frames are retained with their
[baseline report](art-release66/smoke/validation-before.json).

| Stage | Before | After |
| --- | --- | --- |
| 500 ms expansion | [Tall, thin early strip](art-release66/smoke/before-smoke-expansion-500ms.png) | [Compact ground plume](art-release66/smoke/smoke-expansion-500ms.png) |
| 1.3 s established cloud | [Flatter haze](art-release66/smoke/before-smoke-established-1300ms.png) | [Denser rolling bank](art-release66/smoke/smoke-established-1300ms.png) |
| Interior viewpoint | [Distant facade remains visible](art-release66/smoke/before-smoke-inside.png) | [Distant world veiled](art-release66/smoke/smoke-inside.png) |

Also reviewed were [5 s rolling](art-release66/smoke/smoke-roll-5s.png),
[14.5 s fade](art-release66/smoke/smoke-fade-14p5s.png) and
[low quality](art-release66/smoke/smoke-low-quality.png). The interior result is
one viewpoint, not proof of all-angle coverage. The
[visual review and costs](art-release66/smoke/visual-review.json) record limits;
the [manifest](art-release66/smoke/manifest.json) preserves source commits,
runtime hashes and image provenance. The before/after expired reference frames
have the same view and differ by only nine one-level channel pixels.

All fourteen native gates passed, including native fuse, continuous expansion,
rolling, hold/fade/expiry, exact paused clocks and buffers, legal grounded
cameras, low-quality layers, eight-cloud capacity, round reset, preserved
collision, native assets, WebGL2, zero browser/network errors and unchanged
runtime files throughout the capture. Thirty focused smoke, runtime-effects,
renderer, pressure-front and environmental-fire tests passed.

## Gameplay and cost

The engine's smoke gameplay rules are preserved: radius grows as
`min(5.2, age * 4)`, AI sight is blocked until age 13, clouds expire after 16 s,
and the pool holds eight clouds. The renderer samples these existing positions
and ages without mutating equipment, AI, collision or cloud state. Visual
lateral extents are bounded within the gameplay radius.

| Quality | Layers per cloud | Eight-cloud peak | Smoke attribute upload |
| --- | ---: | ---: | ---: |
| Low | 4 | 32 quads | 1,280 bytes |
| Medium | 5 | 40 quads | 1,600 bytes |
| High / Ultra | 6 | 48 quads | 1,920 bytes |

These counts and per-layer alpha are retained. There are no added textures,
draws, render passes or pools, and the shared effect capacity remains 280.
The geometry's summed world-space quad area is bounded below 90.3% of the
previous emitter's area. This is an area bound, not a measured projected
overdraw or frame-time improvement. Additional smoke-fragment work is two
`sin` evaluations and one `exp`; density still uses one atlas sample.

The shader change also affects existing kind-0 muzzle, impact and explosion
smoke stamps. Their emitters, lifetimes and counts are retained; separate firing
and impact visual acceptance is still open. Fire uses its own shader.

Chromium/SwiftShader proves native integration and supplies actual gameplay
images. It does not establish physical iPhone performance, memory, thermal
behaviour or sustained frame pacing. New physical-device measurements remain
required.

To reproduce the native smoke capture:

```sh
SMOKE_CAPTURE_DIR=work/smoke-current node scripts/check-smoke-browser.mjs
node --test tests/smoke-presentation.test.mjs tests/runtime-effects.test.mjs tests/three-renderer.test.mjs tests/explosion-shock.test.mjs tests/environmental-fire.test.mjs
```
