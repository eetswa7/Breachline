# WebGPU consideration and renderer decision

Decision recorded on 13 October 2026: retain Three.js r180/WebGL2 for the
current overhaul and keep the existing Canvas compatibility renderer. WebGPU
was an optional means of improving quality or performance, not a required
backend change. Considering it is complete; a WebGPU implementation or
comparative performance claim is not being made.

The runtime currently ships `three.module.min.js` and `three.core.min.js`,
constructs `THREE.WebGLRenderer` in [three-renderer.js](../dist/js/three-renderer.js),
and records `navigator.gpu` exposure separately from its active WebGL2 backend
in [render-pipeline.js](../dist/js/render-pipeline.js). API exposure alone does
not select another renderer or establish support for the complete game.

## What an equivalent WebGPU path would need

| Current dependency | Work needed before an equivalent WebGPU release |
| --- | --- |
| Standard/physical materials composed with `onBeforeCompile` in `three-renderer.js` | Port the metric UV, vertex material, packed surface detail, water, atmosphere and native hero finish patches to Node Materials/TSL. |
| Ground irradiance, indoor light fields and room lighting in `production-lighting.js`, `lighting-field.js` and `room-lights.js` | Preserve baked texture decoding, selected-room state and interpolated indoor/outdoor response in the new material graph. |
| Foliage wind and matching depth deformation | Preserve leaf alpha testing, movement and shadow silhouettes in both colour and depth/shadow rendering. |
| Instanced GLSL particle shader in `particles.js` | Port authored atlas sampling, billboards, material-specific debris, smoke and weather without adding unnecessary passes or changing density limits. |
| Native texture uploads in `production-textures.js` and the compressed texture path | Revalidate ASTC/fallback selection, complete mip chains, resource formats and readiness on the target Safari version. |
| Explicit world and first-person render passes | Preserve depth clearing, separate weapon lighting, magnified-scope viewmodel suppression and shared HUD alignment. |
| WebGL timer queries in `graphics-profiler.js` | Implement an optional WebGPU timestamp path, keep unavailable timings explicit and preserve Benchmark Mode's records and export schema. |
| Context loss and Canvas compatibility behavior | Revalidate recovery and usable fallbacks, including offline boot on existing Home Screen installations. |

Three's [WebGPURenderer](https://threejs.org/docs/pages/WebGPURenderer.html)
provides a WebGL2 backend fallback, but it is not a drop-in replacement for this
custom material pipeline. Three documents
[`Material.onBeforeCompile`](https://threejs.org/docs/pages/Material.html#onBeforeCompile)
as specific to `WebGLRenderer`; the current GLSL patches would need equivalent
Node Material/TSL implementations even if the new renderer used its WebGL2
fallback. The existing game retains WebGL2 and Canvas fallbacks today.

## Why retaining WebGL2 is practical now

The unfinished visual requirements are principally authored geometry,
materials, animation and effect presentation. Changing the rendering API does
not replace these assets or finish their art production. The current renderer
already supports the native PBR library, instancing, LOD, compressed mipmapped
textures, static irradiance, limited passes and adaptive quality. The published
software-browser validation demonstrates functionality and rendered output
within that environment.

The physical iPhone 16 Pro reference is still the
[Release 57 Safari export](iphone-release57-baseline.json). There is no
like-for-like physical-device WebGPU run of the changed game, no measured
WebGPU gain and no evidence that the full current shader path is portable to
the user's installed Safari version. A desktop capability check cannot settle
those questions. Keeping the validated backend lets production improvements
continue while preserving the existing portability and offline path.

Reconsider a prototype if a current physical-device benchmark identifies a
renderer bottleneck that WebGPU can plausibly address. Acceptance would require
matched exterior, interior, operator, weapon, optic, smoke and weather images;
the same map, 40-player roster, route, resolution/quality and warmup; compatible
offline boot and controls; and comparable iPhone frame pacing, memory and
sustained thermal data. No migration is justified solely to increase the
number of completed checklist items.

This decision closes only “Consider/use WebGPU where practical.” It does not
close the separate iPhone performance, streaming, anti-aliasing or professional
visual quality requirements.
