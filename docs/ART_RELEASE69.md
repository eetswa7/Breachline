# Release 69: shared generator construction

17 October 2026. Continuation from Release 68 runtime `b9c3fa8` and current
source `4a28af0`. This release targets the repeated coarse generators identified
in [the Release 68 gameplay review](ART_RELEASE68.md). The complete graphics
and audio overhaul remains open in [the original checklist](OVERHAUL_CHECKLIST.md).

## Scope

Replace the shared generator with original editable diesel-engine, alternator,
radiator and service-equipment construction in
[the native environment definitions](../authoring/blender/environment_models.py).
Retain its unit envelope, shared material routing and near/far LOD contract.
Arena continues to own collision, ballistics, AI, routes and gameplay state.
The detailed construction and simplified far silhouette must both remain
readable; added small parts alone do not establish better art.

The shared model appears on Foundry (1), Relay (3), Citadel (5), Monsoon (11)
and Blacksite (14). Their changed static geometry requires all five ground
irradiance maps to be rebaked. The remaining eleven maps should retain their
lighting. This is a material-preserving geometry iteration: use the existing
native material bakes, graphs, cropped fallback pixels and compressed material
payloads rather than introducing new finishes or textures.

## Implementation and verification status

The editable construction definitions now include an open channel skid and
fuel tank, shouldered inline-three diesel with rocker covers and injection
lines, stepped alternator and terminal box, recessed radiator core and guard,
air cleaner, coolant hoses and supported exhaust silencer. Explicit far-LOD
construction retains the principal machinery and removes small fittings.
Runtime asset integration and lighting are in progress; no final build or test
result is claimed at this source checkpoint.

The current [repository verification policy](../AGENTS.md) supersedes older
release instructions: run `npm run verify` once on the final runtime source.
It runs exactly the existing 74 core tests and the packaged/offline check.
Do not run retired suites, additional tests, browser checks, shader checks,
asset audits, profiles or soaks, or regenerate historical release evidence.
Documentation changes require diff and link review.

Matched native close, room-scale, low-quality and far-LOD gameplay images have
not been reviewed for this release. The 74 core tests and packaging check do not
establish the generator's visual quality, all-map presentation or device costs.
Gameplay image acceptance remains unchecked under the current verification
scope. Physical iPhone 16 Pro FPS, frame pacing, memory, touch responsiveness
and thermal acceptance also remain unverified; the measured Release 57 baseline
is preserved, not replaced by source or payload observations.

## Build recipe

Restore the editable source and reuse native material bakes while rebaking
only the five affected maps:

```sh
npm run source:blender
npm run assets:blender -- --reuse-bakes --rebake-maps=1,3,5,11,14
node scripts/release.mjs 69
npm run verify
```

The final command is the complete permitted runtime validation set. Historical
shader, browser, asset-audit and profiling recipes remain historical evidence;
they are not additional Release 69 tasks. No new professional-quality,
premium-audio or physical-device checklist requirement is complete from this
scoped generator replacement alone.
