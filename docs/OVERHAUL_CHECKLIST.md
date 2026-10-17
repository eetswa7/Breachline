# Breachline graphics and audio overhaul checklist

Recorded on 11 October 2026 from the full audit requested by the user. This is
the audit of Release 60 at `449256114f827a0f2993bf94588c66c617a14e00`; recording
the checklist does not claim that additional production work was completed.

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
- Follow the current [verification policy](../AGENTS.md): final runtime changes
  get one `npm run verify` (74 core tests plus packaged/offline checks).
  Historical broader test, shader, browser, audit and profile results below are
  retained evidence, not instructions to rerun them. Unperformed visual/audio
  and physical-device acceptance remains open.

## Release 71 continuation tasks

Scoped progress for 18 October 2026, continuing from Release 70 `41f252b`.
This pass replaces the single returning first-person magazine with distinct
removed and replacement components. [Scope and limits](ART_RELEASE71.md).

- [x] Preserve pushed Release 70 as the baseline and identify the reused-magazine
  gap. Source `41f252b`; native geometry and editable assets remain recoverable.
- [x] Construct cached replacement components for the 26 magazine-fed rigs,
  including current fast, extended and drum attachments.
  Completed 2026-10-18 at runtime source `549139b`;
  [construction bounds and scope](ART_RELEASE71.md).
- [x] Add family-aware extraction, stow/departure, retrieval and seating with
  component-following hand targets, preserving ammunition and contact timing.
  Completed 2026-10-18 at `549139b`; [phase boundaries and limits](ART_RELEASE71.md).
- [x] Share native meshes through remapped proxies and use the same lifecycle
  in fallback rendering, without duplicating native and primitive core geometry.
  Completed 2026-10-18 at `549139b`; [binding and unchanged media](ART_RELEASE71.md).
- [x] Restore neutral visibility on cancellation, completion and menu display;
  preserve default actor choreography and fix magazine/ammunition cache keys.
  Completed 2026-10-18 at `549139b`; [source review and scope](ART_RELEASE71.md).
- [x] Package offline Release 71, run only `npm run verify` once on the final
  runtime state, update benchmark provenance and push usable checkpoints.
  Completed 2026-10-18: 74/74 pass, 88 modules packaged and benchmark provenance
  identifies runtime source `549139b`. [Recorded result](validation-release71.json).
- [ ] Review actual native/fallback gameplay images and physical iPhone costs.
  Additional browser/profile/device checks are outside current verification
  scope; professional animation and device acceptance remain open.

## Release 70 continuation tasks

Scoped progress for 17 October 2026, continuing from pushed Release 69
`cbfe134`. This pass addresses four pistols whose reloads move only small
floorplates and whose magazine attachments have no visible construction.
[Construction scope and acceptance limits](ART_RELEASE70.md).

- [x] Preserve Release 69 as the pushed baseline and identify the detachable
  magazine gap in Sable P, Dire 50, Swift 93 and Paladin 45. Source `cbfe134`.
- [x] Build complete original pistol magazine bodies, feed lips and floorplates
  in the editable native source and fallback, with coherent reload hand targets.
  Completed 2026-10-17 at runtime `e08e6b6`, native foundation `898316b`;
  [construction and export costs](ART_RELEASE70.md).
- [x] Add visible fast, extended and drum options, including the retained
  handling-slot extension, without changing their existing statistics.
  Completed 2026-10-17 at `e08e6b6`; [scope and limits](ART_RELEASE70.md).
- [x] Connect the existing attachment-specific contact voices to those four
  pistols at the existing extraction, handling, insertion and seating phases.
  Completed 2026-10-17 at `e08e6b6`; existing recordings and buffers are reused.
  [Contact implementation and listening limits](ART_RELEASE70.md).
- [x] Rebuild native weapon assets and editable source while retaining all
  existing material bakes and sixteen static lightmaps; package offline Release 70.
  Completed 2026-10-17 at `e08e6b6`; all production payloads have no Git diff.
  [Build recipe, sizes and limits](ART_RELEASE70.md).
- [x] Run only `npm run verify` once on the final runtime state, record costs
  and limits, update benchmark provenance and push usable checkpoints.
  Completed 2026-10-17: 74/74 pass and 87 modules packaged; native foundation
  `898316b` and integrated runtime `e08e6b6` are pushed. Benchmark provenance
  identifies that committed runtime. [Recorded result](validation-release70.json).
- [ ] Review actual native gameplay and fresh listening evidence for the new
  pistol construction and contacts. Additional browser/listening fixtures are
  outside the current verification scope; professional quality and physical
  iPhone acceptance remain open.

## Release 69 continuation tasks

Scoped task progress updated on 17 October 2026, continuing from Release 68.
Actual Blacksite interior images identify repeated coarse generator forms as
the next prominent shared asset weakness. [Release 69 scope and current
limits](ART_RELEASE69.md) record the implementation and acceptance status.

- [x] Synchronise the latest pushed Release 68 source and preserve its complete
  distribution for matched native gameplay comparisons.
- [x] Replace the shared generator's coarse housing with original editable
  diesel, alternator, radiator and service equipment construction; retain its
  existing unit envelope, collision owners, shared materials and near/far LOD.
  Completed 2026-10-17 from editable checkpoint `063369e`; packaged construction,
  runtime `7adee12`, counts and acceptance limits are recorded in
  [Release 69](ART_RELEASE69.md).
- [x] Rebuild static lighting on Foundry (1), Relay (3), Citadel (5), Monsoon (11)
  and Blacksite (14), reusing existing native material bakes and compressed
  material payloads. All material-container and eleven unaffected-lighting
  hashes remain unchanged in the production manifest diff. Completed 2026-10-17
  at runtime `7adee12`; [build and size evidence](ART_RELEASE69.md).
- [ ] Establish byte-exact preservation of other native mesh streams. Their
  definitions and manifest topology records are unchanged; a separate binary
  asset audit is outside the current verification scope and was not run.
- [ ] Review matched native close, room-scale, low-quality and far-LOD gameplay
  images on the five affected maps. This acceptance remains unverified; browser
  image capture is outside the current verification scope.
- [x] Run `npm run verify` once on the final runtime source: exactly the existing
  74 core tests plus the packaged/offline check. Record actual results, costs,
  remaining visual/device limits and provenance, and push usable checkpoints.
  Completed 2026-10-17: 74/74 pass and 87 modules packaged; runtime `7adee12`
  and editable definitions `063369e` are pushed. Benchmark provenance identifies
  the committed runtime. [Recorded result](validation-release69.json).
  Earlier Release 69 shader/browser/audit instructions are superseded by the
  current [verification policy](../AGENTS.md).

## Release 68 continuation tasks

Scoped task progress for 14 October 2026. This continuation targets the repeated
Blacksite hall walls and dark, simplified interior identified in the visual
audit; the original thirteen-section quality requirements remain below.

- [x] Review the Release 67 checklist and actual native Blacksite approach and
  interior baseline images; preserve source `df2e14e` for matched comparisons.
- [x] Replace the central hall wall presentation with original editable native
  exterior/interior models while retaining all real doorway and window holes.
  Both LODs pass full aperture-volume and capsule-route checks;
  [native source](validation-blacksite68-native.json) is reopened and verified.
- [x] Replace the simplified hall ceiling with a coherent structural assembly;
  rebuild Blacksite lighting and retain other maps' assets and presentation.
  All 362 existing native meshes, sixty material containers and fifteen other
  lighting maps remain exact; [asset evidence](validation-blacksite68-preservation.json).
- [x] Review matched native exterior/interior and low-quality/LOD gameplay
  images; verify preserved openings, routes, destruction and rendering budgets.
  Thirteen matched views/26 images and all native comparison gates pass;
  [actual images, low-quality cost exception and repeat limits](ART_RELEASE68.md).
- [x] Run aggregate regressions, packaged/offline and application lifecycle
  checks, update evidence and release provenance, and push usable checkpoints.
  All 421 regressions, four tightened focused checks, 87 modules, 58 shader
  variants and sixteen real application gates pass. Runtime `b9c3fa8`, provenance
  `55fe955` and application checkpoint `8567190` are pushed;
  [aggregate evidence](validation-release68.json). Sites publication remains
  blocked by the missing bundled source workflow helper.

## Release 67 continuation tasks

Scoped task progress for 14 October 2026:

- [x] Finish the pending centred-cell native review across all sixteen maps;
  [49 gameplay views and matched images](WORLD_BATCHES67.md).
- [x] Correct native near/far bounds and validate transforms, LOD switches,
  destruction and nine pixel-exact native comparisons. Source `1e9ae1d`;
  [bounds evidence](WORLD_BATCHES67.md).
- [x] Produce original fast/extended/drum magazine contacts and validate actual
  reload timelines, cancellation, bank preservation and native 44.1/48 kHz
  memory limits. Source `23fedbc`; [audio evidence](ATTACHMENT_AUDIO67.md).
- [x] Implement and review bounded first-person flash/gas timing, all thirty
  weapons and preservation gates. Source `23fedbc`;
  [eighteen gameplay images and remaining limits](FIRING67.md).
- [x] Verify Release 67 offline boot, actual manual JSON download, saved reports,
  touch/keyboard inspection and stress cancellation; record the final 417-test,
  58-shader and 87-module gates. [Aggregate validation](validation-release67.json)
  and [application browser evidence](validation-release67-benchmark-browser.json)
  accompany the final evidence checkpoint.

## Baseline evidence

- [Release 60 production notes and rendered comparisons](ART_RELEASE60.md)
- [Release 60 aggregate validation](validation-release60.json)
- [Actual weapon/Blacksite visual review](validation-release60-visual-review.json)
- [Actual sixteen-map visual review](validation-release60-world-visual-review.json)
- [Image manifest and provenance](art-release60/manifest.json)
- [Audio production and desktop validation](../authoring/audio/README.md)
- [Audio validation result](validation-production-audio-browser.json)
- [Actual Release 57 iPhone reference](iphone-release57-baseline.json)
- [Original asset provenance](ART_PROVENANCE.md)

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
  structure. Release 68 replaces Blacksite's repeated hall-wall kit and dark
  ceiling with complete thick native walls, interior paint hierarchy, columns,
  ledgers, soffit and I beams. Other interiors and broader architectural realism
  remain simplified. Updated 2026-10-14 at `b9c3fa8`;
  [gameplay review, preservation and costs](ART_RELEASE68.md).
- [ ] **Partial:** Proper windows, doorframes, roofs, balconies, stairs, concrete
  edges and wall thickness. Apertures, reveals, frames and structural depth
  improved; the complete library was not brought to professional detail.
- [ ] **Partial:** Detailed architectural materials and convincing wear. New
  materials/weathering exist. Release 68 replaces repeated lower-hall concrete
  motifs with broad backed panel joints and calibrated paint finishes, retaining
  existing PBR wear. Regular surfaces, limited detail and library-wide realism
  remain open. Updated 2026-10-14 at `b9c3fa8`;
  [native Blacksite comparisons and limits](ART_RELEASE68.md).
- [ ] **Partial:** Realistic damage, exposed reinforcement, cracks, chipped
  plaster and debris. Some damaged concrete, reinforcement and rubble were
  modelled; comprehensive damaged environments were not completed.
- [ ] **Partial:** Believable industrial, military, urban and natural environments.
  These identities are present, but the requested realism was not achieved.
- [ ] **Partial:** Better silhouettes, scale, density and composition. Blacksite
  now has a purpose-built gabled industrial hall and broad metal wall hierarchy,
  with Release 68 adding coherent complete lower walls and interior structure.
  Actual close/wider gameplay views are reviewed; other environments remain
  sparse and block-based. Updated 2026-10-14 at `b9c3fa8`;
  [Release 68 images and costs](ART_RELEASE68.md) and
  [original gable/ground work](BLACKSITE61.md).

### Ground and terrain

- [ ] **Partial:** Realistic asphalt, dirt, mud, concrete, rock, sand and vegetation
  surfaces. Most material families improved; comprehensive convincing mud/terrain
  treatment was not completed.
- [ ] **Partial:** Irregularities, cracks, decals, tyre marks, puddles and ground
  transitions. Blacksite loading surfaces now have native slab joints, chipped
  edges, a limited crack and feathered tyre sweeps without transparent overlays.
  Complete-library treatment remains unfinished. Updated 2026-10-12 at
  `20b9875`; [native surfaces and gameplay review](BLACKSITE61.md).
- [ ] **Partial:** Detailed terrain variation and realistic material blending.
  Variation exists; sophisticated terrain blending was not completed.
- [ ] **Partial:** Eliminate obvious repetition and unnatural terrain shapes.
  Release 66 breaks synchronized isotropic material motifs with deterministic
  instance phase and registered albedo/normal/ORM blends, reviewed in matched
  native gameplay frames. Geometry repetition and faceted distant terrain remain.
  Updated 2026-10-13 at `a3eb9db`; [material images and costs](WORLD_MATERIALS66.md).

### Environmental props

- [ ] **Partial:** Improve vehicles, machinery, containers, barriers, pipes,
  fences, furniture, vegetation and military equipment. Many shared props were
  rebuilt; Release 69 adds an open-skid diesel generator with separate engine,
  alternator, radiator and service forms at both LODs. Every listed category was
  not comprehensively upgraded. Updated 2026-10-17 from `063369e`;
  [construction and remaining acceptance](ART_RELEASE69.md).
- [ ] **Partial:** Realistic mechanical detail, weathering, damage and surface
  variation. Release 69 improves generator mechanical construction while retaining
  existing shared finishes. Professional weathering and realism remain incomplete.
  Updated 2026-10-17 from `063369e`; [construction and limits](ART_RELEASE69.md).
- [ ] **Partial:** Replace simplistic props with professionally modelled
  alternatives. Release 69 replaces the coarse shared generator at both LODs;
  native gameplay acceptance remains unverified and several other props still
  appear simplistic. Updated 2026-10-17 from `063369e`;
  [construction and acceptance limits](ART_RELEASE69.md).

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
- [ ] **Partial:** Material variation that avoids repeated patterns. Release 66
  translates and smoothly blends isotropic ground/masonry PBR maps together,
  retaining authored grain, paint and hero finishes. Matched native Blacksite
  frames show less synchronized mottling; wider library realism remains open.
  Updated 2026-10-13 at `a3eb9db`; [gameplay comparisons](WORLD_MATERIALS66.md).
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
  joins and family-specific forged/stamped receiver and swept-stock profiles
  improved. Overall construction remains stylised. Updated 2026-10-12 at
  `2884259`; [native gameplay comparisons](ART_RELEASE63.md).
- [ ] **Partial:** Detailed receivers, rails, handguards, barrels, magazines and
  optics. Release 70 adds complete hollow native magazine bodies, feed lips,
  followers and stepped floorplates to four semiautomatic pistols, replacing
  their former floorplate-only reload presentation. Other close-up detail
  remains coarse. Updated 2026-10-17 at `e08e6b6`;
  [construction and unverified gameplay acceptance](ART_RELEASE70.md).
- [ ] **Partial:** High-quality metallic/polymer materials. PBR finishes exist;
  large uniform areas remain.
- [ ] **Partial:** Mechanical details, engravings and wear. Some detail exists;
  comprehensive readable engravings/individual finishing were not completed.
- [ ] **Partial:** Better hands, gloves and sleeves. Models, seams and normals
  now include rounded palms/knuckles, dedicated thumb masses and continuous
  wrist cuffs. Fingers remain rigid and sleeves tubular. Updated 2026-10-12
  at `2884259`; [actual glove frames and limits](ART_RELEASE63.md).
- [ ] **Partial:** Realistic sight alignment and scope presentation. Alignment
  was preserved and mounts fixed; every optic/ADS presentation was not visually
  validated.
- [ ] **Partial:** More convincing reload animations. Third-person hand targets
  previously improved; first-person hands now follow actual component extraction,
  seating and empty charging actions, with separate shell/top-loader/feed-cover/
  revolver targets. Release 70 moves four complete pistol magazines and targets
  their lower bodies with the support hand. Release 71 adds separate outgoing
  and incoming first-person magazine components across the 26 magazine-fed
  rigs, with hand retrieval and family-aware phase timing. Rigid grasp,
  simplified loaders and third-person reused magazines remain; new gameplay
  acceptance is unverified. Updated 2026-10-18 at `549139b`;
  [exchange implementation and limits](ART_RELEASE71.md),
  [pistol construction](ART_RELEASE70.md) and
  [previous native reload frames](ART_RELEASE63.md).
- [x] **Complete:** Inspection animations. All thirty rigs have a cancelable
  two-sided presentation with touch, keyboard and controller access. Native
  gameplay frame review corrected the second-side arc; combat cancels without
  delay. This feature retains the existing rigid hands. Completed 2026-10-12
  at `20b9875`; [temporal images and tests](WEAPON_MOTION61.md).
- [x] **Complete:** Improved recoil, firing movement and weapon inertia.
  Weighted firing impulses, damped turning/landing movement and blade attacks
  were reviewed in actual native gameplay frames. Exact fully aimed alignment
  and gameplay recoil remain preserved. Completed 2026-10-12 at `20b9875`;
  [motion images and preservation checks](WEAPON_MOTION61.md).
- [ ] **Partial:** Muzzle flashes, shell ejections and smoke. Effects exist and
  particle presentation improved. Release 67 adds bounded expanding/fading
  family-specific first-person flashes and gas puffs, retaining the single
  existing sprite/light and one pooled gas emission per shot. Suppressed flame,
  aiming, ammunition and gameplay casing emission remain authoritative. Native
  frame review finds modest tip-light and gas changes across five families;
  coarse emitter placement and overall professional effect quality remain
  unfinished. Updated 2026-10-14 at `23fedbc`;
  [eighteen native images and preservation gates](FIRING67.md).
- [ ] **Partial:** Physical interaction between hands, magazines, bolts and
  components. First-person component-following hand groups now share coherent
  native/fallback pivots and empty-only action targets. Release 71 adds distinct
  first-person removed/replacement components using shared native geometry;
  this is render-local exchange, without physical world inventory or landing
  contacts. Finger grasp and natural physical interaction remain unfinished;
  lower-magazine interactions can remain off-camera. Updated 2026-10-18 at
  `549139b`; [exchange scope and unverified appearance](ART_RELEASE71.md) and
  [earlier actual contact review](ART_RELEASE63.md).
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
- [x] **Complete:** Improved running/walking. Revised support/swing cycles,
  speed-dependent cadence, foot clearance and coherent torso weight transfer
  are implemented on the efficient existing rigid rig. Native gameplay posing
  frames were reviewed; natural skeletal deformation remains open. Completed
  2026-10-12 at `20b9875`; [character evidence](CHARACTER_MOTION61.md).
- [x] **Complete:** Improved crouching/aiming. Hips/chest and head aim blend
  with attached hands, sleeves and native/fallback guns, preserving actual
  gameplay aim and collision. Native transition frames were reviewed. Completed
  2026-10-12 at `20b9875`; [character evidence](CHARACTER_MOTION61.md).
- [ ] **Partial:** Improved reloading. Third-person magazine/bolt-aware hand
  targets improved.
- [x] **Complete:** Better animation-state transitions. Reused motion state
  blends speed, direction, stance, head aim, landing and impact recovery; pause
  and respawn cleanup are regression-tested. This is rigid posing rather than
  skeletal clip blending. Completed 2026-10-12 at `20b9875`;
  [transition checks and frames](CHARACTER_MOTION61.md).
- [ ] **Partial:** More believable hit reactions/deaths. Chest recovery,
  knee compression and asymmetric death folds now replace the standing-body
  tilt, including modes without respawns. The half-second lifetime, rigid rig
  and absence of physical falls/ragdolls limit realism. Updated 2026-10-12 at
  `20b9875`; [actual death/hit frames](CHARACTER_MOTION61.md).
- [ ] **Partial:** Reduce robotic motion, clipping and inconsistencies. Clothing
  joins, patches and some hand targets were corrected; comprehensive motion
  quality remains unfinished.
- [ ] **Partial:** Efficient rigging, animation blending and LOD. Efficient rigid
  posing/LOD are implemented; professional skeletal rigging/blending remains
  incomplete.

## 7. Effects and environmental realism

- [ ] **Partial:** Professional mobile FPS effect quality. Presentation improved;
  that quality standard was not established.
- [ ] **Partial:** Muzzle flashes and smoke. First-person flashes now expand and
  fade within existing area/light/lifetime bounds; family-sized gas follows
  firing pitch and retains one pooled muzzle emission per shot. Native review
  finds modest visible gains. The authored atlas, approximate gas origin and
  third-person firing system remain; professional quality stays unfinished.
  Updated 2026-10-14 at `23fedbc`; [native frames and limits](FIRING67.md).
- [ ] **Partial:** Bullet impacts and surface-specific debris. Material treatment
  improved; complete professional impact production was not achieved.
- [ ] **Partial:** Dust, sparks and particles. Shapes, rotation and shading
  improved; animated quality remains incompletely reviewed.
- [ ] **Partial:** Explosions and shock effects. Existing explosions benefit from
  particle changes; Release 64 adds a bounded world-space pressure front and
  lifted dust rim. Release 65 [native grenade frames and lifecycle evidence](ART_RELEASE65.md)
  verify visible expansion, expiry and pause/reset handling. Professional
  temporal effect quality remains open.
- [ ] **Partial:** Smoke grenades and atmospheric smoke. Release 66 adds a
  grounded expanding plume, bounded rolling lobes and advected density on the
  existing instanced draw. Fourteen native lifecycle/visibility gates and actual
  temporal gameplay images verify birth, expansion, concealment, fade, expiry,
  pause and reset. Mature clouds remain smooth billboard fog; atmospheric and
  professional effect quality remain open. Updated 2026-10-13 at `1f1a87f`;
  [matched frames, costs and scope](SMOKE66.md).
- [ ] **Partial:** Fire and environmental effects. Weather/ambient effects
  improved; authored fuel barrels now leave upright flames and smoke for twelve
  seconds with bounded quality/range scaling. [Native barrel aftermath](ART_RELEASE65.md)
  verifies the actual engine trigger, persistence, fade and cleanup. Fire is
  cosmetic and the broader professional environmental-effect requirement remains open.
- [ ] **Partial:** Rain, wet surfaces and puddles. Revised treatment exists;
  convincing realism remains incomplete.
- [ ] **Partial:** Glass damage and material-specific impacts. Material impacts
  exist; native glazing now receives progressive clipped fracture overlays.
  Release 65 repairs panes behind retained coarse facade collision using exact
  stopped-owner provenance, without changing ballistics, collision or openings.
  [Actual gameplay shots and preservation](ART_RELEASE65.md) cover the change;
  physical shattering and professional fracture appearance remain unfinished.
- [ ] **Partial:** More convincing visual recoil/movement. Native temporal
  review confirms weighted firing recovery and smoother inertia. The wider
  professional combat/effect presentation remains unfinished. Updated
  2026-10-12 at `20b9875`; [actual motion evidence](WEAPON_MOTION61.md).
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
- [x] **Complete:** Consider/use WebGPU where practical. The optional backend
  choice was evaluated against the actual GLSL/material, texture, profiler and
  fallback dependencies. Retaining WebGL2 avoids an unproven migration while
  asset production continues. This completes consideration, not a WebGPU port
  or performance comparison. Completed 2026-10-13;
  [decision and acceptance requirements](WEBGPU_DECISION64.md).
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

These are Release 57 measurements, not measurements of Release 60.

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
- [ ] **Unverified:** Improve frame pacing/reduce stutter. Mitigations exist;
  actual improvement is unmeasured.
- [ ] **Unverified:** Comparable/better practical performance than Release 57.
  No comparable device run.
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
  Centred spatial cells restore the existing world-batch budget: the isolated
  sixteen-map/49-view maximum decreases from 223 to 212 without new resources.
  All sixteen maps and 49 legal native gameplay views passed the budget and
  appearance/resource gates. Native near/far bounds now conservatively enclose
  both silhouettes, including LOD swaps and destruction; nine targeted images
  are pixel-exact. Updated 2026-10-14 at `1e9ae1d`;
  [source/native comparisons and small culling cost](WORLD_BATCHES67.md).
- [x] **Complete:** Baked lighting. Sixteen ground-lighting bakes.
- [x] **Complete:** Efficient texture compression. ASTC/fallback formats included.
- [ ] **Partial:** Occlusion/frustum culling. Frustum/spatial culling exists;
  Release 67 corrects native near/far conservative bounds. Comprehensive render
  occlusion culling was not implemented. Updated 2026-10-14 at `1e9ae1d`;
  [real-asset and native bounds evidence](WORLD_BATCHES67.md).
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
  measurements. Completed within available tools.
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
  room and warehouse responses exist. Release 67 updates active world-tail
  distance, filtering and cover as the listener moves, with bounded refresh and
  native PCM/listening evidence. Enclosure modelling and shared wet-room tails
  remain simplified. Updated 2026-10-14 at `0ec0b66`;
  [moving acoustics](AUDIO_ACOUSTICS67.md).
- [ ] **Partial:** Realistic footsteps across concrete, gravel, metal, dirt,
  water and other surfaces. Eight families with five takes each; some surfaces
  share families and audible realism is unverified.
- [ ] **Partial:** Detailed reloads, magazines, bolts and handling. Weapon-specific
  designs and component-driven magazine, shell, feed-cover, cylinder and charging
  cues now follow the real reload timeline. Release 65 removes up to 159 ms of
  recorded-region leading silence, retaining at most 2.018 ms to the validator's
  −80 dBFS decoded-sample threshold. This is not device output latency.
  [58 native reload timelines, region/cancellation checks and
  listening reel](ART_RELEASE65.md) make this reviewable. Complete attachment
  handling and premium audible realism remain unverified.
- [x] **Complete:** Shell-casing audio. Engine/render-synchronised contacts cover
  hard, metal, wood, soft-ground and water with separate metallic-case and
  polymer-hull families. Revolvers retain actual fired cases and dump them once
  after cylinder opening; their rendered landings emit the corresponding cues.
  Original timing, ammunition and the bounded pools remain. This completes
  functional arsenal/contact coverage, not premium subjective realism or physical
  latency. Completed 2026-10-13 at `a3eb9db`;
  [gameplay timelines, native decode and listening reel](CASING_AUDIO66.md).
- [ ] **Partial:** Attachment-specific audio. Original suppressor variants and
  fast/extended/drum magazine extraction, manipulation/insertion and seating
  now follow the existing actual reload contacts, including the retained
  handling-slot extension. Stock latches, bolts, shells, cylinders and feed
  covers retain their weapon cues. Eighteen new takes preserve the original
  428 recordings and the decoded-bank budget at both 44.1 and 48 kHz. Fixed
  attachment fitting and premium subjective realism remain unfinished/unverified.
  Release 70 reuses those contact families on four semiautomatic pistols with
  visible magazine attachments; no bank or buffer allocation is added. Other
  pistol handling attachments and the revolver remain outside that scope.
  Updated 2026-10-17 at `e08e6b6`; [pistol contacts and listening limits](ART_RELEASE70.md),
  [prior native contacts, listening reels and allocation limits](ATTACHMENT_AUDIO67.md).
- [x] **Complete:** Material-specific impacts, glass and debris. Designed
  material families/variants are included; subjective quality remains unverified.
- [x] **Complete:** Ricochet audio. Dedicated original metal/mineral variants
  play at shallow hard-cover contacts with position, attenuation, occlusion and
  bounded voices. Deflection cues are cosmetic; the existing bullet stops at
  cover without a reflected damage ray. Completed 2026-10-12 at `30682fc`;
  [event tests, native playback and listening reel](BALLISTIC_AUDIO61.md).
- [x] **Complete:** Penetration audio. Actual outgoing cover faces emit dedicated
  material-specific rupture/debris cues with positional acoustic processing.
  Existing energy loss, collision and target damage remain regression-tested.
  Completed 2026-10-12 at `30682fc`;
  [event tests, native playback and listening reel](BALLISTIC_AUDIO61.md).
- [x] **Complete:** Deep layered explosions with distance attenuation. Variants
  and attenuation implemented; subjective quality remains unverified.
- [ ] **Partial:** Accurate spatial audio, directional cues, distance falloff
  and occlusion. Release 65 adds native HRTF world positioning and full yaw/pitch
  listening orientation, including elevation/front-back cues, centred local
  sources and stereo/legacy Safari fallback. [Native PCM distinctions, head-turn
  equivalence, voice bounds and listening evidence](SPATIAL_AUDIO65.md) verify
  the functional path. Release 67 replaces event-time-only tail attenuation and
  filtering with live listener updates; native tests verify retreat, cover
  insertion/removal, lateral direction and cleanup. Simplified shared room
  responses, subjective localisation/realism and physical Safari performance
  remain open. Updated 2026-10-14 at `0ec0b66`;
  [PCM and listening reel](AUDIO_ACOUSTICS67.md).
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
- [x] **Complete:** Preserve offline functionality. Release 68 browser-tested
  offline boot and actual JSON download pass. Updated 2026-10-14 at `b9c3fa8`;
  [application evidence](validation-release68-benchmark-browser.json).
- [x] **Complete:** Preserve Benchmark Mode, reporting and JSON export. Release
  68 normal recording, saved/reloaded reports, actual manual JSON downloads,
  offline export and cancelled stress restoration pass. Updated 2026-10-14
  at `b9c3fa8`; [application evidence](validation-release68-benchmark-browser.json).
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
- [ ] **Partial:** Comprehensive regression/visual validation. Release 68 passes
  all 421 regressions, source/offline packaging, 58 shader variants and thirteen
  matched native Blacksite views, retaining Release 67 all-map batching/bounds
  and temporal firing evidence. Exhaustive
  map/animation/temporal professional acceptance remains unfinished. Updated
  2026-10-14 at `b9c3fa8`; [integrated evidence](ART_RELEASE68.md).
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
| 2026-10-18 | Completed five scoped Release 71 tasks: distinct cached removed/replacement magazines for 26 first-person rigs, family-aware stow/departure and retrieval/seating, native aliases/shared fallback poses, deterministic cancellation/menu/completion visibility, cache fixes and final offline/core verification. Long-gun fast-mag loops now travel with their owner. Native media and editable source are unchanged; game JavaScript grows 6,485 bytes. All 74 core tests and the 88-module packaging check pass. Updated two original partial explanations. Actual gameplay images, natural grasp, physical discarded magazines, third-person exchange, professional quality and iPhone acceptance remain open. | Continuation `592ea52`, runtime source `549139bdd6a508cce684638899c09ba40de8a5e0`; [implementation, sizes and limits](ART_RELEASE71.md), [verification result](validation-release71.json). |
| 2026-10-17 | Completed five scoped Release 70 tasks: complete magazines for four semiautomatic pistols, visible fast/extended/drum geometry, existing attachment-contact voices, native/offline packaging and final core verification. Added cached lower-body hand targets; retained original joints, gameplay timing/ammunition/statistics, all material/lightmap payloads and the sound bank. Native magazine groups grow from 108 to 1,768–1,792 triangles each; library download increases 146,780 bytes. All 74 core tests and the 87-module packaging check pass. Updated three original partial explanations; actual gameplay/listening, rigid grasp/replacement, other attachment fitting, professional quality and physical iPhone acceptance remain open. | Native foundation `898316b`, runtime `e08e6b6a263f134431aef74d8201cdffa0e2a39d`; [construction, costs and limits](ART_RELEASE70.md), [verification result](validation-release70.json). |
| 2026-10-17 | Completed three scoped Release 69 tasks: original open-skid generator construction, affected five-map Cycles lighting and final core/package verification with pushed checkpoints. Generator topology falls to 2,180 near / 468 far triangles; combined mesh/lighting payload decreases 4,820 bytes. Material-container and eleven unaffected-lighting hashes remain unchanged in the manifest diff. Updated three Environmental props partial explanations. All 74 core tests and 87-module packaging checks pass; binary mesh-stream preservation, matched gameplay images, professional quality and physical iPhone acceptance remain open. All original thirteen sections remain intact. | Definitions `063369e`, runtime `7adee1205aa89069369a955feb731da98cc3578c`; [construction, costs and limits](ART_RELEASE69.md), [verification result](validation-release69.json), [current verification policy](../AGENTS.md). |
| 2026-10-14 | Completed five scoped Release 68 continuation tasks: replaced Blacksite's 36 repeated hall-wall proxies and roof/overhead kit with complete original native walls and a structural soffit; rebaked Blacksite GI. All 362 existing meshes, sixty material containers and fifteen other lighting maps remain exact. Reviewed thirteen matched views/26 images, including low quality and all hall far geometry; recorded the low-quality forecourt's +3.96% selected triangle exception and tiny repeat weapon-light variation. All 421 regressions, four tightened focused tests, 87 modules, 58 shaders and sixteen application/offline/export gates pass. Updated three architectural partial explanations; broader realism, audio and physical-device requirements remain open. Sites publication is blocked by the missing bundled helper. | Runtime `b9c3fa8d9b51c10e805e3fc747bd8d775145bca1`, provenance `55fe955`, application `8567190`; [native images, costs and limits](ART_RELEASE68.md), [aggregate validation](validation-release68.json). |
| 2026-10-14 | Implemented moving-listener world-tail gain/filter/cover updates, separate reload edge envelopes and bounded cover refresh. Fixed a filter reopening artifact found by native PCM review. All 33 focused audio/event regressions and five native movement/cover/listening fixtures pass; broader spatial/premium audio and physical Safari requirements remain partial or unverified. | [Moving acoustics evidence](AUDIO_ACOUSTICS67.md), [native validation](validation-world-acoustics67-browser.json). |
| 2026-10-14 | Rechecked the 397-test source baseline and restored its failing Blacksite world-batch budget with centred spatial cells. All sixteen maps and 49 scene fixtures stay within the existing 220-batch cap. Native visual integration and new production work follow; no broader art requirement newly completed. | [Batch evidence and limits](WORLD_BATCHES67.md). |
| 2026-10-11 | Recorded the complete thirteen-section user-requested audit as an editable checklist. No production requirements newly completed. | Release 60 audit baseline: `449256114f827a0f2993bf94588c66c617a14e00`; evidence linked above. |
| 2026-10-12 | Implemented dedicated ricochet and penetration audio (complete within the documented cosmetic/event scope), surface-specific casing landings (partial), and weapon inspection/recoil/inertia (partial pending native temporal review). The staged usable source passed 88 focused regressions and the 78-module/offline check; all 408 sounds decoded and cleaned up in Chromium. | `30682fcd600d17ac4f9042692e63fdc2af225894`; [audio evidence](BALLISTIC_AUDIO61.md), [motion evidence](WEAPON_MOTION61.md). |
| 2026-10-12 | Completed native visual acceptance of inspection and revised firing motion; implemented reviewed rigid-rig walk/run, crouch/aim and state blending. Advanced Blacksite architecture/ground treatment and hit/death poses while keeping broader art/animation requirements partial. All sixteen maps rendered; final validation is in the Release 61 report. | `20b987517c8c2d1685f301e509ad790d3c1b05ae`; [Release 61 evidence and remaining limits](ART_RELEASE61.md), [Blacksite](BLACKSITE61.md), [weapon motion](WEAPON_MOTION61.md), [character motion](CHARACTER_MOTION61.md). |
| 2026-10-12 | Finished the requested 20 vs 20 rosters on Crossfire District and Blacksite; preserved smaller-map and Gun Game rosters. All 36 focused regressions and twelve full-roster native crowd fixtures passed. No art requirement newly completed; physical-device performance remains unverified. | `84e958af795113e0ce407dc111e3e54367aaf8b7`; [Release 62 roster evidence](ROSTERS62.md). |
| 2026-10-12 | Rebuilt native receiver/stock/glove forms and first-person component-aware reload choreography. Reviewed 26 motion and 36 reload frames, including exact baseline comparisons. Corrected offline caching for the larger library; retained all thirty rigs, attachments and 40-player rosters. Updated the relevant partial explanations without claiming professional realism, anatomical grasp or physical-device performance. | `c51316ca2f4c07bf2a81f5c53ee5aced70b1322f`, `2884259ef473b2e7e0a635002982cb2329d34a98`, `325fd9e57182485a2ee8e4be725ccc483f454db3`; [Release 63 evidence and costs](ART_RELEASE63.md). |
| 2026-10-13 | Completed the optional WebGPU consideration with an explicit source-based backend decision and future acceptance criteria. Retained the validated renderer; no WebGPU implementation or physical performance gain is claimed. | [WebGPU decision](WEBGPU_DECISION64.md); runtime/effect checkpoint follows. |
| 2026-10-13 | Finished native review of Release 64 shock/fire/glass and component reload foley. Repaired unreachable inset facade glass with authoritative-owner contacts, then added bounded HRTF elevation/front-back audio, centred local cues and cached foley-onset trimming for Release 65. Updated partial explanations with actual gameplay images, native PCM/cleanup evidence and listening reels. No professional art, premium subjective audio or physical iPhone requirement newly completed. | Shader checkpoint `e3c3f6e`; native glass repair `1314646`; [integrated Release 65 evidence](ART_RELEASE65.md), [spatial audio](SPATIAL_AUDIO65.md), [final validation](validation-release65.json). |
| 2026-10-13 | Completed bounded casing-audio coverage with original polymer-hull families and actual retained revolver case extraction/landings. Reduced correlated ground/masonry texture motifs while keeping broader art requirements partial. Native case/hull timelines, 44.1/48 kHz bank bounds, matched Blacksite material images, 35 focused checkpoint regressions, 58 shader variants and the isolated 84-module offline source check passed. | `a3eb9db`; [casing evidence](CASING_AUDIO66.md), [material evidence and remaining costs](WORLD_MATERIALS66.md). |
| 2026-10-13 | Advanced smoke-grenade expansion, rolling cloud motion and density; reviewed fourteen actual native temporal/lifecycle gates and matched outdoor/inside frames. Existing AI visibility, capacity, expiry, collision, draw/pool/texture counts remain. Professional smoke quality stays partial; 29 focused root regressions and the isolated 84-module offline source check passed. | `1f1a87f`; [smoke gameplay evidence and costs](SMOKE66.md). |
| 2026-10-14 | Recorded the pushed moving-listener acoustics implementation and its native playback, five PCM fixtures, listening reel and source/ray/voice bounds. Rechecked all 33 focused acoustics/spatial/production/ballistic regressions. Updated the two relevant partial requirements with the implementation commit; premium audio, enclosure modelling and physical iPhone acceptance remain open. | `0ec0b66c8fd33d0731564b02a8098b5f639bc4ed`; [moving acoustics evidence and remaining limits](AUDIO_ACOUSTICS67.md), [native validation](validation-world-acoustics67-browser.json). |
| 2026-10-14 | Added original fast/extended/drum magazine contacts at existing reload crossings, preserving all original recordings, phase/ammunition contracts, voice limits and the decoded-bank budget at 44.1/48 kHz. Added bounded family-specific first-person flash/gas samples and shared Canvas flash gating; later native review finds modest visible gains. Updated the relevant partial explanations. Release 67 packages both new modules for offline installation. | `23fedbc5f5019fc3d6125d56ccabdb9329aa93cf`; [attachment contacts, native playback and listening evidence](ATTACHMENT_AUDIO67.md), [firing review](FIRING67.md). |
| 2026-10-14 | Finished the pending cell-only native comparison across all sixteen maps and 49 legal gameplay views. Corrected a discovered near/far bound omission without new resources; all 112 asset pairs and three focused regressions pass, while nine targeted native images remain pixel-exact. Completed eighteen firing-image and all-thirty-weapon temporal/preservation gates, including an actual Gun Game promotion regression. All 417 final regressions and the 87-module source check pass; broader art/audio/device requirements stay open. | Cell source `3d36f64`; bounds correction `1e9ae1d471ab8671b48821c49e1cd7d9b6897303`; [world evidence and costs](WORLD_BATCHES67.md), [firing evidence and modest visual gains](FIRING67.md), [Release 67](ART_RELEASE67.md). |
| 2026-10-14 | Finished Release 67 aggregate acceptance: all 417 final regressions, 87-module packaged/offline checks, 58 byte-identical shader inputs/compiles, 68 image hashes and 16 real application lifecycle gates pass. Verified offline boot, actual JSON downloads, saved reports, keyboard/touch inspection and stress cancellation. Checked off the five scoped continuation tasks while retaining broader partial/unverified art, audio and physical-device requirements. | Pushed runtime `1e9ae1d` and provenance `5a7d7c6`; [aggregate validation](validation-release67.json), [application evidence](validation-release67-benchmark-browser.json), [Release 67 notes](ART_RELEASE67.md). |
