# BREACHLINE

**Latest source checkpoint: Release 71.** 30 weapons, 16 maps and 11 modes.

## Release 71: first-person magazine exchange

Magazine-fed weapons now remove one component and retrieve a distinct
replacement during first-person reloads. Tactical reloads stow the old magazine;
empty reloads let it depart. Hands follow the exchange, with top-loader and
belt-box timing retained. Native and fallback rendering share the same phase
sampler and restore neutral visibility on cancellation, completion and menu use.

Existing native meshes and all media are reused. This adds about 6.3 KiB of
uncompressed JavaScript. See [implementation, costs and limits](docs/ART_RELEASE71.md)
and [the updated checklist](docs/OVERHAUL_CHECKLIST.md). Gameplay-image,
professional animation and physical iPhone acceptance remain open.

## Release 70: complete pistol magazines

Sable P, Dire 50, Swift 93 and Paladin 45 now reload complete magazines with
native hollow bodies, witness ports, feed lips and followers. Visible fast,
extended and drum options follow the same rigid reload motion; support hands
target the magazine body. Existing attachment contacts now use their original
sound families on these four pistols. Statistics, timing and ammunition remain.

All material and lighting payloads are retained. The compressed native library
adds about 143 KiB. See [construction, costs and acceptance limits](docs/ART_RELEASE70.md)
and [the updated checklist](docs/OVERHAUL_CHECKLIST.md). Gameplay-image, premium
listening and physical iPhone acceptance remain open.

## Release 69: shared generator construction

Open-skid diesel generators replace the coarse shared housing on Foundry,
Relay, Citadel, Monsoon and Blacksite. Separate engine, alternator, cooling and
service forms retain economical near/far meshes and existing collision owners.
Those five maps have fresh Cycles ground lighting; shared materials are retained.
The mesh library and lighting download together decrease by about 4.7 KiB.

See [construction, costs and acceptance limits](docs/ART_RELEASE69.md) and
[the updated overhaul checklist](docs/OVERHAUL_CHECKLIST.md). Matched gameplay
image review and physical iPhone acceptance remain open.

## Release 68: Blacksite hall construction and interior

Complete native hall walls replace repeated concrete panels while preserving
the four loading doors and eight open firing windows. Blue-green/cream interior
finishes, structural columns and a pale soffit with deep beams give the hall a
clearer construction hierarchy. The new geometry and Blacksite lighting add
about 245 KiB of runtime download; the other fifteen maps and existing native
meshes/materials are preserved.

See [gameplay comparisons, costs and remaining limits](docs/ART_RELEASE68.md)
and [the updated overhaul checklist](docs/OVERHAUL_CHECKLIST.md). Professional
overall realism and physical iPhone acceptance remain unfinished.

## Release 67: attachment contacts, firing presentation and world bounds

Fast, extended and drum magazines have original extraction, manipulation and
seating sounds at their actual reload contacts. Expanding/fading first-person
flashes and family-sized gas puffs retain the existing sprite, light and effect
pool. Active world sounds follow listener distance and changing cover. Centred
world batches reduce the established scene maximum from 223 to 212; shared
near/far bounds keep simplified native rock silhouettes inside their batches.

See [the integrated evidence and remaining limits](docs/ART_RELEASE67.md) and
[the updated overhaul checklist](docs/OVERHAUL_CHECKLIST.md). The wider
professional art/sound standard and physical iPhone acceptance remain open.

## Release 63: native hero forms and component-aware reloads

Weapon receivers and stocks have revised family-specific shapes, recessed panels
and geometry-based finish differences. Gloves have rounded palms, thumbs,
knuckles and cuffs. Reload hands now follow actual magazines, shells, feed covers
and charging actions while preserving gameplay timing and ammunition.

See [matched gameplay frames, validation, costs and remaining limits](docs/ART_RELEASE63.md).
Crossfire District and Blacksite retain 20 vs 20. The wider professional art
standard, anatomical grasp and physical iPhone performance remain unfinished.

## Release 62: 20 vs 20 on the big maps

Crossfire District and Blacksite now field 20 combatants per team in all team
modes, including the player: 40 total. Existing spawn safety and dynamic actor
batches support the larger roster.

See [roster validation and CTF evidence](docs/ROSTERS62.md).

## Release 61: Blacksite construction, handling and character motion

Blacksite now has an editable gabled industrial hall, metal upper-wall sheets,
recessed ventilation and connected poured loading surfaces with slab joints and
tyre wear. Its original collision, open windows, routes and objectives remain.
Weapons have cancelable two-sided inspection, weighted firing recovery and turn
inertia while retaining exact fully aimed alignment and gameplay recoil. Hold
SWAP to inspect (tap switches), press F, or use controller D-pad down; Gun Game
uses the same touch control for inspection. Combat actions cancel immediately.

Operators use revised walk/run support cycles, blended crouch/aim transitions,
landing compression and articulated hit/death poses with coherent gun/hand joins.
The original sound bank adds dedicated penetration exits, cosmetic ricochet cues
and surface-specific casing landings: 408 original takes with bounded playback.

See [actual gameplay images, sound previews and validation](docs/ART_RELEASE61.md)
and the updated [overhaul checklist](docs/OVERHAUL_CHECKLIST.md). This is a usable
continuation checkpoint. Repeated materials, coarse weapons/characters, natural
skeletal animation and the wider professional art target remain unfinished;
physical iPhone performance and premium listening quality remain unverified.

## Release 60: environment and hero production overhaul

Blacksite establishes the revised architectural kit: solid precast walls,
correctly sized open door/window reveals, industrial service structures,
connected forecourts, manufactured equipment and textured vehicles. Shared
native assets and biome materials extend across every map. All 30 weapon cores
have revised mechanical construction; organic gloves, tapered anatomical limbs,
cloth and tactical equipment retain the existing animation and gameplay anchors.
Sixty compressed PBR maps, sixteen fresh Cycles light bakes, room-dependent
reflections, contact shadows and atmospheric/effect refinements run in WebGL2.

The original audio library now contains 364 AAC takes, with individual weapon
voicings, mechanical details, surface foley, impact variations and bounded
positional room/distance processing. Both graphics and audio remain offline.

See [production changes, gameplay renders and validation](docs/ART_RELEASE60.md).
The [overhaul checklist](docs/OVERHAUL_CHECKLIST.md) records the full requirement
audit and remaining work for future sessions.
The Release 57 baseline remains recoverable. Software rendering and scene budgets
verify implementation; physical iPhone frame pacing, thermals and sound must be
measured with the preserved Benchmark Mode. This release does not establish
commercial AAA parity, photoreal humans or motion-captured skeletal animation.

## Release 59: material finish, face-aware lighting and prop LOD

Exterior wall faces now sample outdoor sky and bounce lighting while their
interior faces retain room shade. Imported physical textures preserve their
baked roughness; textured props no longer receive the old heavy diffuse tint.
Native prop LOD follows each instance's projected size, retains close geometry
and removes destroyed cover from both detail levels. Across 49 conservative
scene samples on all 16 maps, active world meshes stay at or below 200; the
Blacksite approach removes about 30% of full-detail world triangles.

Gunfire, footsteps, landings and weapon actions use distinct short-room and
warehouse responses selected from actual roof geometry. All original 286 clips
and bounded player-priority playback remain available offline.

See [Release 59 validation and limits](docs/ART_RELEASE59.md). This is a tested
continuation checkpoint. Fresh browser screenshots, physical iPhone frame rate
and commercial reference-game fidelity are not established by these checks.

## Release 58: production art and original sound library

Blacksite opens as the showcase. The same revised Blender kit and physical
materials ship across all 16 maps and 30 weapons: manufactured receivers and
handguards, folded sleeves and gloves, shaped operator gear, recessed facades,
precast walls, containers, vehicles and industrial machinery. Sixty individual
PBR maps replace the small shared runtime atlases. Safari can upload native ASTC
mip chains; other browsers receive WebP. Sixteen Cycles ground-lighting bakes,
weather-matched reflections, contact shadows and restrained haze share the
existing WebGL2 renderer without another full-screen rendering pass.

The new audio bank contains 286 original AAC recordings rendered from editable
sound designs. Guns have variations, mechanical actions and acoustic tails;
movement and impacts follow their surfaces. Distance filtering, wall occlusion,
a shared room response and bounded playback preserve responsive player sounds.
Every runtime asset is included in the offline installation.

The editable Blender source and material inputs are committed in recoverable
segments. See [art, sound and rebuild details](docs/ART_RELEASE58.md) and
[asset provenance](docs/ART_PROVENANCE.md). The larger art download is intentional;
physical iPhone frame rate, memory pressure and sustained thermals remain
unmeasured for this release. The retained operator rig uses articulated rigid
parts; this checkpoint does not establish commercial AAA fidelity.

Release 57 remains recoverable on `release57-baseline` at
`454a5a26a8418fa8db1d3cc1ec197f7e56c56415`. Its real iPhone measurements guide
adaptive quality: Safari's unavailable GPU timer no longer allows automatic
promotion from Medium to High/Ultra on CPU timing alone. Resolution can recover,
quality can still decrease, and manual quality choices remain available.
Benchmark Mode, saved reports and JSON export remain local and work offline.

## Release 57: local benchmark recording and JSON export

Enable Benchmark Mode in Settings, play, turn it off, then export the saved JSON
and attach it in ChatGPT for analysis. Reports remain on the device. Saved sessions,
a recording watermark and the separate scripted stress test are available without
account setup. Graphics and gameplay are preserved. See
[measurement definitions and export instructions](docs/BENCHMARK.md).

Release 57 verification: all 273 automated tests and the 70-module packaged checks
pass. Desktop browser checks verified saved-report migration, JSON downloads,
reload recovery and offline export, with no report network requests or page errors.
These checks are not iPhone performance data.

Release 55 adds a device-local record of the last 12 completed matches to the
Career page. Each result retains its map, mode, difficulty, completion date,
duration, eliminations/deaths, accuracy, headshots, best streak and XP. A recent
victories and K/D summary helps track form across sessions. Older saves preserve
progression and begin recording new results; previous matches are not reconstructed.

Release 55 verification: 261/261 regressions and 62-module packaged/offline
checks pass. Chromium software WebGL2 checked the Career page at 667×375,
844×390, 390×844 and 1280×720 without horizontal overflow or browser errors.
Opening the results screen twice records one match. Evidence is in
[docs/validation-release55-browser.json](docs/validation-release55-browser.json).
Physical iPhone testing remains unperformed.

Release 54 adds a playable Nuketown recreation with two accessible two-storey
houses, rear yards and balconies, the school bus, an open moving truck and
cul-de-sac flanks. It uses the existing Blender kit; dimensions and artwork are
an approximation, not a verified exact port of Call of Duty's map. All modes
share the authored collision and navigation routes.

Navigation now reuses a typed-array heap and generation-stamped search buffers.
Bullet hit testing reuses exact hitboxes and rejects distant actors before the
narrowphase. The fixed-seed 16-actor CPU fixture preserves shots and route
requests while reducing route expansions. Measured medians changed from
196.4 to 174.5 ms on Crossfire District and 173.2 to 170.0 ms on Blacksite;
these are container simulation timings, not device FPS.

Release 54 verification: 255/255 regressions and 62-module packaged/offline
checks pass. Software WebGL2 rendered all 16 maps and 31 attachment options
without errors, and the actual menu deployed the new map. Measurements are in
[docs/validation-release54.json](docs/validation-release54.json) and
[docs/validation-release54-browser.json](docs/validation-release54-browser.json).

Release 53 removes the knife from Gun Game: all 29 firearms progress to a final
Krait R revolver elimination. The two expanded arenas now field 8 vs 8 in
every team mode. Five independent attachment slots offer 31 choices, with
visible build comparisons and actual effects on recoil, aim, movement, reloads,
capacity, range, damage, penetration and the distance bots hear shots.

Blender supplies the complete primary 3D library and nine visual texture atlases.
Release 52 added shaped and ventilated weapons, merged animated hands,
operator gear, native facades and machinery, full tree crowns, and Blender-baked
surfaces, foliage, sky and effects. The editable project contains all 15 level
base level assemblies; the additional Nuketown runtime assembly reuses that
library. Collision, controls, combat, modes, audio and saves are preserved.

The complete runtime art download is about 10.92 MiB. The default rifle uses
8 draw batches instead of 12 and 12,468 triangles instead of 15,720. These are
asset counts, not device frame-rate claims. Rebuild instructions and the editable
source are in [authoring/blender](authoring/blender/README.md); measurements are
in [docs/GRAPHICS.md](docs/GRAPHICS.md).

Release 51 selects near and far Blender tree meshes per instance, keeping every
tree and avoiding uploads when the selection is unchanged. Exact byte-valued
texture axes use 75% less storage. Smooth window glazing retains its own baked
colour and normals within the shared facade draw. The primary scene uses the
authored library throughout, including effect quads and impact stamps.

Release 51 verification: 242/242 regressions and packaged/offline checks pass.
All 15 maps and 30 weapons render in software WebGL2 without errors, and the
116-entry offline installation successfully deploys a match.

Release 52 adds native bevels sized in metres, longitudinal receiver profiles,
weighted machined-surface normals and fuller conifer/broadleaf silhouettes.
Normalised 16-bit colour and physical streams save 4.00 MiB of vertex storage;
positions, normals, texture coordinates and indices remain byte-exact during
packing. The unpacked library is 17.02 MiB, down from 30.10 MiB in Release 50.
All 243 regressions, 28 shader variants, every map/weapon and offline deployment
pass. Physical iPhone frame timing remains unmeasured.

Release 48 adds saved touch aim slowdown over visible enemy silhouettes, with
wall, smoke and flash checks. It scales thumb input without steering or firing.
Sprint jumps retain momentum when the stick is released; ground stops stay
responsive and air steering is gradual. Footsteps follow actual ground travel
and landings use heavier surface foley. Operators use tapered elliptical
torsos and limbs, with joint IK for sideways strides, reverse travel and flight.
The same shared geometry works in both renderers.

Release 48 verification: 233/233 regressions, 54-module packaged/offline checks
and all 13 GLSL ES compile/link variants pass. Physical iPhone FPS is unmeasured.

Release 47 adds Crossfire District (120 m across) and Blacksite (116 m across).
Rooms have open window apertures and four-way access, with a 3.6 m city overpass,
raised facility service routes, vehicle cover and separate street or cargo flanks.
Frontline moves the active fight between sectors. Teams capture to push forward,
defend to reverse the line, and win by breaking through the enemy rear. Respawns
stay behind the current sector; bots refresh routes after each push. Navigation
floor construction now uses collision buckets instead of scanning every block.

Release 46 adds Storm 68, Needle 57, Jackal 12, Sentinel 762, Heron S and
Paladin 45. Each has an original model, handling, audio, attachments, bot role
and Gun Game tier. Penetration now uses actual material, entry/exit thickness,
incidence and a bounded energy budget. Hollow crates and freight containers
have physical skins; solid concrete and embedded walls stop bullets. Multiple
thin surfaces reduce damage while preserving nearest-target and headshot rules.
Empty magazine reloads include the extra action cycle.

Release 46 verification: 217/217 automated regressions, 51-module packaged/offline
checks and 13/13 shader variants pass.

Release 45 replaces the generic bot rifle with the operator's actual equipped
weapon, including loadout changes during Gun Game. Arm poses follow both grips,
reloads move the magazine and support hand, and impacts produce local upper-body
reactions. Distant weapons retain five major components; nearby models use at
most 24 cached components. Operators have helmets, headsets and role equipment.
Jumping against cover now vaults low obstacles or mantles accessible ledges up
to 2.2 m. Both paths validate standing headroom, landing space and each moving
capsule. Near-wall weapon lowering uses three cached rays at 12.5 Hz, with fully
aimed sights preserved. Actor poses reuse their component objects.

Release 45 verification: 30 regression files, 50-module/offline checks and all 13
GLSL ES compile/link variants pass. Container scene profiles record actor update
medians of 0.17–0.32 ms across 13 maps. These are CPU fixtures, not device FPS.

Release 44 adds deadline-based frame pacing, saved 30/60 FPS caps and quality
budgets matched to the selected cap. Match preparation compiles both equipped
weapons and full actor materials behind the loading screen. Generated textures
upload in yielding batches. Deployment interruption, backgrounding and late
screen-lock grants are handled without enabling stale controls. Reloads show
remaining time and a progress track; Hill scoreboards rank hill points, and
Elimination shows survivors.

Release 44 verification: all 29 regression files and 48-module/offline checks
pass. Timestamp profiles are synthetic; physical iPhone FPS remains unmeasured.

Release 43 added eight new
firearms include Peregrine 6, Osprey S, Bison 12, Talon 338, Rampart 556, Spectre SD,
Krait R and Swift 93. Skybridge adds an accessible raised concourse, Monsoon adds
rain, wet materials and reflective puddles, and Emberworks adds refinery lanes
and a pipe-service catwalk. King of the Hill scores solo occupation of rotating
zones; Elimination uses one-life rounds to five wins. Bot arsenals vary by role.
Gun Game now covers the complete 24-weapon ladder, with a 12-minute time limit.

Release 42 added low-cover vaulting, slide-to-jump transitions,
coalesced touch tracking, sprint lens easing, directional weapon weight and
height-dependent atmospheric haze. World sight and bullet rays now use a static
grid broadphase with the same exact collision narrowphase.

Release 42 validation: 26 test files pass, packaged/offline checks pass and 13
GLSL ES shader variants compile and link in Mesa. A 25,000-ray container workload
reduced candidate obstacle checks by 93.5–96.0% versus a full scan. This is a CPU
workload result, not an iPhone frame-rate measurement. The available cloud browser
blocks the local preview, so this checkpoint has no new visual browser or physical
iPhone verification.

An original, playable HTML first-person shooter for landscape iPhone screens. Choose a mode, map and loadout, fight bots, finish the match, earn local XP and play again. All game assets are included or generated locally. There are no CDN, engine download, account or asset-service dependencies.

## Play

Serve the `dist/` directory over HTTP or HTTPS. For local development, use Node 20 or newer:

```sh
npm run dev
```

Open the address printed by the server. The authored HTML, CSS and ES modules are the production build, so no dependency installation or bundling step is required. Opening `index.html` directly through a `file:` URL is not supported because browsers restrict ES module loading.

On iPhone, open the hosted game in Safari and rotate to landscape. Safari's Share menu can add BREACHLINE to the Home Screen for a standalone experience. Versioned module URLs prevent stale installed copies mixing old controls with new graphics. The service worker caches the complete game and its textures after its first successful HTTPS load; offline availability depends on browser storage and host authentication. Saved progress stays in that browser on that device.

This is the **HTML / web-app implementation requested in the follow-up**, not a signed native iOS binary.

## Controls

| Action | Touch | Keyboard / mouse |
| --- | --- | --- |
| Move | Left joystick | WASD |
| Aim | Swipe right side | Mouse |
| Fire and track target | Hold and drag AIM + FIRE (auto ADS) | Left mouse |
| Aim down sights | AIM, tap or hold; drag to track | Right mouse |
| Reload | Reload | R |
| Inspect | Hold Swap (tap in Gun Game) | F |
| Sprint | Push stick fully forward (automatic) | Left Shift |
| Slide / crouch / jump | Tap JUMP; hold while moving fast to slide, or hold still to crouch | C while sprinting to slide / crouch · Space jump |
| Switch primary / sidearm | Swap | Q |
| Equipment | Grenade | G |
| Plant / defuse | Hold Interact near site | Hold E |
| Melee | Advanced controls profile | V |
| Pause / scoreboard | Pause | Escape / Tab |

The default two-thumb profile combines aiming and firing on one drag pad, automatically sprints and reloads empty magazines, and shows interaction only near an actionable objective. Hold-to-fire repeats semi-automatic shots at the weapon’s actual cadence. Separate sprint, crouch and melee buttons remain available in the Advanced profile. Existing saves migrate to the simpler controls while retaining progression and loadouts.

Movement, looking and firing use independent pointer tracking. Settings include button repositioning, size, opacity, left-handed layout, hip and ADS sensitivity, optional acceleration, horizontal field of view, camera motion and permission-based gyroscope aiming. Standard controllers are supported through the Gamepad API. Controller and gyro hardware still need device validation.

## Content

Eleven fully simulated player-versus-bot modes:

| Mode | Rules |
| --- | --- |
| Team Deathmatch | 4 vs 4, 40 eliminations, respawns, 6-minute limit; 20 vs 20 on the two huge maps |
| Free For All | Eight combatants, first to 20, respawns, 6-minute limit |
| Sabotage | Plant at A or C, defend or defuse, one life per round, first to four rounds, teams switch sides every three rounds |
| Domination | Capture and contest A, B and C, hold sites to reach 150 points |
| Gun Game | One elimination advances the weapon, 29 firearms ending with the Krait R revolver; 15 minutes, or 22.5 on the huge maps |
| Hardpoint | Rotate zones every 45 seconds; uncontested occupation scores towards 150 |
| Kill Confirmed | Collect enemy tags for points, recover allied tags to deny; first to 30 |
| Capture the Flag | Steal the enemy flag, carry it home while your flag is safe, return dropped allied flags; first to three captures |
| King of the Hill | Free for all, exclusive occupation scores personal points, rotating zones; first to 75 |
| Elimination | One life per round, first to five rounds; timeouts use survivors then remaining health, equal results draw |
| Frontline | Capture successive sectors to push towards the enemy rear; defenders can reverse the line, with respawns behind the current sector |

All team modes use 20 vs 20 on Crossfire District and Blacksite, and 4 vs 4
elsewhere. Free-for-all modes retain eight combatants.

Sixteen battlegrounds: **Old Quarter**, **Foundry**, **Dustline**, **Relay**, **Breakwater**, **Citadel**, **Switchyard**, **Canopy**, **Frostline**, **Iron Quarry**, **Skybridge**, **Monsoon**, **Emberworks**, **Crossfire District**, **Blacksite** and **Nuketown**. Breakwater adds a harbour and drydock routes; Citadel adds a covered courtyard, comms tunnel and radar overlook; Switchyard adds freight crossings; Canopy connects forest cabins around a sheltered court; Frostline adds alpine patrol routes and a snowbound beacon; Iron Quarry adds stoneworks, conveyors and a low central crusher apron. Wind-driven snow and drifting grit give these maps their own weather; both rendering paths share the same quality-bounded effects, which clear under roofs. Synthesized snow-crunch and stone-grit footsteps follow each map's surface, while indoor footsteps stay hard-surfaced. Each map has authored routes, cover, objective sites, safe spawns, indoor and outdoor areas and navigable elevation changes.

The arsenal contains 29 firearms and a field blade: rifles, SMGs, shotguns, snipers, marksman rifles, LMGs and sidearms. Options include burst rifles, rapid-fire and integrally suppressed SMGs, a drum-fed LMG, a revolver and an automatic pistol. Weapons have individual damage, cadence, recoil, spread, handling, ammo and procedural sound profiles. Shotguns use pellets and per-shell loading where appropriate. Gunplay includes head and limb multipliers, range falloff, material-aware penetration, ADS, recoil that changes actual aim, dry firing, interrupted reloads, viewmodel animations, impacts and kill feedback.

Five primary-weapon attachment slots offer 31 choices: optics, barrels, handling,
magazines and ammunition. They change actual recoil, spread, magnification,
movement, reloads, capacity, range, damage, cover penetration and bot hearing.
The loadout shows build comparisons and trade-offs; crouched stationary bipods,
shotgun chokes, quickdraw grips, drum magazines and specialised ammunition have
distinct uses. Saved older attachment builds remain valid. Frag, smoke and flash
equipment are functional. Local career records XP, level, weapon XP, unlocked
guns, results and statistics. Attachments are available immediately to keep
loadout experimentation accessible.

Bots use sight and gunshot awareness, last-known positions, navigation, cover and flanking choices, bursts, reloads, range preferences, retreat, objective play and grenade use against visible enemies. They seek cover after a nearby miss and reposition when a teammate blocks their firing lane. Difficulty changes reaction, accuracy and aggression rather than health. Allies participate in objectives. Team modes disable friendly fire.

## Rendering and performance

The primary renderer is **Three.js r180**, with indexed Blender meshes, instanced world chunks, physically based standard/physical materials, Blender-baked normal and packed surface maps, image-based environment reflections, photographic cloud detail in its HDR sky, alpha-tested wind-animated foliage, throttled directional soft shadows, contact shadows, interior lighting, ACES tone mapping and a separate first-person weapon scene. Original animated joints drive merged Blender weapon cores; attachments and sights keep their existing transforms. Shared geometry and distance-based near/far meshes bound detail. Effects use bounded pools. A simpler textured Canvas2D compatibility renderer runs the same simulation with the original geometry if WebGL2 cannot initialise. Both paths use the same true 4× scope projection and remove the viewmodel from the scope's clear sight picture.

Rendering targets a saved 60 or 30 frames per second during combat, 30 in the menu and 10 while paused. Deadline pacing preserves the requested average across different display refresh rates. Automatic quality and dynamic render scaling reduce cost; shadows update at 15, 24 or 30 Hz according to quality. The fixed 60 Hz gameplay simulation is independent of display refresh. AI updates are throttled, navigation is baked per map, geometry is batched, and generated audio buffers are reused. Backgrounding pauses the match and audio. Low, Medium, High and Ultra quality options are available. See [graphics systems, budgets and profiling](docs/GRAPHICS.md).

These are performance budgets and engineering measures, **not measured iPhone frame-rate guarantees**. Release 49 was checked with headless gameplay/input regressions, actual Blender buffers and shader compilation. Chromium software WebGL2 provides rendered-frame checks; actual iPhone GPU and thermal behaviour, physical safe-area values, spatial audio perception, motion sensors and controllers require hardware testing. The compatibility renderer does not reproduce the WebGL lighting and effects.

Visuals use original Blender mesh assets with manufactured bevels, shaped operator equipment, hollow optics, ribbed cargo, framed crates, curved foliage and biome-tinted eroded terrain. Four original albedo/foliage/environment images are retained, with four new 1024 px Blender-baked normal and surface atlases. Asset prompts are included in `dist/assets/asset-prompts.json`; no reference-game assets are shipped. Audio is original synthesis. This is a complete asset-pipeline replacement, but it does not establish commercial AAA fidelity, photoreal production characters, motion-captured animation or verified iPhone frame rate. Vibration is optional where the browser implements it.

## Architecture

| Module | Responsibility |
| --- | --- |
| `engine.js` | Fixed-step simulation, actors, movement, damage, projectiles and match lifecycle |
| `weapons.js`, `attachments.js` | Arsenal, attachment profiles, reload and weapon state |
| `modes.js` | Scoring, rounds, captures, planting, defusing and completion |
| `maps.js`, `nuketown.js`, `navigation.js`, `spawns.js` | Authored worlds, collision, connected spawn pockets, threat scoring and A* routes |
| `ai.js` | Perception, tactics, movement and bot actions |
| `three-renderer.js` | Three.js scene, physical materials, lighting, batched geometry and pooled effects |
| `blender-assets.js`, `blender-material.js` | Packaged mesh loading, existing-rig bindings, near/far geometry and per-vertex PBR properties |
| `authoring/blender/`, `scripts/build-blender-assets.mjs` | Editable Blender source, native mesh construction, baking and lossless export |
| `weapon-models.js`, `geometry.js`, `meshes.js` | Distinct firearm mechanisms, animated hands, actors and geometry |
| `combat-identity.js` | Player-relative ally/enemy uniforms, labels and visibility rules |
| `boot.js`, `sw.js` | Complete-release installation before importing the game |
| `compatibility-renderer.js` | CPU projection fallback using the same map and actor data |
| `textures.js`, `world-detail.js` | Packaged surface/foliage images, environment and map dressing |
| `aim.js` | Shared scope magnification and aligned first-person sights |
| `input.js` | Touch, pointer lock, keyboard, controllers and gyro |
| `ui.js`, `main.js` | Menus, HUD, lifecycle and platform integration |
| `audio.js`, `save.js` | Generated spatial sound and defensive local persistence |

Input commands and simulation events are separated from presentation. This provides a starting boundary for future networking; transport, server authority and reconciliation are not implemented.

## Validation and developer tools

```sh
npm run verify
```

The only active test suite contains 74 core tests for gameplay, touch/controller input, saves, application lifecycle and offline updates. `npm run verify` runs those tests plus the packaging/offline check. Retired tests are stored as non-executable text and must not be run. Browser, shader and profiling scripts are not part of validation and must not be run unless explicitly requested. See [the verification policy](docs/TESTING.md).

Earlier browser checks exercised launch, loadout persistence, deployment, touch actions, pause, match completion, results, restart, menu return and the layout editor using compatibility graphics. Release 49 uses an additional real WebGL2 browser pass at 932 × 430. See [current graphics validation and limits](docs/GRAPHICS.md) for evidence and device-testing gaps.

Tap the BREACHLINE logo five times quickly, or press F3, to open developer tools. They provide god mode, unlimited ammo, unlock everything, spawn enemy, FPS / position / active actor overlay and restart. Normal progression does not prevent testing the full arsenal.

The preview server exposes `/__qa/viewport.html` for real-game responsive checks. The harness only changes the iframe viewport and enables touch controls; it does not inject game state and is excluded from the deployed `dist/` assets.

## Three.js expansion

All twelve firearms and the blade have rebuilt original geometry: distinct receivers, stocks, magazines, barrels, optics, controls, grips and hands. Cached animation moves slides, bolts, pump actions, magazines, belts, feed lids and support hands without replacing parts every frame. Firing sounds use unique attack, mechanical, body and tail profiles. Optics retain correct centred aim and magnified scopes clear the viewmodel.

Cyan diamonds and ALLY labels distinguish teammates from red triangles and ENEMY labels. Arm and vest identifiers use the same player-relative colours, including Free For All. Labels respect occlusion, smoke, death and flash blindness. Objective HUD, radar, kill feed and scoreboard use consistent relations. The simpler two-thumb input remains intact.

Official Three.js 0.180.0 modules are included under `dist/vendor/`, with the MIT licence and version/hash metadata. No CDN fetch is needed at runtime. The package lock pins the same version. See [Three.js installation](https://threejs.org/manual/en/installation.html). Authored modules and the offline cache advance together to release 10; boot waits for a complete update before starting the game.

Verification for that expansion: 100 regression tests, including native touch release recovery, corner-camper avoidance on every map, all-map spawn connectivity, real Three geometry/material/instance tests, all thirteen weapon models, mode completion and saving. The previous expansion also completed a 42-combination headless map/mode matrix. These are simulation and scene-construction checks, not browser GPU rendering tests. No new visual browser session or physical iPhone measurement was available during this expansion. Commercial AAA asset fidelity, GPU shader compilation and sustained iPhone frame rate remain unverified.

## iPhone reliability and visual refinement

The joystick has independent window-level pointer release and native touch-contact reconciliation. It recovers from failed capture, interrupted touches, reused pointer IDs and page backgrounding without pausing the match. Native TouchLists are accessed by index; release handling preserves the other thumb's held fire/aim and does not time out a stationary held stick. A small dead zone removes accidental thumb drift.

Respawns use 95–144 connected ground pockets per map. Threat scoring prefers shelter, avoids nearby enemies, recent deaths, repeated positions, occupied pockets and live grenades, and lets team spawn regions move when the fight shifts. Round starts preserve team separation. Maps gain freestanding sightline screens with multiple escape directions; Foundry and Relay gain side loading doors. Static clearance is baked once, and at most 24 shortlisted pockets receive visibility checks per respawn. Container measurements across maps were 0.96–2.10 ms median and 1.46–3.47 ms p95; these are not iPhone timings.

A new original ultra-realistic 2×2 material atlas provides anodised metal, sand ceramic coating, woven gloves and stippled polymer. The model material system derives normal and roughness detail and preserves colour/wear contrast. Weapon lighting follows world sunlight and dims reflections indoors. Reloads now distinguish tactical and empty magazines, top-loading mechanisms, empty pistol slides, pump shells and LMG feed covers. Smooth stride integration avoids viewmodel snapping when speed changes; fully aimed sights stay centred. Audio reserves voices for the player's weapon and hit confirmations.

Rendering reuses unchanged instance transforms, sends occupied buffer ranges and skips idle weapon uploads. Actor bevel triangles fall 75%, world bevel triangles 43.75%; distant actor detail and overlapping smoke layers are reduced. Shadow projection snaps to texels. These savings are measured geometry and buffer costs, not FPS claims. All gameplay, ten maps, eight modes, equipment, loadouts, local progression and two-thumb controls are retained.

Each deployment advances the complete offline release using `node scripts/release.mjs <number>` before static validation, committing and publishing. This prevents an installed copy combining assets from different checkpoints. Touch handling follows [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) and the native [TouchList interface](https://developer.mozilla.org/en-US/docs/Web/API/TouchList).


## Release 11: DualSense controller support

Standard-mapped Bluetooth DualSense controllers use left stick movement, right stick aiming, L2 ADS, R2 fire, Cross jump, Circle crouch, Square reload or objective interaction, Triangle weapon switch, L1 grenade, R1/R3 melee, L3 sprint and Options pause/resume. D-pad navigates menus and adjusts settings; Cross confirms. Touch controls remain available. Controller sensitivity, ADS sensitivity, radial dead zone and inverted vertical aim are saved independently. Disconnecting pauses the match; neutral rearming prevents stale movement or shots after interruption.

Pair the controller using iPhone Bluetooth settings, open the game and press a controller button. Release the controls after connection or resume to arm gameplay. Initial game launch and audio may require a screen tap. Uses the browser standard Gamepad mapping; adaptive triggers and controller gyro are not implemented.

Validation: 107 automated tests passed, including seven controller regressions; static validation passed. Physical Bluetooth DualSense testing on iPhone remains required.


## Release 13: Switchyard, Canopy and expanded arsenal

Eight maps now include SWITCHYARD (offset freight cars, depot crossovers, raised signal platform) and CANOPY (four-exit cabins, covered courtyard and observation deck). HARROW B3 is a three-round-burst rifle; MARTEN 45 is a slower, heavier SMG. Both have original first-person models, recoil, attachments, handling and synthesized sound. Stable weapon IDs preserve saved careers. Gun Game has 15 stages including the final blade. All 114 tests passed, including traversal, new maps and burst behaviour.


## Release 14: rendering and control polish

Added softly baked contact shading under props, ambient attenuation in roofed interiors, subtle world-space surface variation without extra texture reads, dithered materials, anisotropic detail maps and 512 px weapon finish tiles. Pixel budgets cap large display render targets. Bot stride and crouch animation blend continuously. Controller auto-sprint works, touch pads clear on controller activity and return on screen contact, and hidden diagnostics show draw calls, render size and coordinates.

Final validation: all 117 automated tests passed; static checks validated 28 JavaScript modules, local assets and the complete offline shell. Collision/floor queries in a deterministic 12,000-position container benchmark returned identical results and took 1.9–6.0 ms using buckets versus 49.1–81.0 ms with full scans across eight maps. These are CPU workload measurements, not iPhone FPS claims. Physical iPhone GPU, touch ergonomics, controller and thermal endurance checks remain necessary.


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


## Releases 19–23: renderer fidelity audit

Ten targeted fixes cover doorway lighting, curved UVs, physical roughness, interior weapon reflections, physical bevel widths, surface ageing, shadow stability, leaf transmission, connected leg animation and specular anti-aliasing. See the [ranked renderer audit and profile comparison](docs/RENDERER-AUDIT.md). The complete offline build and Settings version advance together to 23. Final checks pass 142 regressions and static validation; the browser preview URL was blocked, so GPU visual output and iPhone performance remain unverified.


## Releases 24–26: scene coherence

Sky and reflections now share map weather and sunlight. Exterior indirect shading survives at player height. Removed duplicate floors, misplaced roof units and weeds through paved/covered surfaces. Thin ground finishes receive shadows without casting them. Interior bulbs respect soft room bounds; camera stride remains continuous through speed changes. No additional full-screen pass or shadow-casting light. Verification: 149 regressions, static validation and 11 offline GLES shader compile/link variants passed. The offline compiler does not validate browser images or iPhone frame rate.
