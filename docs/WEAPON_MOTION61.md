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

## Actual rendering review: pending at first checkpoint

`scripts/check-weapon-motion-browser.mjs` captures actual native first-person
inspection frames for a rifle, pistol, blade and LMG, followed by firing impulse,
peak/recovery and fully-ADS firing/turning frames at 844 × 390. It records native
asset use, alignment, interruption behaviour, browser errors and request failures
in `docs/validation-weapon-motion61-browser.json`; screenshots go to
`test-results/motion61`.

The first attempted capture was blocked while the concurrent environment asset
rebuild referenced a new Blacksite mesh before its packed native library was
ready (`world/blacksite_hall_roof`). Temporal visual acceptance remains pending
until the coherent library is available and the sequence is rendered and viewed.
Automated transform tests do not establish animation quality, premium weapon
presentation or physical iPhone performance. The wider coarse weapon geometry,
hand anatomy and complete hand/component choreography remain open overhaul work.
