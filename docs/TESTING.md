# Test audit and routine verification

The previous default ran 421 Node tests and then the packaging check on every
code push. Most tests exercise useful behavior; the problem was making every
asset, rendering and long-running bot check a universal prerequisite.

## New default

`npm run verify` runs 74 core tests and `npm run check`. That is **82% fewer
Node tests** in the routine gate. `npm test` runs only the core tests. CI uses
verify; documentation and benchmark-report-only changes do not trigger it.

The six core files are gameplay, input-save, controller, mobile-lifecycle,
identity-cache and final-polish. They cover shooting, cover, ammunition,
movement/collision, basic match rules, death/respawn, touch and controller input,
save failures, interrupted launch, pause/resume, and safe offline updates.
The packaging check stays: syntax errors, missing local imports/assets, broken
mesh winding or an incomplete offline shell can prevent the game launching.

This small gate does not prove every mode, map, shader, asset or presentation
path correct. Add tests for the subsystem actually changed. Do not interpret
74 passing tests as full-game validation.

## Removed duplication

- Removed the old Gun Game progression test from gameplay. It mostly called
  damage directly. `attachment-teams` already progresses through all 29 tiers
  using actual shots and checks the winner and final weapon.
- Removed expansion's save roundtrip for five primary IDs. `content-release43`
  roundtrips every primary ID; input-save checks corrupt/invalid loadouts.
  Kept the old test's melee-as-primary rejection assertion in content-release43.

Five full bot-match simulations now live in `tests/soak/bot-matches.test.mjs`:
all-map Gun Game; all-map Hardpoint/Confirmed/CTF; Hill/Elimination on expanded
maps; expanded-map Frontline; and Nuketown's five-mode matrix. Their assertions,
seeds and workloads are unchanged. They remain useful integration checks for
bots/navigation/spawns/modes, but add little to unrelated UI, audio or art edits.
Focused scoring, objective, navigation and bot-decision tests stay available.

## Selection guide

Run `node --test tests/<file>.test.mjs` for the relevant files below. Combine
related files in one invocation. The names omit `.test.mjs`. This inventory
accounts for every existing top-level test file; none are silently discarded.

| Change | Relevant additional files |
| --- | --- |
| Weapons, aiming, attachments | aim-graphics, aim-momentum, arsenal, attachment-teams, ballistics, expansion, weapon-handling, weapon-motion, weapon-reload |
| Modes, objectives, progression | new-modes, frontline, content-release43, match-history, attachment-teams |
| Maps, navigation, spawns, AI | ai-tactics, new-maps, traversal, spawns, nuketown-performance, mobile-traversal-performance; relevant mode files |
| Renderer, geometry, materials | three-renderer, render-budget, surface-fidelity, landscape, lighting-materials, room-motion, scene-coherence, presentation-stability, world-material-variation |
| LOD and visibility | actor-frustum, blender-lod-bounds, lod-stability, wall-lod |
| Operators and movement presentation | character-motion, compatibility-motion, operator-mantle, aim-momentum |
| Effects and destruction | environmental-fire, explosion-shock, explosion-source, firing-presentation, glass-damage, runtime-effects, smoke-presentation |
| Audio | production-audio, spatial-audio, world-acoustics, map-audio, ballistic-audio, component-foley, attachment-audio; weapon-handling for voice headroom |
| Native assets and packaging | blender-assets, production-textures, production-world, blacksite68; related renderer/LOD tests |
| Quality, timing, diagnostics | graphics-quality, mobile-frame-pacing, benchmark, benchmark-build, benchmark-comparison |

A shared engine/renderer change can affect several rows. Use `npm run test:all`
when selecting narrowly would miss likely interactions. Use `npm run test:soak`
for match-level AI/navigation/mode changes when focused tests are insufficient.
`npm run test:full` runs everything, including soaks. GitHub Actions also exposes
the full suite through **Run workflow** on Game and benchmark validation.
No automatic weekly run or extra push-time job is added.

## Browser, shader, asset and profiling work

The `scripts/check-*-browser.mjs` harnesses are feature-specific diagnostics,
not a second blanket gate. Run the relevant harness for changed browser behavior
and inspect affected images/audio where Node fixtures cannot establish quality.
Shader changes need the relevant native browser/shader compile check. Native
asset changes need their decoder/integrity/geometry tests. Blender rebuilds,
all-map/weapon scene audits and profiling are for changes to those resources or
performance paths, not routine pushes. Physical iPhone frame rate, thermals,
controller hardware and perceptual audio still require the relevant hardware.

Historical docs/validation artifacts record past releases. Do not regenerate
them, bump releases or rerun their entire validation lists for an unrelated edit.
Run each applicable check once on the final source state; repeat only after a
change or failure warrants it. Documentation-only edits need diff/link review.
