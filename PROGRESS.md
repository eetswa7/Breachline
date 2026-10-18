# Release 72: operator exchange and component contacts

- Extended removed/replacement magazine presentation to native and simplified
  operators, using existing native meshes and the shared phase/contact sampler.
- Replaced approximate operator magazine travel and shell/cylinder/feed/action
  targets with shared component animation. Compact rigs retain at most 24
  original render pieces and a contact-only palm; replacement roles alternate.
- Runtime `f55d6ba` is pushed. Required `npm run verify` passed once: 74/74 core
  tests and 88-module packaging/offline checks. Game JavaScript grows 699 bytes;
  native/media/editable payloads have no Git diff.
- [Release 72 scope and limits](docs/ART_RELEASE72.md),
  [recorded verification](docs/validation-release72.json) and the
  [updated checklist](docs/OVERHAUL_CHECKLIST.md) retain gameplay-image,
  natural grasp, professional quality and iPhone acceptance as open. Further
  required gameplay review conflicts with the current no-browser check policy.

# Release 68: Blacksite hall construction and interior

- Replaced 36 central-hall wall render proxies with four complete original
  native shells, retaining the real four loading doors and eight open windows.
  Broad pale exterior panels and blue-green/cream interior paint, columns and
  ledgers replace repeated concrete artwork.
- A merged pale soffit with deep I beams and sloped haunches replaces the roof
  slab and seven overhead kit pieces. Blacksite received a fresh Cycles bake;
  all 362 existing meshes, sixty material containers and fifteen other lighting
  maps remain exact. Runtime geometry/lighting download increases by 250,959 bytes.
- All 421 regressions, 87 packaged modules, 58 shader variants and sixteen-map,
  49-view source budgets pass. Blacksite full-detail world geometry falls from
  372,182 to 332,694 triangles; active batches fall from 193 to 192. These are
  software/source scene counts, not physical iPhone timings.
- Source `b9c3fa8` and benchmark provenance `55fe955` are pushed to GitHub.
  [Release 68 evidence](docs/ART_RELEASE68.md) and the
  [overhaul checklist](docs/OVERHAUL_CHECKLIST.md) track actual gameplay review,
  application/offline checks and remaining work. Broader professional realism,
  premium audio and physical iPhone acceptance remain unfinished. Sites
  publication is blocked by the unavailable bundled source workflow helper.

# Release 59: continuation of the production art and audio overhaul

- Fixed exterior-face sky access and ground bounce without another texture tap.
- Removed heavy diffuse tinting from textured world parts and retained native
  vertex-material finishes and baked uniform-material roughness.
- Extended native near/far selection to individual props and facades, retaining
  nearby detail and preventing destruction from resurrecting distant cover.
- Added shared short-room and warehouse acoustic responses for gunfire,
  movement, landings and weapon actions; no extra audio download is required.
- Verified 284 regression tests, 76 packaged modules, 38 GLSL ES variants and 49
  conservative world-scene samples across 16 maps. Maximum active world meshes:
  200. Blacksite approach world triangles: 242,078 full detail to 170,122 selected
  LOD, with 196 active world meshes. These counts exclude actor, weapon and shadow
  passes and do not measure iPhone FPS or temperature.
- Release 57 baseline and the editable Release 58 Blender source remain in git.
  Source checkpoint: 42db6e485896a9805534b0a58e54d5c9e21754e0 on
  art-production-overhaul. Release 59 advances the offline cache and benchmark
  content fingerprint for an unambiguous new device report.

# Release 54: Nuketown recreation and lower combat allocation cost

- Added the two houses with open interiors, stairs and balconies, back gardens,
  school bus, open moving truck, cul-de-sac and flanking paths. Collision-safe
  objectives and starts connect to both upper floors and the truck cargo area.
  This is a handcrafted recreation with approximate dimensions and existing
  Blender assets, not a verified exact Call of Duty map port.
- Retained the existing asset download by reusing the Blender kit and desert
  landscape. Authored dressing stays within 340 colliders and 1,400 decor items;
  the new map uses 126 world batches in the browser fixture.
- A* reuses typed-array heap storage and generation-stamped search buffers;
  its search budget counts expanded nodes rather than duplicate heap pops.
  Map-specific grid spacing and tread construction connect the compact stairs.
- Bullet traces reuse exact hitboxes, with a conservative horizontal broadphase;
  close-actor avoidance also rejects distant actors before distance calculations.
  Long-barrel sniper traces now reach targets beyond the original 140 m cap.
- Gun Game bot engagement distance follows the current gun. The two huge maps
  get 22.5 minutes so the complete 29-firearm ladder can finish across their lanes.
- Fixed-seed CPU profiles retain 471 route requests per map and the same shots
  (571/426). Median 2,400-step simulation times: Crossfire 196.4 to 174.5 ms,
  Blacksite 173.2 to 170.0 ms. Search expansions fall from 51,465 to 43,919 and
  102,620 to 72,405. Container CPU measurements do not establish iPhone FPS.
- Final verification: 255 tests passed; 62 JavaScript modules, geometry, assets,
  manifest and complete Release 54 offline shell pass static checks. Software
  WebGL2 rendered all 16 maps and 31 attachment options with no errors. The
  actual loadout displays effects, the huge-map menu shows 8 vs 8, and Nuketown
  deploys through the normal menu with service-worker installation enabled.
- Release 53 was saved to GitHub main as
  a31198ce51ada95b581648cb27307011ba4f7267 and its Pages deployment succeeded.

# Release 53: gun finale, impactful attachments and 8 vs 8

- Gun Game now advances through 29 unique firearms and ends on the Krait R.
- Expanded optics, barrels and handling; independent magazine and ammunition slots.
- Attachment effects feed recoil, lateral kick, spread, zoom, movement, reloads,
  damage, penetration, bot hearing and visual models, with loadout trade-offs shown.
- Crossfire District and Blacksite use 8 operators per team in all team modes,
  with additional collision-safe starting positions. Free-for-all rosters remain 8.
- Combat/attachment and model/aim checks: 16 passed.

# Release 44: iOS frame pacing, deployment preparation and combat feedback

- Replaced elapsed-since-last-draw gating with a running render deadline. Synthetic
  20-second timestamp workloads preserve 60 FPS on 75, 90 and 144 Hz displays;
  the previous gate accepted 37.5, 45 and 48 frames per second respectively.
  Jitter, missed deadlines, clock resets and rate switches do not create bursts.
- Added a saved 30/60 FPS selection. Automatic graphics scales CPU/GPU/frame
  thresholds to the selected budget and remeasures after changing it. The fixed
  60 Hz simulation and single-use input edges are preserved at either render cap.
- Generated textures upload in yielding batches during loading. Match preparation
  compiles both equipped guns and populated, unculled actor materials before
  controls activate. The active slot is restored even after failed preparation.
- Backgrounding during deployment produces a paused match. Failed/context-lost
  preparation returns to the menu and releases the previous screen lock. A lock
  granted after leaving a match releases itself rather than keeping the display on.
- Added remaining reload seconds and a progress track, shell-loading feedback,
  objective-score ranking for Hill/Gun Game/Kill Confirmed/CTF, Elimination alive
  counts and clearer vault instructions.
- Focused checks cover coalesced touch acceleration, independent thumbs, invalid
  samples, graphics budgets, warmup, lifecycle interruption and the actual frame
  loop at 60/90/120 Hz with 30/60 FPS caps. Timing profile data is synthetic;
  physical iPhone GPU frame rate, thermal behaviour and visual quality are unmeasured.
- Final verification: all 29 regression files pass. Static checks validate 48
  JavaScript modules, geometry, local assets and the complete Release 44 offline
  shell. The shader stages are unchanged from the 13-variant Release 43 compile.

# Release 43: expanded arsenal, battlegrounds and objective rules

- Added eight original firearm models and complete handling/audio profiles:
  Peregrine 6 two-round rifle, Osprey S rapid-fire SMG, Bison 12 shell-fed pump,
  Talon 338 bolt sniper, Rampart 556 drum LMG, Spectre SD integral suppressor,
  Krait R six-shot revolver and Swift 93 automatic pistol. All 24 weapon models
  pass finite-transform, distinct silhouette, attachment and cached-animation checks.
- Expanded primary selection to 19 guns and sidearms to four, preserving every
  existing weapon/save ID. Every gun has cached shot, suppressed, reload, seat
  and rack sounds. Gun Game uses all 24 weapons and allows 30 seconds per tier.
- Added Skybridge's raised transit concourse, Monsoon's four-door freight depot,
  wet materials and reflective puddles, and Emberworks' tank farm and catwalk.
  All spawn-to-objective routes pass, including the elevated concourse.
- Added free-for-all King of the Hill and team Elimination. Hill uses exclusive
  occupation, contested time reset, rotation and personal-score timeout ranking.
  Elimination disables respawns, resets rounds, supports draws and ends at five.
- Bot loadouts vary within each tactical role. Hill bots pursue the current zone;
  Elimination bots participate in round play. Weather remains deterministic and
  bounded to 36 rain streaks, clearing beneath roofs through the shared effect draw.
- Validation includes all-map full Gun Game blade finishes, all-map existing
  objective-mode results, new-map Hill scoring and Elimination completion, audio
  coverage, save compatibility, navigation and rendering scene budgets.
- Bot weapon variety uses a separate seeded stream so adding firearms preserves
  spawn selection and simulation randomness. Ground contacts and bullet marks
  follow the visible top of Monsoon's shallow puddles.
- All 27 regression files passed. Static validation covers 47 modules and the
  offline shell; all 13 compiled GLSL ES shader variants passed.
- Graphics profile: new maps use 145–159 world batches at High in the CPU fixture.
  Those counts are scene construction measurements, not iPhone GPU/FPS results.
  The cloud browser still cannot open the local preview.

# Graphics and controls revision — 2026-09-06

Implemented: original texture/foliage/sky assets, detailed weapon and character models, map dressing, WebGL lighting and postprocessing, textured compatibility graphics, corrected 4× scopes, simpler two-thumb controls, context interactions, automatic empty reloads and safe control placement.

Release verification: 42 regression tests pass. Static checks validate 21 modules, mesh winding, assets and complete offline shell. ES modules and CSS use release URLs; service-worker v6 preloads all game modules and textures.

Prior browser checks covered menus, touch actions, loadouts, scoped view, responsive layouts and match flows using compatibility graphics. Final browser recheck was blocked by the environment URL policy. WebGL shader runtime, physical iPhone FPS/thermals, gyro and controllers still require device validation. No measured 60 FPS or commercial-game visual parity is claimed.

This repository retains the original five bot modes, four maps, twelve firearms plus blade, equipment, local progression, developer tools, and complete match/replay flow. No missing external assets or native build dependency is introduced.

## Fast follow-up — 2026-09-07

Checkpoint 1: fixed recoil recovery at vertical aim limits, respawn first-shot state, disabled-storage launch, corrupt saved control positions, and release of completed spatial-audio nodes.

Checkpoint 2: dynamic instance-buffer sizing, lighter character bevels, reduced redundant AI sight checks, adaptive shadow fallback, per-frame scope overlay alignment, soft billboard smoke/fire and impact dust, map-tinted ambient light and material weathering.

Checkpoint 3: soft character contact shadows, scalable reload/swap controls, explicit asset-download retry, lower results-screen work, wake-lock cleanup on replay/results, and corrected objective handover/FFA awareness.

Final verification: six focused regressions added for recoil, respawn accuracy, inaccessible/corrupt saves, audio cleanup and instance capacity. Release URLs and offline cache advance to v7. Full suite: all 48 tests passed. Static validation passed for all 21 modules, geometry, assets and offline shell. Physical iPhone/WebGL runtime validation remains outstanding.

## Three.js expansion

Checkpoint: player-relative ALLY/ENEMY HUD labels with different shapes and colours, line-of-sight gating, explicit scoreboard team labels, dynamic map counter, and fallback projection support. Renderer, arsenal and additional content are being prepared independently for integration.

Checkpoint: integrated the 13 rebuilt weapon models and animated mechanisms, individual synthesized audio, Breakwater and Citadel maps, Hardpoint and Kill Confirmed with bot objectives, relative-team uniforms, and objective HUD. Pinned and vendored official Three.js 0.180.0 with its MIT licence. Renderer integration and release-cache migration follow.

Checkpoint: Three.js is the sole GPU renderer. Real Three scene tests cover six maps, every weapon, clear magnified scopes, team colours, dynamic buffer growth and destruction without rebuilding the world. Home Screen release 8 uses a complete-cache activation handshake; wrong-release modules are never substituted. Legacy WebGL implementation is removed.

Final expansion validation: all 75 tests and static validation passed (25 JavaScript modules). Content agent also completed 42/42 map/mode simulations. Scope, touch, saving, objectives and match lifecycle regression coverage is retained. GPU rendering and physical iPhone performance are not measured here. Publishing follows successful combined verification.

## iOS upgrade checkpoints — 2026-09-08

Release 9: joystick capture/release repair, native touch reconciliation, recycled pointer IDs, interruption handling, independent thumbs and dead zone. Passed 23 focused input/cache tests plus static checks. Saved on GitHub as 23546c66a6e14cf014e3fe8b5d01a1d5e447c64f and deployed to the existing Site as version 5. Source checkpoint: 68009e52eeb9adfbfbc5083f60d1ae45c6e8b491.

Release 10: integrated 95–144 distributed ground spawn pockets per map, threat/history/grenade scoring, bounded visibility work, additional escape routes/screens, generated weapon-finish atlas, richer reload mechanisms/audio, world-relative weapon light, finer material detail, texel-stable shadows and reduced GPU upload/geometry costs. TouchList indexing additionally covers native array-like lists.

Combined verification: all 100 tests passed; static validation passed for 26 JavaScript modules and all local assets. Current tests include all-map corner-camper escape, repeated spawn variety, navigation, bots completing Gun Game/Hardpoint/Kill Confirmed, scope alignment, touch recovery, saving and renderer cache invariants. Native GPU visuals and sustained iPhone performance remain unmeasured. All original content retained. The next operation is source/GitHub checkpoint and deployment of release 10.


## Release 11: DualSense controller support

Standard-mapped Bluetooth DualSense controllers use left stick movement, right stick aiming, L2 ADS, R2 fire, Cross jump, Circle crouch, Square reload or objective interaction, Triangle weapon switch, L1 grenade, R1/R3 melee, L3 sprint and Options pause/resume. D-pad navigates menus and adjusts settings; Cross confirms. Touch controls remain available. Controller sensitivity, ADS sensitivity, radial dead zone and inverted vertical aim are saved independently. Disconnecting pauses the match; neutral rearming prevents stale movement or shots after interruption.

Pair the controller using iPhone Bluetooth settings, open the game and press a controller button. Release the controls after connection or resume to arm gameplay. Initial game launch and audio may require a screen tap. Uses the browser standard Gamepad mapping; adaptive triggers and controller gyro are not implemented.

Validation: 107 automated tests passed, including seven controller regressions; static validation passed. Physical Bluetooth DualSense testing on iPhone remains required.


## Release 12 checkpoint: traversal and spawn flow

Added capsule sweeps between navigation nodes, bounded bot path requests, collision bucket acceleration, local bot separation, stuck replanning, spread capture positions, buffered jumps and coyote time, smoother acceleration/braking, predicted rushing-enemy spawn risk and precomputed spawn facing toward clear exits. Collision queries fall back safely when developer tools replace geometry.


## Release 13: Switchyard, Canopy and expanded arsenal

Eight maps now include SWITCHYARD (offset freight cars, depot crossovers, raised signal platform) and CANOPY (four-exit cabins, covered courtyard and observation deck). HARROW B3 is a three-round-burst rifle; MARTEN 45 is a slower, heavier SMG. Both have original first-person models, recoil, attachments, handling and synthesized sound. Stable weapon IDs preserve saved careers. Gun Game has 15 stages including the final blade. All 114 tests passed, including traversal, new maps and burst behaviour.


## Release 14 final checkpoint

Eight maps, fourteen firearms plus blade, fifteen Gun Game tiers and seven modes. Added static prop contact shading, baked interior ambient shading, subtle surface variation, material dithering, sharper weapon finishes, bounded framebuffer size, continuous bot animation and controller/touch HUD switching. Hidden diagnostics include draw calls and render size.

Checkpoint release 12 pushed as b654876846069a3a61b6510567de7cede7383a8e; release 13 pushed as 6aaf80b0cf1515ae9bcc1c0c71a1a05cdfa1c20b. Both are on GitHub main. Latest Sites publication may lag until the final push finishes. All assets are original or vendored with their licenses. No native iPhone profiling was available.

Final validation: 117/117 tests passed after all gameplay changes; 28 JavaScript modules, local assets and complete release 14 offline shell validated. GitHub Pages deployment and existing private Sites deployment are checked after the final push.


## Release 15: measured graphics budgets

Continued from GitHub main eb1908e7e72a2046fe16bbe76a12755ee2a02c2d. Source files were checked against the remote blob identities before editing. Added independent graphics-quality and graphics-profiler systems, LOW/MEDIUM/HIGH/ULTRA, measured promotion/demotion with hysteresis, CPU-aware scene reductions and bounded dynamic resolution. Automatic starts at Medium and earns higher tiers during active gameplay. Menus and resume gaps do not train it. Optional disjoint GPU timer queries never block; unsupported timing displays unavailable. Diagnostics include CPU, GPU, frame p95, draw calls, triangles, estimated texture memory, shader programs and shadow resolution/cadence. High shadow coverage narrows from 68 m to 56 m for finer near-player detail at unchanged map size.

Validation: 122 automated tests and static validation passed. Cloud browser launch/settings checks use Canvas compatibility because its WebGL driver is disabled. GPU shader output and physical iPhone FPS/thermals remain unverified. No gameplay, map, arsenal, controller or save functionality removed.


## Release 16: indirect lighting and physical surface detail

New independent lighting-field, environment-probes and material-detail modules. Each map bakes a 64 × 64 (16 KiB) height-aware indirect-light field for roofed interiors, local warm bounce and ground contacts. It modifies indirect illumination rather than multiplying sunlight or surface albedo. Destroyed roofs rebake the field. A map-specific original HDR radiance dome provides sun-aligned PMREM reflections with 128 px cube faces. Viewmodel reflections remain fixed to world orientation; a nearby, visibility-checked lamp lights hands and weapons. Packed cavity/roughness/metal variation reuses the roughness sample. MSAA alpha-to-coverage improves foliage edges; double-sided billboard particles use one pass.

All 127 regressions and static checks passed. Container light-field baking took 19.8–57.7 ms per map; HDR source generation 18.5–42.7 ms, both only at map load (field also after destruction). These are CPU timings, not GPU or iPhone timings. Browser confirmed launch, quality options, deployment and touch HUD in an 844 × 390 viewport using the existing Canvas fallback. The cloud driver disables WebGL, so the new shader appearance and physical device performance still require device checks.


## Release 17: stable detail and lower spike cost

Completed the modular graphics pass with shadow-system, render-pipeline, particles, decal-system and scene-lod modules. Tiny non-structural decoration uses screen-size culling with hysteresis and cached instance uploads. Actor LOD responds to ADS magnification and no longer removes distant combatants according to quality tier. Bullet marks are surface-aligned, irregular alpha-tested two-triangle decals in one bounded batch. High/Ultra reuse the particle pool for sparse dust by interior fixtures. Small turning inertia and landing motion preserve fully centred ADS.

Profiling identified whole-map light rebakes on destruction as an avoidable frame spike. Replacements now bake two rows per frame and swap only once complete. Shadow diagnostics count actual caster draws. Map changes reset quality warmup. All imports and the offline shell advance together to release 17.

Validation: 134/134 regressions passed; static checks validated 38 JavaScript modules, geometry, local assets and the complete offline release. The real-game browser harness confirmed launch, Ultra selection, deployment, touch HUD, pause/scoreboard, return to menu and portrait rotation guard using Canvas compatibility. WebGL is disabled in the cloud driver; the new GPU shader appearance, sustained iPhone frame rate and thermals remain unverified.

Repeatable container profiling and raw results are included in docs/GRAPHICS.md, docs/graphics-profile.json and scripts/profile-graphics.mjs. At seeded High-quality spawns across eight maps, world batches total 105–185 and the default rifle remains 15,144 triangles in 10 batches. Actor preparation medians were 0.065–0.134 ms. Complete light bakes took 16.2–49.6 ms; two-row slices had 0.47–1.05 ms medians. These are CPU/scene measurements, not GPU or iPhone FPS claims. The graphics guide documents texture budgets, current uncompressed GPU storage, post-processing tradeoffs and the TSL work needed before a measured WebGPU rollout.

GitHub checkpoints: release 15 at 4b8dcac30c2653d104c4d9f9177befdb7802b8f2; release 16 at c94ce6ffa046da7ca85af7c0a78316e7f3896f62. Release 17 follows both on main. Further costly effects require physical-device visual and timing comparisons; no unmeasured GPU benefit is claimed.


## Release 18: visible game version

Settings now ends with BREACHLINE · VERSION 18. The label reads the boot release constant, which scripts/release.mjs updates with every release, so no separate display number needs manual maintenance. Static validation passed.


## Release 19: doorway daylight and weapon sun occlusion

Renderer audit starts from release 18. The first fix replaces uniform roof shading with visibility-tested doorway daylight gradients in the existing 16 KiB field. First-person indirect illumination samples that same field continuously; sun visibility checks at 5 Hz prevent the gun keeping a sun highlight behind solid cover. No extra GPU light, texture lookup or render pass. Focused lighting/renderer regressions and static validation run before checkpointing. GPU appearance and iPhone timings remain unverified.


## Release 20: continuous texture mapping and calibrated roughness

Fixed cylinder UVs that repeated the entire tile on every segment, sphere UVs collapsed to one texel, and discontinuous tube mapping. Static per-face UV metrics replace bevel-normal axis switching and remove the oversized minimum repeat on tiny weapon parts. No additional fragment texture samples or draw calls. Roughness variation is centred on authored values; painted blue metal, rust and plaster retain dielectric responses. Regression checks cover circumference continuity, rounded-face metrics and shader composition.


## Release 21: interior hero reflections and physical bevels

A small static room PMREM replaces blue outdoor reflections on the first-person weapon indoors. Selection has doorway hysteresis and uses the existing environment sampler, with no live captures; this is a generic room approximation, not local geometry reflection. First-person hemisphere direction now stays upright in world space. Hard weapon parts retain a maximum 2.5 mm physical bevel under non-uniform scaling, preserving their outer bounds and existing geometry count. Soft gloves retain their rounded silhouette. Focused lighting, surface and weapon regressions run before this checkpoint.


## Release 22: aged surfaces, connected shadows and thin foliage

World material shading adds restrained instance variation and a damp/dirt band at ground-level wall bases, reusing the existing world coordinates with no new texture samples. Shadow bias now scales with texel size; the cadence accumulator preserves fractional time, fixing High's 24 Hz budget previously slipping to 20 Hz at 60 FPS. Leaves receive a capped sky-transmission approximation in their existing PBR pass. Focused shader-composition and temporal-cadence checks run before checkpointing. GPU tuning still requires real device comparisons.


## Release 23: connected animation, specular stability and final profile

Completed the ten-point renderer audit with connected two-bone leg posing, alternating foot lift, forward knee bend, crouch continuity and perturbed-normal specular anti-aliasing using Three's existing derivative operations. Corrected the CPU fixture to match production cylinders. Compared release 18 and 23 across eight maps. All sampled world and default-weapon triangle counts are unchanged; world batches decrease on five maps and the default rifle remains 15,240 triangles in 10 batches.

Light-field optimisation preserves byte-identical results across all eight maps. Destruction rebuilding now checks a 0.65 ms soft deadline per 16 texels, at most 128 texels per frame, with a complete-texture swap. The ranked fixes, explicit costs and raw timings are in docs/RENDERER-AUDIT.md and docs/profile-release18.json / profile-release23.json. Final verification passes 142 automated regressions plus static release/geometry/assets checks. The browser URL policy blocked the final preview, so no new browser GPU/visual or iPhone FPS claim is made.

Pushed checkpoints on main: release 19 2d83f69564a38b3a10e8fa377458f34e86fa53c7; release 20 8d300035b443109b4f9462c9550ba252c451407d; release 21 c71f2b4745f9db1d5c2e9bec8e6c88761ee6a0f5; release 22 0c1754442a4dc447d38b67ff977384883a83e3df. Release 23 follows after combined validation.


## Release 24: coherent map weather and exterior shade

The visible sky now shares the same generated HDR source as the map reflection probe, including sun direction and overcast weather. Broad cloud structure is extracted once from the original asset; its unrelated mountain horizon no longer appears over the harbour and every other map. A 512 × 256 HDR source replaces the 2048 × 1024 uploaded panorama. Exterior indirect occlusion now survives at player eye height; only actual roof texels restore sky access above roof level. No additional light, draw pass or fragment lookup. New field/cloud regressions and static checks run before checkpointing. Browser preview remains blocked; physical iPhone visual output is unverified.


## Release 25: surface placement and believable dressing

Removed duplicate room floor finishes and generic mechanical units from narrow Citadel gallery roofs. Random weeds now stay out of covered interiors and broad paved finishes. Thin ground-level decorative slabs become layered receiving planes instead of shadow-casting boxes; collision blocks, raised paths and stairs remain intact. This removes needless floor caster work and gives floor layers stable depth ordering. Map-by-map scene invariants and the existing gameplay/navigation suite verify the change before checkpointing.

## Release 26: contained interior bulbs and continuous camera stride

Room lights use soft interior bounds to prevent unshadowed bulbs illuminating exterior wall faces and roof tops. The shader reuses the light-field world position: three bounded bulbs, no extra texture sample, shadow cube or render pass. This is a room approximation; small props do not acquire point-light shadows. Bounds follow lamp selection at 5 Hz and clear when a roof is destroyed. Camera stride now integrates travel instead of multiplying elapsed time by changing speed, settles after stopping, freezes while paused and stays centred at full ADS.

All-map room-boundary and motion regressions pass. An optional offline Mesa EGL gate compiles and links 11 material shader variants, including patched lighting, foliage, physical glass, weapon bevels, normal maps and ACES. This validates shader syntax/composition, not images, browser behaviour or iPhone GPU speed. Raw CPU/scene measurements are in docs/profile-release26.json; shader results are in docs/shaders-release26.json. Releases 24 and 25 are already pushed to main.

Release 26 verification: 149/149 automated regressions and static validation passed (43 JavaScript modules). All 11 offline material shader variants compile and link on Mesa GLES.

## Release 27: water response, visible contacts and floor batching

Breakwater's flat glass slab and rigid white foam strips become one opaque PBR water plane with water's 1.333 IOR, restrained crossed ripple normals and pixel-footprint filtering at distance. It uses the existing PMREM; no reflection capture, transparency target, extra texture or wave geometry. Twelve offline material shader variants now compile and link.

Spatially indexed visual floor heights keep contact shadows and ground bullet marks above decorative finishes without altering collision heights. Small floor planes batch across spatial chunks; architecture retains its culling chunks. Inspection also caught an overly broad release 25 conversion: shallow steel rail heads and wooden sleepers now retain their 3D silhouettes. New checks cover all-map finish heights, rotated strips, contact/impact placement, water material cost and Switchyard rails. Full regression and static gates run before pushing.

Release 27 verification: 153/153 regressions, static validation (44 modules) and 12/12 offline GLSL ES compile/link variants passed. CPU and scene counts are recorded in docs/profile-release27.json.


## Release 28: momentum movement, tactical bots and Mako 7

Sprint plus crouch starts a short directional slide with preserved momentum, lowered stance and a 1.25-second recovery window. Touch, keyboard and controller instructions describe the new input. Bots can lob their carried frag at a visible enemy from medium range, with a bounded cooldown. The Mako 7 adds a semi-automatic long-range marksman rifle with its own model, handling, weapon progression and Gun Game tier. The release script now sources its offline texture list from the renderer's texture manifest, preventing a release from silently omitting atlas URLs.

Validation: 156/156 automated tests and JavaScript syntax checks passed, including movement cooldown, bot grenade and 16-weapon model/save/attachment checks. The offline shell retains all four authored texture URLs. The packaged-asset checker cannot complete in this local workspace because the image blobs are not available here; the existing remote assets are unchanged. Slide feel and performance still need a physical iPhone check.

## Release 29: Frostline and Iron Quarry

Frostline adds an alpine listening post, snow terrain, patrol cabins and a beacon-lit centre. Iron Quarry adds a stone extraction site, loading shelters and conveyor trestles around a low crusher apron. Both include three objectives, authored cover and accessible ground routes. Vegetation and distant silhouettes match each setting; terrain colour, sky and fog differ by map. Navigation, all-spawn objectives, map scenery budgets, rendering, and bot-driven match completion are checked across the expanded roster before pushing.

Release 29 verification: 157/157 automated regressions and JavaScript syntax checks passed. `npm run check` could not reach its packaged-asset checks because `dist/icon-192.png` is absent from this local repository handoff; the existing remote image assets were left unchanged. The offline-release regression confirms all four authored texture URLs remain in the service-worker shell.

## Release 30: Capture the Flag and grounded objective routing

Capture the Flag adds team flag bases, touch pickup and return, death drops, a 25-second automatic return, captures only while your own flag is home, and a three-capture limit. Bots carry, escort, recover and return to base. The radar, objective strip, capture feed, per-player capture table and both renderers show flag state; the Three.js renderer adds animated, team-coloured cloth. A navigation nearest-node fix keeps ground actors from snapping onto a nearby room roof when an occupied grid cell has only an upper-floor node.

## Release 31: wind-driven map weather

Frostline now has sparse wind-blown snow and Iron Quarry has drifting grit. A shared deterministic camera-space weather field feeds Three.js billboards and small, depth-sorted Canvas particles, with roof-aware shelter and counts tuned to graphics quality. The effect uses the existing particle pool and adds no textures, GPU passes or unbounded objects. README map/mode counts were corrected to the current ten battlegrounds and eight modes.

Release 31 verification: 165/165 automated regressions and JavaScript syntax checks passed. Weather tests cover deterministic motion, quality limits, finite view-local positions, map selection and roof shelter. Packaged static checks remain blocked in this handoff because `dist/icon-192.png` is missing; remote image assets were not changed.

## Release 32: surface-aware footstep sound

Frostline and Iron Quarry now use distinct synthesized snow-crunch and stone-grit step profiles for player and NPC movement. Indoor routes on both maps keep the harder enclosed-room sound; the other map profiles are unchanged. A focused routing regression checks alpine snow, quarry grit, indoor hard surfaces and forest soft ground.

The routing regression also exposed Canopy's existing `FOREST BASE` tag mismatch, which sent its outdoor footsteps to the gravel profile. Forest routes now select the soft-ground sample. Release 32 verification: 166/166 automated tests and JavaScript syntax checks passed after advancing the offline shell. The packaged static checker still requires the missing local icon image to run.

## Release 33: coordinated NPC firing lanes

Team bots now check the space between their muzzle and a visible enemy for allied operators. If a teammate blocks that lane, the bot takes a short side route and holds fire until the lane opens, conserving ammunition and avoiding repeated fire into a teammate. Free For All has no allied firing restriction. A focused regression covers the blocked lane, flank goal and resumed fire after the ally moves; full match simulations across all maps and modes follow before publication.

Release 33 verification: 167/167 automated tests passed, including all-map objective bot matches; JavaScript syntax checks passed. The local packaged-asset checker remains blocked by its missing icon image.

## Release 34: continuous distant terrain

The distant skyline now uses one textured, irregular 384-triangle terrain ring in nine maps, with trees placed at its foot. Breakwater retains its harbour. Both renderers share the geometry; the ring stays outside gameplay collision and is excluded from shadow casting. This creates a continuous landscape without adding a render pass, texture or runtime terrain update.

Seeded High-quality scene profiles across all ten maps show 1,544 → 1,302 world batches, 189,156 → 175,874 frustum-visible world triangles and 203,704 → 151,120 shadow-caster triangles. These are container scene counts, not iPhone GPU/frame measurements. Raw profiles are in `docs/profile-release33.json` and `docs/profile-release34.json`. Release 34 verification: 169/169 automated tests and JavaScript syntax checks passed, including geometry seams, winding, complete map construction and Canvas fallback geometry. The packaged checker remains blocked by the missing local icon image.

## Release 35: height-toned landscape

Nine distant ridges now use vertex colours for dark foothills, light peaks and Frostline's snow cap. Dustline sandstone and Iron Quarry stone receive separate palettes. The Canvas fallback shares the same height ramp. Geometry, batch and shadow counts are unchanged; each ridgeline adds a static 13.5 KiB colour buffer and a separate material variant. Release 35 verification: 170/170 automated tests and JavaScript syntax checks passed. iPhone GPU time and appearance still require a device check.

## Release 36: Frostline conifers

Frostline's near and perimeter trees now use opaque, tiered conifer crowns and slender bark trunks. Both renderers share one original 45-triangle crown mesh, and the trees use the existing surface atlas. The seeded ten-map profile changes from 1,302 to 1,310 world batches, 175,874 to 176,030 visible world triangles and 151,120 to 151,435 shadow-caster triangles. The small increase is isolated to Frostline; transparent tree canopy cards were removed there. The scene profile does not estimate the saved alpha overdraw or measure iPhone GPU time.

Release 36 verification: 171/171 automated tests and JavaScript syntax checks passed, including bough winding, complete Frostline scene construction and Canvas conifer geometry. The packaged check still requires the icon missing from this local handoff.

## Release 37: snow on conifer boughs

Frostline crowns now use a gradual evergreen-to-snow vertex tint on their upper boughs. Canvas fallback shades from the same source palette. The static colour attribute adds about 1.6 KiB for the shared mesh, without another texture, polygon or batch. The scene counts remain as profiled for release 36. A physical iPhone visual and frame check remains outstanding.

Release 37 verification: 172/172 automated tests and JavaScript syntax checks passed. A specific renderer regression checks finite vertex colours, a distinct conifer material and equivalent Canvas shading.

## Release 38: stratified outcrops and NPC near-miss response

Dustline and Iron Quarry gain 24 layered, atlas-textured outcrops per map beyond the playable boundary. The single shared 130-triangle stone mesh has a static colour ramp; the Canvas fallback uses 12 formations at 65 triangles apiece. The new scenery is visual only, does not affect bot navigation and casts no shadow. A seeded ten-map profile changes world batches from 1,310 to 1,334 and frustum-visible triangles from 176,030 to 179,930; shadow triangles remain 151,435.

Enemy bots now react to a bullet passing close by, moving toward cover for a short period even if it misses in elimination modes. Objective modes retain their objective priority. A wall ending the shot before the bot prevents the effect, and the player is not suppressed by this NPC tactic. The additional check is bounded to the first pellet and at most seven other actors per shot.

Release 38 verification: 175/175 automated tests pass, including full bot matches on every map and objective mode. The packaged checker validates 44 JavaScript modules, geometry winding, the actual local texture assets and Home Screen manifest. JavaScript syntax checks pass. Native iPhone GPU frame time and final appearance remain unmeasured.

## Release 39: arid grass and moving shore wash

Dustline and Iron Quarry now have up to 55 more dry-grass clumps each beside the outer routes. The existing foliage atlas, batching and adaptive quality control handle the added cards. A separate seed ensures existing scenery stays put. Breakwater's water gains a third wave direction and intermittent shore wash in the existing opaque water material, without a geometry strip or extra pass. The seeded ten-map profile shows unchanged 1,334 world batches and 660 more visible/shadow triangles from the added grass. GPU time and alpha overdraw remain unmeasured.

Release 39 verification: 176/176 automated tests, JavaScript syntax checks and the complete packaged-asset checker pass. The water shader composition and bounded perimeter grass placement have focused regressions.

## Release 40: photographic cloud shading in the existing sky probe

The HDR background and PMREM reflection probe now retain the packaged sky image's cloud brightness variation at a 512 × 192 sampling resolution. Mirrored horizontal sampling keeps the seam continuous and the photographic mountain horizon is cropped away, leaving the authored map terrain in control. The same 512 × 256 GPU sky texture and existing PMREM are used; extra sampling happens once at map load. A synthetic container loop measured about 18 ms before and 30 ms after for this conversion, not iPhone timing. A focused regression checks cloud luminance and wrapping.

Release 40 verification: 177/177 automated tests, JavaScript syntax checks and the packaged checker for 44 modules and all local assets passed.

## Release 41: scoped optical glass and glove finish

First-person magnified optics gain coated objective and ocular lenses, fine objective rings and alignment marks. Scoped ADS continues to use the clear world view, while reflex and prism optics retain their unobstructed sight ray. The operator's gloves gain knuckle guards and cuff trim, using existing instanced weapon geometry and material families. The default weapon's scene counts and all ten maps are recorded in `docs/profile-release41.json`; no iPhone GPU timing or native screenshot has been obtained.

Release 41 verification: 178/178 automated tests, including optic selection and aiming regressions, JavaScript syntax and complete packaged-asset checks pass.
# Release 42: traversal, touch tracking and ray budgets

- Added jump-to-vault over reachable 0.4–1.25 m cover. The capsule lifts before
  crossing the obstacle, validates every intermediate position and rejects
  tall walls, blocked landings and low ceilings. Respawns clear traversal state.
- Jump can release a slide or crouch where standing clearance exists. Existing
  sprint, slide cooldown, coyote time and jump buffering remain in use.
- Touch look integrates coalesced hardware samples without applying the final
  event twice. Other contacts retain their own movement/fire ownership.
- Sprint FOV eases by up to 5 degrees, fades out under ADS and is disabled by
  reduced motion. Strafing shifts viewmodel weight; vaulting lowers the weapon.
- Added bounded height haze and forward sun scattering to the existing fog
  stage, with no extra draw, render target or texture read.
- Static grid rays preserve the exact AABB collision test, overlap ordering,
  ground hits, destroyed obstacles and the fallback for changed collision arrays.
- Validation: 26 test files pass, static/offline validation passes, 13 shader
  variants compile/link. 7,500 random/axis-aligned rays match a full scan exactly.
  The 25,000-ray container profile reduces candidate checks by 93.5–96.0%.
- Browser limitation: cloud browser blocks localhost and browser runtime
  downloads did not produce usable archives. No new rendered-frame or physical
  iPhone FPS claim. Profiling data is in `docs/profile-release42-rays.json`.


## Release 45: operator weapons, high mantles and wall handling

Recovered and completed the previous unfinished pass. Bots carry their equipped firearm with two-grip arm poses, magazine motion, role equipment and bounded distance detail. Jump mantles clear ledges up to 2.2 m with standing headroom and capsule validation. Both renderers lower the hip-fire weapon near walls while preserving fully aimed sight alignment. Local hit reactions return to the base pose without moving collision or aim.

Validation: 211/211 tests, packaged/offline checks for 50 JavaScript modules, and 13/13 Mesa GLSL ES compile/link variants pass. Actor CPU fixture medians across 13 maps are 0.17–0.32 ms. Physical iPhone frame timing remains unmeasured.


## Release 46: expanded arsenal and material-aware cover

Six original firearms bring the arsenal and progression ladder to 30 weapons. Ballistic rays resolve exact material thickness and incidence, hollow prop skins, ordered silhouettes and bounded multi-surface penetration. Embedded obstacles cannot be skipped inside penetrable cover. Shotgun pellets stop at cover, and depleted magazines require an extra action cycle. New regression cases cover oblique rays, solid versus hollow cover, embedded concrete, ordered allied silhouettes, headshots through glass and energy exhaustion.

Release 46 verification: 217/217 regressions, 51-module packaged/offline checks and all 13 GLSL ES compile/link variants pass. No physical iPhone frame timing is claimed.


## Release 47: expanded battlefields and Frontline

Crossfire District covers 120 × 120 m with four accessible interiors, actual window apertures, a walkable 3.6 m concourse, traffic cover and outer streets. Blacksite covers 116 × 116 m with a generator hall, four bunkers, raised service routes, cargo approaches and watch towers. Large facades use storey bands with a bounded component count. The navigation bake samples collision buckets for each floor cell.

Frontline starts at the middle sector. Uncontested occupation moves the line toward the opposing rear; defenders can reverse a push. Spawn pockets stay on the team's rear side, bots retarget each sector and both renderers and HUD expose the current objective. Capture checks respect walls and floor heights.

Large-map regression fixes: weighted A* reaches all spawn pockets within the 5,000-node budget (maximum 271/333 expansions in the recorded corner-route sweep). Respawn visibility covers the full 140 m firing range. Larger spatial batches bring the expanded maps to 174/157 world batches. Melee-equipped bots close distance at a sprint, and authored forward flag bases keep CTF from stalling at distant map corners. Bot Gun Game and CTF matches now finish with full-ladder or capture wins on both expanded maps.

Release 47 verification: 223/223 regressions, 52-module packaged/offline checks and all 13 GLSL ES compile/link variants pass. Physical iPhone frame timing remains unmeasured.


## Release 48: touch friction, jump momentum and operator locomotion

Saved touch aim slowdown uses optic-aware angular silhouettes, enemy relationships and cached visibility checks at 12.5 Hz. It respects walls, smoke and flashes, scales only touch or pen deltas, and never changes angles, recoil or trigger state. Mouse, controller and gyroscope sensitivity keep their existing behaviour. Disabling it, melee, death and a new match clear the friction state.

Player flight retains launch momentum on stick release and approaches air steering gradually. Ground response stays immediate. Footsteps accumulate actual horizontal ground travel instead of requested speed, removing wall-pressure foley; landing severity drives heavier surface sound and local feedback.

Closed elliptical torso and limb profiles replace rectangular operator sections. Shared smooth-normal geometry keeps limbs at 48 triangles apiece. Three-dimensional joint IK follows local sideways or reverse movement, with flight tuck and connected knees. Both renderers share the same anatomy and cached component objects.

Release 48 verification: 233/233 regressions, 54-module packaged/offline checks and all 13 GLSL ES compile/link variants pass. Four exact-mesh operator poses were visually inspected in a CPU geometry preview. Container actor update medians are 0.190–0.235 ms across 15 maps, with no concurrent test load. This preview is not an in-game rendered frame, and physical iPhone frame timing remains unmeasured.

## Release 49: Blender-authored graphics

The primary Three.js renderer now consumes an original Blender mesh library for
all 30 weapon cores, shared architecture and props, operator components,
vegetation and all 15 maps' terrain/harbour presentation. Native bevels and
weighted normals replace hard-edge primitive outlines. Framed crates, ribbed
cargo, shaped helmets/boots/equipment and eroded biome terrain add surface and
silhouette detail. Vertex AO and four native Cycles normal/ORM atlas bakes
replace normals inferred from albedo in the primary renderer. The sky's HDR
texture uses linear filtering to remove magnified pixel blocks.

Weapon components merge by their existing animation tag, with per-vertex base
colour, roughness and metalness. Original attachment parts, sights, muzzle
alignment, reload joints and hand poses remain authoritative. Indexed near/far
geometry, shared materials, existing instancing and quarter-second world LOD
selection keep detail bounded. No extra post-processing pass is added.

The compressed library and four new textures total 6.84 MiB. The default rifle
falls from 12 to 10 draw batches and from 15,720 to 12,372 triangles; all 30
default weapons reduce both in the asset fixture. Seeded map scenes use 72–169
world batches before frustum culling. These are CPU/scene counts rather than
iPhone performance measurements. The editable `.blend`, packed images, source
builder and rig extraction/export scripts are committed with rebuild instructions.

Gameplay and map topology retain Release 48 behaviour. The Canvas compatibility
path remains available with original geometry. Complete offline installation
includes the Blender assets and native/fallback lossless gzip decoding.

Release 49 verification: 238/238 regressions, 58-module packaged/offline checks,
all-map real-asset collision/rig checks and 23/23 Mesa GLSL ES compile/link
variants pass. Chromium software WebGL2 provides real rendered-frame checks.
Six representative maps deploy without browser errors, and the complete 99-file
offline cache successfully deploys with the network disabled. Exact source
comparisons confirm 30 gameplay/input/map/audio/save modules are unchanged
apart from release identifiers. Browser and source evidence are saved in
`docs/validation-release49-browser.json` and `docs/validation-release49-gameplay.json`.
Physical iPhone FPS, thermal endurance and commercial AAA visual fidelity remain
unverified. Raw counts are in `docs/profile-release49-blender.json`.

Final source validation reopens the saved Blender project and confirms all eight
original and baked images are packed and retained. The builder gives these
images persistent users, so subsequent saves keep them available for editing.
Lossless segments restore the complete source project and runtime assets;
unused segments are removed when rebuilding a smaller export. The packaged
runtime bytes remain identical after the source fix. Fresh checks pass all 238
regressions, 58 JavaScript modules, 23 shader variants and the 99-file offline
installation. Source evidence is in `docs/validation-release49-source.json`.


## Release 50: complete Blender art library and native level source

Blender now supplies the primary scene meshes and nine runtime atlases. The
223-mesh library includes shaped/ventilated weapon sections, merged smooth hand
rigs, operator equipment, native facades and machinery, detailed tree crowns,
terrain and props. The editable source includes all 15 metre-scale map assemblies.
Colour, normal and physical atlases plus foliage, sky and effects come from
Cycles bakes, then lossless verified texture compression.

Identical hands share geometry across weapons. The default rifle reduces from
12 to 8 batches and from 15,720 to 10,940 triangles. Runtime art totals about
11.04 MiB. Facade dressing removes redundant components; the original collision,
controls, combat, modes, sound and saves remain intact. These are scene counts,
not physical iPhone timings. Browser evidence is in
`docs/validation-release50-browser.json` and counts in
`docs/profile-release50-blender.json`.

Validation: 240/240 automated checks pass, 28/28 material shader variants compile on Mesa GLES, and Chromium software WebGL2 rendered all 15 maps and 30 weapon rigs with no browser errors. The Release 50 service worker cached 116 entries and successfully loaded and deployed a match offline. Native source inspection confirmed 15 map collections, 10,108 objects and all nine packed bake images.

## Release 51: complete art integration and per-tree detail

Every tree retains a Blender mesh at all distances. Per-instance near/far
selection uses hysteresis and updates only changed batches. Unchanged trees
produce no instance-buffer upload, and both levels retain conservative bounds.
The source library's exact texture axes use unnormalised bytes instead of
floats, reducing those CPU and GPU streams by 75% without quantisation error.

Mixed facade glazing bypasses masonry albedo and bump response while retaining
the single shared draw. Primary geometry fails visibly if an authored mesh is
missing, and particles, decals and contact stamps use the native Blender quad.

Verification: 242/242 regressions and 59-module packaged/offline checks pass.
Software WebGL2 renders all 15 maps, all 30 weapons with attachments and reloads,
and scoped aiming without errors. Release 51 caches 116 files and deploys a
match with the browser offline. These checks do not measure physical iPhone FPS.


## Release 52: physical machining and compact native vertex data

Native Blender modelling now uses longitudinal receiver sections, metre-scale
edge bevels, weighted machined normals, and fuller conifer/broadleaf leaves.
Existing animation anchors and all collision/weapon contracts are preserved.
The representative rifle uses 8 batches and 12,468 triangles versus the original
12 batches and 15,720 triangles.

The native export's colour and physical scalar streams use core glTF normalised
16-bit attributes, saving 4,194,296 bytes. The maximum scalar error is below
0.00000763. Positions, normals, texture coordinates and indices remain byte-exact
during packing. Weighted-normal seam sharing plus compact streams reduce the
unpacked library from Release 50's 30.10 MiB to 17.02 MiB. The complete runtime
art download is 10.92 MiB. These are data and scene counts, not device timings.

Geometry iteration can restore the exact previous packed bakes and editable
shader graphs, then atomically save the new native project. Full material
builds retain the original native Cycles baking workflow.

Verification: all 243 regressions, 60-module packaged checks and all 28 Mesa
GLES shader variants pass. Software WebGL2 renders all 15 maps and all 30 weapon
rigs with attachments, reloads and scoped aiming without errors. The 116-entry
Release 52 service-worker installation deploys a match offline. Physical iPhone
GPU timing and thermal endurance remain unmeasured.


The standalone native source is verified with all 15 levels, nine packed bakes,
no linked data and no embedded scripts. Its segmented source reconstructs the
editable Blender project byte-for-byte.


## Release 55: recent match record

Career retains the last 12 completed matches, newest first, with map, mode,
difficulty, completion date, duration, K/D, accuracy, headshots, best streak and
XP. Recent victories and aggregate K/D show form. Storage stays device-local,
bounded, and compatible with existing saves. Invalid historical metadata is
discarded or clamped without resetting progression. History remains readable
in memory if persistent storage is unavailable.

Verification: 261/261 regressions, including six new history checks, and the
62-module packaged/offline validation pass. Chromium software WebGL2 checked
four mobile/desktop sizes without horizontal overflow or page errors and
confirmed that repeated result presentation records a single match. Browser
evidence is in `docs/validation-release55-browser.json`. No physical iPhone
performance or hardware validation is claimed.

The GitHub checkpoint is ready. Sites publication was not performed because
the hosting skill's required bundled `site-workflow.mjs` helper is unavailable
in this environment. The existing hosted version is unchanged.
