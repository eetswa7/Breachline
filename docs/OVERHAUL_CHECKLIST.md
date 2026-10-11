# Breachline graphics and audio overhaul checklist

Recorded on 11 October 2026 from the full audit requested by the user. The
baseline is Release 60 at `449256114f827a0f2993bf94588c66c617a14e00`.
Release 61 status changes below link their implementation and validation;
the update log records the source checkpoint.

**The original request is not complete in full.** Asset production, library
coverage, preservation and deployment are substantially complete. The requested
professional visual standard, several animation/effect/audio features and
physical iPhone performance remain unfinished or unverified.

## How to use this file in future sessions

- Read this checklist and [the production brief](PRODUCTION_BRIEF.md) before
  resuming the overhaul. Keep the original thirteen sections intact.
- `[x] Complete` means the audited requirement was completed within its stated
  scope. `[ ] Partial`, `[ ] Not complete` and `[ ] Unverified` remain open.
- For each status change, update its explanation and add the date, commit and
  evidence link. Add a short entry to the update log below.
- Judge art requirements with actual gameplay images and audio requirements
  with listening evidence. Asset counts, successful exports, shader compilation
  and automated tests alone do not establish professional visual/audio quality.
- Mark physical-device claims complete only with appropriate real iPhone data.
  Do not relabel desktop/software results as physical iPhone measurements.
- Recheck preservation and compatibility requirements when changing the game.
  Existing checked items are the Release 60 audit, not a guarantee for later code.
- Optional renderer choices such as WebGPU or engine migration are not mandatory.
  Record the decision and evidence rather than adopting them to fill a checkbox.

## Baseline evidence

- [Release 60 production notes and rendered comparisons](ART_RELEASE60.md)
- [Release 60 aggregate validation](validation-release60.json)
- [Actual weapon/Blacksite visual review](validation-release60-visual-review.json)
- [Actual sixteen-map visual review](validation-release60-world-visual-review.json)
- [Image manifest and provenance](art-release60/manifest.json)
- [Audio production and desktop validation](../authoring/audio/README.md)
- [Audio validation result](validation-production-audio-browser.json)
- [Actual Release 57 iPhone reference](iphone-release57-baseline.json)
- [Actual Release 60 iPhone report](../benchmarks/iphone-release60-2026-10-06.json)
- [Release 60 device analysis and comparison limits](BENCHMARK_RELEASE60_ANALYSIS.md)
- [Original asset provenance](ART_PROVENANCE.md)
- [Release 61 implementation, scope and review evidence](OVERHAUL_RELEASE61.md)

The recovery ref is `release57-baseline` at
`454a5a26a8418fa8db1d3cc1ec197f7e56c56415`. The physical measurement's recorded
source commit differs from that recovery manifest revision; retain both identities
as documented in the baseline JSON and validation report.

## 1. Fundamental change in development approach

- [x] **Complete:** Identify what makes the existing graphics simplistic. Flat
  geometry, weak materials, excessive darkening, repetition and poor hero
  presentation were identified.
- [ ] **Partial:** Treat development as professional environment art, materials,
  lighting, animation and technical art. Blender/PBR/baking and visual review
  were used, but the result remains too procedural and stylised.
- [ ] **Partial:** Replace weak assets instead of repeatedly polishing inadequate
  geometry. Many assets were replaced; inadequate forms still remain.
- [x] **Complete:** Use Blender extensively for modelling, modelled/sculpted
  details, UVs, PBR and baking. Native modelling, Boolean/bevel details, UVs,
  material graphs, texture baking and editable source were produced.
- [ ] **Not complete:** Avoid buildings that resemble assembled procedural
  primitives. Buildings still visibly retain that character.
- [ ] **Partial:** Consistent art direction, realistic scale, convincing materials
  and detailed composition. Scale and material consistency improved; convincing
  composition and realism remain incomplete.
- [x] **Complete:** Inspect actual rendered screenshots throughout development.
  Actual gameplay renders were inspected and defects corrected.
- [ ] **Partial:** Compare results against the intended AAA mobile FPS target.
  The shortfall was assessed, but no rigorous comparison against equivalent
  commercial-game scenes was completed.
- [ ] **Not complete:** Rework anything still noticeably simplistic. Coarse
  weapons, characters, foliage and terrain remain.
- [x] **Complete:** Judge success visually rather than through exports or shader
  compilation. Actual images were reviewed; the requested visual standard was
  explicitly recorded as unmet.

## 2. Rebuild environmental assets

### Buildings and architecture

- [ ] **Partial:** Realistic architecture, detailed facades, interiors and
  structure. Native assets improved; interiors and architecture remain simplified.
- [ ] **Partial:** Proper windows, doorframes, roofs, balconies, stairs, concrete
  edges and wall thickness. Apertures, reveals, frames and structural depth
  improved; the complete library was not brought to professional detail.
- [ ] **Partial:** Detailed architectural materials and convincing wear. New
  materials/weathering exist, but repetition and limited detail remain visible.
- [ ] **Partial:** Realistic damage, exposed reinforcement, cracks, chipped
  plaster and debris. Some damaged concrete, reinforcement and rubble were
  modelled; comprehensive damaged environments were not completed.
- [ ] **Partial:** Believable industrial, military, urban and natural environments.
  These identities are present, but the requested realism was not achieved.
- [ ] **Partial:** Better silhouettes, scale, density and composition. Some
  improvements; environments still look sparse and block-based.

### Ground and terrain

- [ ] **Partial:** Realistic asphalt, dirt, mud, concrete, rock, sand and vegetation
  surfaces. Most material families improved; comprehensive convincing mud/terrain
  treatment was not completed.
- [ ] **Partial:** Irregularities, cracks, decals, tyre marks, puddles and ground
  transitions. Release 61 adds twenty Blacksite construction pours, joints,
  cracks, traffic marks, oil/edge deposits and worn paint. [Matched gameplay
  views](validation-blacksite-ground.json) show the incremental improvement;
  comprehensive decals, transitions and convincing terrain remain incomplete.
- [ ] **Partial:** Detailed terrain variation and realistic material blending.
  Variation exists; sophisticated terrain blending was not completed.
- [ ] **Not complete:** Eliminate obvious repetition and unnatural terrain shapes.
  Repeated surfaces and faceted distant terrain remain.

### Environmental props

- [ ] **Partial:** Improve vehicles, machinery, containers, barriers, pipes,
  fences, furniture, vegetation and military equipment. Many shared props were
  rebuilt; every listed category was not comprehensively upgraded.
- [ ] **Partial:** Realistic mechanical detail, weathering, damage and surface
  variation. Added in parts of the library; professional realism remains incomplete.
- [ ] **Partial:** Replace simplistic props with professionally modelled
  alternatives. Native replacements exist, but several still appear simplistic.

### Vegetation

- [ ] **Partial:** Natural trees, foliage, grass and bushes. Vegetation remains
  stylised and sparse.
- [ ] **Partial:** Better leaf density, silhouettes, shading, variation and light
  interaction. Some shading/material improvements; no complete natural vegetation
  overhaul.
- [x] **Complete:** Preserve efficient vegetation LOD and instancing.
- [ ] **Partial:** Improve believability rather than merely add objects.
  Replacement/material work occurred, but the required believability is not achieved.

## 3. Professional PBR materials and textures

- [x] **Complete:** Reassess the pipeline and move beyond small shared atlases.
  Sixty individual PBR maps and revised native material routing were introduced.
- [ ] **Partial:** High-quality physically based materials. PBR production is
  implemented; visible quality remains inconsistent.
- [ ] **Partial:** Detailed normal, roughness, metallic and ambient-occlusion
  maps. These exist; visible detail does not consistently meet the requested standard.
- [ ] **Partial:** Proper UV mapping and texel density. UV/metric mapping
  improved; hero assets still lack sufficient readable surface detail.
- [ ] **Partial:** Realistic metal, fabric, concrete, wood, glass, paint, soil and
  stone. Families exist; some remain flat or insufficiently convincing.
- [ ] **Partial:** Dirt, rust, scratches, dust, edge wear and weathering. Included
  in materials/some models, but not comprehensively finished.
- [ ] **Partial:** Material variation that avoids repeated patterns. Variation
  improved; obvious repetition remains.
- [ ] **Partial:** Detailed textures for prominent objects and first-person
  weapons. Higher-resolution finishes exist; close-ups still show limited variation.
- [x] **Complete:** Higher resolutions where useful. Prominent weapon finishes
  use 2048-pixel maps; most other maps use 1024 pixels.
- [x] **Complete:** Remove the approximately 11 MiB permanent runtime-art
  limitation. The shipped asset set is substantially larger.
- [ ] **Partial:** Optimise compression, mipmaps, memory, streaming and shared
  resources. Compression/mipmaps/sharing are implemented; full runtime texture
  streaming is not.
- [ ] **Unverified:** Avoid memory spending on details with little iPhone-screen
  benefit. Budgets were estimated; actual device-visible benefit and memory
  behaviour were not verified.

## 4. Lighting and atmosphere

- [ ] **Partial:** Cohesive, realistic mobile lighting pipeline. Improved, but
  convincing realism remains incomplete.
- [ ] **Partial:** Realistic directional sunlight. Existing sunlight is retained
  with improved material/light response; no complete sunlight overhaul.
- [ ] **Partial:** High-quality soft/contact shadows. Existing PCF/contact
  shadows remain; no substantially new high-quality shadow system.
- [ ] **Partial:** Convincing ambient illumination. Ground bakes, room lighting
  and ambient response improved; some scenes remain flat or dark.
- [ ] **Partial:** Baked GI and indirect lighting. Sixteen ground irradiance maps
  were baked; comprehensive architectural/interior lightmapping was not completed.
- [ ] **Partial:** Realistic interior/exterior transitions. Face-aware lighting
  and room selection improved; transitions remain approximations.
- [ ] **Partial:** Environment-appropriate reflections. Map sky probes and a
  shared interior probe exist; individual environments are not reproduced fully.
- [ ] **Partial:** Physically believable light response. Reflectance calibration
  improved; final appearance still falls short.
- [ ] **Partial:** Atmospheric scattering, haze and fog. Restrained atmospheric
  shading exists; a complete realistic atmosphere was not established.
- [ ] **Partial:** Better skies, clouds and environmental lighting. Weather-aware
  sky/reflection treatment improved; retained sky artwork is still used.
- [ ] **Partial:** Balanced exposure, contrast and colour grading. Material/light
  balance improved; existing ACES exposure remains without a comprehensive
  grading overhaul.
- [x] **Complete:** Ambient occlusion where affordable. Packed AO/contact
  treatment are used without adding SSAO passes.
- [x] **Complete:** Bake expensive static lighting where possible. Static ground
  lighting was baked across all maps.
- [x] **Complete:** Avoid excessive bloom, saturation, contrast and cinematic
  filters. No additional bloom/cinematic filtering pipeline was introduced.
- [ ] **Not complete:** Achieve convincing realism rather than merely more
  effects. The requested overall realism has not been achieved.

## 5. Weapons and first-person presentation

- [ ] **Partial:** Completely improve all 30 weapons and attachments. All weapon
  cores were revised; complete professional presentation was not achieved.
- [ ] **Partial:** Realistic proportions and mechanical construction. Physical
  joins improved; proportions/construction remain simplified.
- [ ] **Partial:** Detailed receivers, rails, handguards, barrels, magazines and
  optics. Native detail was added; close-up detail remains coarse.
- [ ] **Partial:** High-quality metallic/polymer materials. PBR finishes exist;
  large uniform areas remain.
- [ ] **Partial:** Mechanical details, engravings and wear. Some detail exists;
  comprehensive readable engravings/individual finishing were not completed.
- [ ] **Partial:** Better hands, gloves and sleeves. Models, seams and normals
  improved; anatomy/hand contact remain angular.
- [ ] **Partial:** Realistic sight alignment and scope presentation. Alignment
  was preserved and mounts fixed; every optic/ADS presentation was not visually
  validated.
- [ ] **Partial:** More convincing reload animations. Third-person hand targets
  improved; first-person reload animation was largely retained.
- [x] **Complete:** Inspection animations. All thirty weapons have side/receiver
  and top/action phases, keyboard/touch/controller controls, combat cancellation,
  pause freezing and spawn/death resets. [Gameplay framing and input evidence](validation-inspection-browser.json)
  and [lifecycle checks](../tests/weapon-inspection.test.mjs) cover the functional
  implementation; premium hand anatomy remains open above.
- [ ] **Partial:** Improved recoil, firing movement and weapon inertia.
  Release 61 adds handling-dependent damped angular lag and analytical shot
  springs while preserving aim and ADS alignment. [Timing/bounds checks](../tests/weapon-dynamics.test.mjs)
  cover all thirty weapons; temporal visual quality has not been accepted.
- [ ] **Partial:** Muzzle flashes, shell ejections and smoke. Effects exist and
  particle presentation improved; firing emitters were largely retained.
- [ ] **Partial:** Physical interaction between hands, magazines, bolts and
  components. Some targets/anchors improved; complete choreography was not rebuilt.
- [ ] **Partial:** Strong realistic silhouettes and attractive close-ups for
  every weapon. Weapons are distinguishable; the premium standard remains unmet.
- [ ] **Not complete:** Avoid generic weapons assembled from primitive-looking
  shapes. Coarse construction remains visible.

## 6. Character models and animation

- [ ] **Partial:** More realistic proportions/anatomy. Body/clothing forms
  improved; characters remain faceted and stylised.
- [ ] **Partial:** Detailed clothing, armour, helmets, equipment and accessories.
  Boots, knee pads, goggles, clothing and equipment improved; fine detail is limited.
- [ ] **Partial:** Better fabric, skin and equipment materials. Cloth/equipment
  improved; realistic skin production was not completed.
- [ ] **Not complete:** Convincing skeletal animation and natural movement.
  Characters still use animated rigid mesh groups, without a new skinned-human
  animation system.
- [ ] **Not complete:** Improved running/walking. Existing procedural locomotion
  was retained.
- [ ] **Not complete:** Improved crouching/aiming. Existing animation behaviour
  was retained.
- [ ] **Partial:** Improved reloading. Third-person magazine/bolt-aware hand
  targets improved.
- [ ] **Partial:** Better animation-state transitions. Existing smoothing remains;
  no substantial new blending system was produced.
- [ ] **Not complete:** More believable hit reactions/deaths. Existing lean and
  death-tilt behaviour was retained.
- [ ] **Partial:** Reduce robotic motion, clipping and inconsistencies. Clothing
  joins, patches and some hand targets were corrected; comprehensive motion
  quality remains unfinished.
- [ ] **Partial:** Efficient rigging, animation blending and LOD. Efficient rigid
  posing/LOD are implemented; professional skeletal rigging/blending remains
  incomplete.

## 7. Effects and environmental realism

- [ ] **Partial:** Professional mobile FPS effect quality. Presentation improved;
  that quality standard was not established.
- [ ] **Partial:** Muzzle flashes and smoke. Smoke rendering improved; much of
  the existing firing system remains.
- [ ] **Partial:** Bullet impacts and surface-specific debris. Material treatment
  improved; complete professional impact production was not achieved.
- [ ] **Partial:** Dust, sparks and particles. Shapes, rotation and shading
  improved; animated quality remains incompletely reviewed.
- [ ] **Partial:** Explosions and shock effects. Existing explosions benefit from
  particle changes; no new visual shockwave system.
- [ ] **Partial:** Smoke grenades and atmospheric smoke. Existing smoke gained
  revised shading/rotation; no complete temporal acceptance review.
- [ ] **Partial:** Fire and environmental effects. Weather/ambient effects
  improved; persistent environmental flames were not implemented.
- [ ] **Partial:** Rain, wet surfaces and puddles. Revised treatment exists;
  convincing realism remains incomplete.
- [ ] **Partial:** Glass damage and material-specific impacts. Material impacts
  exist; progressive glass fracture/damage production was not completed.
- [ ] **Partial:** More convincing visual recoil/movement. Release 61 adds
  analytical viewmodel recoil and angular inertia with bounded responses at
  30/60/120 Hz. A temporal visual-quality review remains open.
- [ ] **Partial:** Satisfying effects without excessive particles. Density is
  bounded; subjective quality remains unestablished.
- [x] **Complete:** Efficient particles, atlases, shaders and quality scaling.
  Bounded, instanced, quality-scaled systems are implemented.

## 8. Rendering technology and engine decisions

WebGPU and engine migration were options in the original prompt, rather than
mandatory implementations.

- [x] **Complete:** Evaluate whether Three.js limits quality/performance.
  Renderer, materials, scene complexity and asset limitations were assessed.
- [x] **Complete:** More efficient WebGL2 rendering. Batching, LOD, upload
  scheduling and shader preparation improved.
- [ ] **Partial:** Consider/use WebGPU where practical. WebGL2 was retained; no
  comparative WebGPU prototype or benchmark was completed.
- [x] **Complete:** Improved physically based shading. Material routing,
  reflectance, colour-space handling and baked-light response improved.
- [ ] **Partial:** Better shadow/lighting techniques. Baked lighting improved;
  shadow architecture was largely retained.
- [x] **Complete:** Instanced rendering. Implemented/preserved across suitable
  assets/effects.
- [x] **Complete:** GPU-friendly materials. Compressed textures, packed maps,
  shared materials and cached variants are used.
- [ ] **Partial:** Asset streaming. Segmented loading/staged uploads exist;
  comprehensive runtime residency/streaming does not.
- [x] **Complete:** Shader optimisation. Shared/cached paths and compile
  validation are implemented.
- [x] **Complete:** Efficient post-processing. Tone mapping stays in the material
  pass; no additional full-screen targets.
- [ ] **Partial:** Modern anti-aliasing/image reconstruction. Native MSAA remains;
  no new reconstruction/upscaling system was introduced.
- [x] **Complete:** Restructure/replace major renderer portions when justified.
  The renderer was revised without an unnecessary engine replacement.
- [x] **Complete:** Avoid migration merely for migration's sake. Three.js/WebGL2
  was retained.
- [ ] **Unverified:** Demonstrate best visuals at comparable iPhone performance.
  Comparable physical-device performance has not been measured.
- [ ] **Partial:** Preserve portability, functionality and performance.
  Functionality is regression-tested; Safari/device performance remains unverified.

## 9. Actual iPhone performance baseline

### Baseline handling

The reference values below remain Release 57 measurements. The user's newer
Release 60 Safari/iPhone report is now archived separately and analysed in
[the device report review](BENCHMARK_RELEASE60_ANALYSIS.md). It records 57.733
average FPS, 27.125 FPS at the 1% low, 17.321 ms mean intervals and 1,002 stutters.
Maps, modes and effective graphics differ from the older extract; aggregate
differences do not establish a controlled same-workload improvement.

- [x] **Complete:** Use approximately 57.4 average FPS as the physical reference.
- [x] **Complete:** Retain approximately 29 FPS at the 1% low.
- [x] **Complete:** Retain approximately 17.4 ms average frame time.
- [x] **Complete:** Retain approximately 3.74 ms measured CPU frame time.
- [x] **Complete:** Retain approximately 1,315 stuttering frames.
- [x] **Complete:** Account for automatic quality/resolution changes.
- [x] **Complete:** Acknowledge unavailable Safari GPU timings.
- [x] **Complete:** Avoid assuming unlimited GPU headroom.

### Performance objectives

- [ ] **Unverified:** Preserve 60 FPS during normal gameplay. Not measured on the
  physical iPhone.
- [ ] **Partial:** Improve frame pacing/reduce stutter. 2026-10-11: the supplied
  Release 60 device run has fewer aggregate stutters and better p95, but a worse
  1% low and one 1,107 ms Blacksite stall. Changes in workloads and graphics
  prevent a controlled improvement claim. See [device analysis](BENCHMARK_RELEASE60_ANALYSIS.md).
- [ ] **Partial:** Comparable/better practical performance than Release 57.
  2026-10-11: actual Release 60 iPhone gameplay supplied, but no graphics/mode
  context matches the older extract exactly. Controlled comparison and
  performance of subsequent changes remain unverified. See [device analysis](BENCHMARK_RELEASE60_ANALYSIS.md).
- [ ] **Partial:** Preserve responsive touch controls/movement. Preserved and
  tested; physical responsiveness is unverified.
- [ ] **Unverified:** Avoid memory-related Safari crashes. Estimates/bounds exist;
  actual Safari memory safety is unverified.
- [ ] **Unverified:** Avoid thermal performance deterioration. Not measurable in
  the available environment.
- [ ] **Partial:** Improve visuals while minimising extra rendering cost.
  Optimisations exist; some close geometry costs increased and GPU impact is
  unmeasured.

### Optimisation and testing

- [x] **Complete:** Aggressive, visually intelligent LOD. Projected-size detail
  selection/hysteresis implemented.
- [x] **Complete:** Efficient instancing/batching. Implemented/preserved.
- [x] **Complete:** Baked lighting. Sixteen ground-lighting bakes.
- [x] **Complete:** Efficient texture compression. ASTC/fallback formats included.
- [ ] **Partial:** Occlusion/frustum culling. Frustum/spatial culling exists;
  Release 61 conservatively hides fully covered operator envelopes behind one
  closed native wall between shadow refreshes. [Five matched browser views](validation-release61-occlusion-browser.json)
  retain identical pixels and complete shadow buffers. Broader world occlusion
  remains open.
- [x] **Complete:** Geometry simplification where appropriate. Native near/far
  meshes and separate body/equipment detail policies.
- [ ] **Partial:** Reduced shader overdraw. Bounded effects/restrained passes
  help; comprehensive overdraw optimisation was not demonstrated.
- [ ] **Partial:** Texture mipmapping/streaming. Complete mip chains; staged
  loading rather than full runtime streaming.
- [x] **Complete:** Adaptive quality. Preserved, including the safeguard against
  promotion without GPU evidence.
- [x] **Complete:** Dynamic resolution scaling. Preserved.
- [x] **Complete:** Avoid unnecessary full-screen passes. No new full-screen
  effect passes.
- [ ] **Partial:** Balance quality/FPS without destroying visible quality.
  Strategies exist; the actual device balance is unverified.
- [x] **Complete:** Browser/software tests, profiling, shader checks and complexity
  measurements. [Release 61 regression and lifecycle results](validation-release61.json)
  and [bounded loading warmup](validation-release61-warmup-browser.json) cover
  the new implementation within available software tools.
- [x] **Complete:** Never present synthetic results as physical iPhone performance.
  Evidence explicitly distinguishes them.
- [x] **Complete:** Preserve Benchmark Mode for real-world testing. Recording,
  saved reports, stress mode and JSON export preserved.

## 10. Development strategy

- [ ] **Partial:** Avoid another superficial iteration across every map.
  Substantial shared production occurred; some results remain too simplistic.
- [x] **Complete:** Choose Blacksite as the initial showcase.
- [ ] **Partial:** Extensively rebuild Blacksite with new assets, textures,
  lighting and rendering standards. Major revisions occurred; the finished
  environment standard was not reached.
- [ ] **Partial:** Include polished weapons, characters, effects and environment
  details. Improved, but insufficiently polished.
- [ ] **Not complete:** Make Blacksite convincingly resemble a professionally
  produced modern mobile FPS before expansion. That threshold was not achieved
  before expanding the library.
- [x] **Complete:** Assess outdoor, interior, weapon close-up and combat images.
  Actual representative views were inspected.
- [x] **Complete:** Test the improved environment with available automated tools.
  Regression, shader, browser and asset checks completed.
- [x] **Complete:** Measure complexity, loading, memory estimates, compilation and
  potential regressions. Completed with stated synthetic/device limitations.
- [ ] **Partial:** Optimise expensive components without undoing visual
  improvements. LOD/uploads/batching improved; complete visual/performance
  acceptance remains unfinished.
- [ ] **Partial:** Apply the established quality level to the other 15 maps.
  All received revised shared assets; the intended quality level was never
  established.
- [ ] **Partial:** Maintain consistency and distinct realistic atmosphere/material
  identity. Libraries/biomes differ; realism remains incomplete.
- [ ] **Partial:** Improve weapons/characters systematically. Libraries revised;
  substantial animation/finishing work remains.
- [ ] **Not complete:** Do not stop at a showcase or partial implementation.
  Map coverage is complete; the overall requested implementation is still partial.
- [x] **Complete:** Preserve frequent usable GitHub checkpoints. Recoverable
  source/runtime checkpoints were committed and pushed.

## 11. Audio overhaul

- [ ] **Partial:** Heavily improve audio to premium military FPS quality.
  Original sound production improved; premium audible quality was not established.
- [ ] **Partial:** Powerful, realistic, distinctive gunfire for every weapon.
  All 30 voicings rebuilt with variants; realism has not been independently
  established through listening.
- [x] **Complete:** Mechanical detail, bass, sharp transients and distant tails.
  These production layers are included; their subjective quality remains unverified.
- [ ] **Partial:** Indoor/outdoor/enclosed-space/distance acoustics. Outdoor,
  room and warehouse responses exist; enclosure modelling remains simplified.
- [ ] **Partial:** Realistic footsteps across concrete, gravel, metal, dirt,
  water and other surfaces. Eight families with five takes each; some surfaces
  share families and audible realism is unverified.
- [ ] **Partial:** Detailed reloads, magazines, bolts and handling. Weapon-specific
  designs exist; complete component-driven foley was not produced.
- [ ] **Partial:** Shell-casing audio. Release 61 schedules bounded native audio
  for hard, metal, wood, soft, water and snow contacts using a cosmetic floor
  query and weapon-specific ejection timing. Full casing physics and subjective
  realism remain open; [playback/cleanup evidence](validation-ballistic-audio-browser.json).
- [ ] **Partial:** Attachment-specific audio. Suppressor variants exist; a complete
  attachment-specific handling library does not.
- [x] **Complete:** Material-specific impacts, glass and debris. Designed
  material families/variants are included; subjective quality remains unverified.
- [x] **Complete:** Ricochet audio. Dedicated glancing metal/stone fragment cues
  use verified terminal contacts, spatial distance and bounded priority voices.
  [Contact/trajectory checks](../tests/ballistic-audio.test.mjs) and
  [native playback](validation-ballistic-audio-browser.json) verify the system;
  audible premium realism remains unverified.
- [x] **Complete:** Penetration audio. Dedicated entry/exit cues follow verified
  ballistic intervals with original variants and spatial playback. Embedded or
  non-exiting shots do not invent exit cues. [Contact checks](../tests/ballistic-audio.test.mjs)
  and [actual event preview](audio-contact-preview.m4a) support review; subjective
  realism remains unverified.
- [x] **Complete:** Deep layered explosions with distance attenuation. Variants
  and attenuation implemented; subjective quality remains unverified.
- [ ] **Partial:** Accurate spatial audio, directional cues, distance falloff
  and occlusion. Horizontal stereo positioning/filtering exist; complete
  3D/elevation/front-back presentation does not.
- [x] **Complete:** Replace weak/repetitive sounds rather than only increase
  volume. The bank was rebuilt and immediate-repeat avoidance implemented.
- [x] **Complete:** Original/licensed assets with licences/attribution respected.
  New sounds are original; no copied commercial recordings.
- [x] **Complete:** Responsive, efficient playback and sensible polyphony.
  Bounded voices, player priority, incremental decoding/shared processing are
  implemented and desktop-tested.
- [ ] **Unverified:** iPhone Safari performance and no noticeable latency.
  Physical latency/sustained performance were not measured.
- [ ] **Unverified:** Immersive premium-mobile-shooter sound character. Generation
  and decode tests do not establish that listening standard.

## 12. Non-negotiable requirements

- [x] **Complete:** Preserve existing weapons, maps and modes. Thirty weapons,
  sixteen maps and eleven modes preserved.
- [x] **Complete:** Preserve gameplay, AI, movement, collision, ballistics,
  progression and controls. Preserved with regression coverage.
- [ ] **Unverified:** Maintain Safari compatibility on iPhone 16 Pro.
  Compatibility designed for; no physical Release 60 verification.
- [x] **Complete:** Preserve offline functionality. Browser-tested offline boot
  and assets.
- [x] **Complete:** Preserve Benchmark Mode, reporting and JSON export. Final
  lifecycle/export checks passed.
- [x] **Complete:** No unnecessary external accounts/hosting dependencies.
  No new runtime account/CDN dependencies.
- [x] **Complete:** Keep Blender source editable. Native source, reconstruction
  tooling and definitions included.
- [x] **Complete:** Include required runtime assets in repository/deployment.
  Committed/deployed from the validated source.
- [x] **Complete:** No unauthorised Delta Force/Call of Duty assets. Original
  assets; commercial-game assets were not imported.
- [x] **Complete:** Maintain a recoverable Release 57 baseline. Recovery branch
  preserved.
- [ ] **Partial:** Comprehensive regression/visual validation. 313 regressions
  and broad image review completed; exhaustive map/animation/temporal visual
  acceptance was not.
- [x] **Complete:** Commit/push frequent checkpoints.
- [x] **Complete:** Do not stop at planning, mock-ups or unimplemented
  recommendations. Actual implementation was committed, pushed and deployed.

## 13. Standard of completion

- [ ] **Partial:** Dramatic improvement immediately visible on opening Breachline.
  Lighting/materials visibly improved; the complete transformation was not achieved.
- [ ] **Partial:** Substantially better environments, lighting, weapons,
  characters, textures, atmosphere and sound. Improvements cover these areas;
  quality is uneven and audible quality remains unverified.
- [ ] **Partial:** Prioritise actual visual/audible impact over implementation
  convenience. Important work occurred; too much still reflects technical/
  procedural construction.
- [ ] **Not complete:** Avoid a release dominated by small details while the
  overall scene stays simplistic. Overall simplicity remains a substantial problem.
- [ ] **Not complete:** Complete professional visual production overhaul.
- [x] **Complete:** Work autonomously and avoid unnecessary questions.
- [x] **Complete:** Preserve gameplay and use Release 57 as the reference.
- [ ] **Partial:** Keep iterating until the whole game reaches a substantially
  higher, consistent standard. Library-wide revisions were made; the requested
  finished standard remains unmet.
- [ ] **Not complete:** Impressive, realistic, polished mobile FPS optimised for
  iPhone 16 Pro. The artistic target is incomplete and device performance is
  unverified.

## Update log

| Date | Change | Commit / evidence |
| --- | --- | --- |
| 2026-10-11 | Recorded the complete thirteen-section user-requested audit as an editable checklist. No production requirements newly completed. | Release 60 audit baseline: `449256114f827a0f2993bf94588c66c617a14e00`; evidence linked above. |
| 2026-10-11 | Archived and validated the user's actual Release 60 Safari/iPhone run. Updated pacing/practical performance to Partial with explicit workload/comparison limits; no art requirements newly completed. | [Faithful report](../benchmarks/iphone-release60-2026-10-06.json), SHA256 `928ec5cd34c237fb02c77aeb0e5caa986842f3ca549c00ccfbd95ef57aee41a8`; [analysis](BENCHMARK_RELEASE60_ANALYSIS.md); checkpoint follows audit commit `1a8fb78f6d6a69fb1be16750b06b9e84ef2455aa`. |
| 2026-10-11 | Benchmark spikes now retain bounded preceding/current callback CPU, render, draw, shadow and shader evidence, even if random raw sampling omits the stall. Older v1 reports remain valid. This adds diagnosis, not a measured performance improvement. | Checkpoint follows `9eedafe`; [measurement definitions](BENCHMARK.md), [behaviour/compatibility checks](../tests/benchmark-spikes.test.mjs); 15 benchmark tests pass. |
| 2026-10-11 | Release 61 implements inspection for all thirty weapons and dedicated ricochet/penetration cue systems. Recoil/inertia advances to Partial; ground finishing, casing realism and broader occlusion remain Partial. Added bounded material/depth warmup and preserved device-performance limits. The full professional overhaul remains open. | Source checkpoint and combined results: [Release 61 validation](validation-release61.json); [implementation/evidence](OVERHAUL_RELEASE61.md), [inspection review](WEAPON_INSPECTION.md), [contact audio](validation-ballistic-audio-browser.json), [matched ground views](validation-blacksite-ground.json), [occlusion comparison](validation-release61-occlusion-browser.json) and [warmup](validation-release61-warmup-browser.json). |
