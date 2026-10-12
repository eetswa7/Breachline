# Weapon inspection and first-person motion, 12 October 2026

All thirty weapon rigs now support a cosmetic inspection action. The weapon is
raised and rolled to show one receiver side, then the other, then returns to its
ready pose. Pistols and the blade use a smaller arc; the LMG uses a longer cycle.
The existing hands retain their grip. This is procedural viewmodel choreography,
not a newly authored skeletal hand rig.

- Touch: tap SWAP to change weapons; hold SWAP for 0.42 seconds to inspect. In
  Gun Game the same control reads INSPECT and a tap or hold inspects. The touch
  layout, mirroring and control editing remain intact.
- Keyboard: F inspects. Controller: D-pad down inspects once per press, with the
  existing neutral-input rearming after resume/reconnection.
- Fire, ADS, reload, swapping, grenade, melee, interaction, sprint, slide or vault
  cancel inspection immediately. Inspection does not consume ammunition, create
  a gameplay cooldown or prevent an action. Its clock pauses with the simulation.

First-person turning now drives translational and rotational springs whose
response varies by weapon family. Successful shots supply a separate cosmetic
impulse, producing rearward travel, muzzle rise, a slight alternating roll and a
weighted return. Sustained fire is bounded. Blade attacks retain a deliberate wrist stroke
and forward movement rather than a firearm recoil impulse. The spring solution is analytic and
stable across 30, 60 and 120 Hz; state and output objects are reused.

Fully aimed sights retain exact centred x/y and rotation through movement,
turning and firing; only axial weapon travel remains. The world-camera aiming
ray, player recoil, spread, ballistic damage, fire cadence and ammunition rules
are unchanged. Reduced motion clears optional inertia/rotational firing movement
and uses a smaller explicit inspection arc.

## Automated evidence

The focused preservation run passed **79 tests**, including seven new tests in
`tests/weapon-motion.test.mjs` and four new touch/keyboard/controller input cases.
The run covers all 30 weapons and seven optic selections, pause/reset/action
interruption, bounded sustained firing, frame-rate agreement, reduced motion,
controller reconnection, touch tap-versus-hold, gameplay shooting-ray/recoil
identity, existing reloads, ballistics, all-map navigation and the full Gun Game
ladder. A follow-up focused run passed **52 tests**, including an eighth new
weapon-motion test verifying the blade stroke and recovery after reviewing the
firearm-versus-melee animation path. The SWAP touch control is tall enough for
its hold-to-inspect hint and still clamps inside the safe area. Command:

```sh
node --test tests/weapon-motion.test.mjs tests/weapon-handling.test.mjs \
  tests/input-save.test.mjs tests/controller.test.mjs tests/aim-graphics.test.mjs \
  tests/gameplay.test.mjs tests/expansion.test.mjs
```

`git diff --check` and JavaScript syntax validation passed for this work.

An integration review found that the application's fixed-step input merger did
not forward the new inspection edge. The original native renderer validation
called `Game.update` directly and therefore did **not** establish that normal
player input reached the simulation. Both Application edge lists now include
inspection: pending frames retain the request, and the first simulation tick
consumes it once. Jump and crouch requests also cancel active inspection.

Two Application-level regressions were demonstrated failing before the fix,
then passing with the real Game and Weapon state. They cover 30/60 FPS caps on
60/90/120 Hz refresh schedules, frames without simulation updates, multi-step
catch-up, normal animation completion, no request replay and pause cleanup.
The final focused lifecycle, motion, input, controller, frame-pacing and ADS run
passed **62 tests**:

```sh
node --test tests/mobile-lifecycle.test.mjs tests/weapon-motion.test.mjs \
  tests/input-save.test.mjs tests/controller.test.mjs \
  tests/mobile-frame-pacing.test.mjs tests/aim-graphics.test.mjs
```

## Actual rendering review

The native renderer browser run passed all rendering/simulation gates and captured **26 actual gameplay
frames** at 844 × 390: five inspection phases each for a rifle, pistol, blade and
LMG; firearm impulse, peak and recovery; and fully-ADS firing/turning samples for
three weapon families. The renderer loaded native weapon and hand groups for
every capture. There were **zero browser errors and zero failed requests**.
The [browser report](validation-weapon-motion61-browser.json) records the source
commit and dirty distribution status, exact transforms, native asset use and
capture identities.

Actual images were viewed for rifle, pistol, blade and LMG presentation, recoil
peak and ADS. The first review showed that the second inspection side was too
shallow. The final choreography uses symmetric opposite rolls and a higher lift,
so both receiver sides read clearly; it finishes in the original ready pose.
The rifle recoil moved from −0.481626 m at the first sampled impulse to
−0.469056 m at the weighted peak, then settled to −0.49 m. Fully-ADS samples kept
x = 0, y = −0.169 m and all rotations = 0 through firing and turning.

Repeat the native temporal gate with:

```sh
node scripts/check-weapon-motion-browser.mjs
```

The script uses Chromium/SwiftShader and saves screenshots to
`test-results/motion61`. The initial native capture was temporarily blocked by
the concurrent Blacksite library rebuild; the complete final run used the
coherent rebuilt library. The post-review correction passed another 13 focused
motion/preservation tests, and the strengthened all-weapon side-presentation
assertion passed all eight motion tests.

The procedural inspection feature and weighted first-person motion are now
implemented and visually reviewed within this scope. The coarse existing weapon
and blade geometry, angular glove anatomy, professional animation quality and
complete hand/component choreography remain open overhaul work. This desktop
software rendering evidence does not establish physical iPhone performance.
