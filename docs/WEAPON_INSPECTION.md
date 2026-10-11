# Weapon inspection and handling — 11 October 2026

All thirty playable weapon rigs now have a live first-person inspection action.
The weapon rises to show its receiver and side, rotates to show its top/action,
then returns to its original pose. Compact weapons and the blade use a 2.9-second
cycle, rifles/SMGs/shotguns/marksman rifles 3.35 seconds, snipers 3.6 seconds and
LMGs 3.8 seconds. Larger weapons sit further from the camera to preserve their
stock, magazine and muzzle framing. The existing weapon and gripping hands move
together; the world camera stays under the player's control.

Press **I**, tap **INSPECT**, or press standard-controller **D-pad down**. A second
press stops the action. Fire, ADS, sprint, reload, switching, jumping/vaulting,
equipment, interaction and damage cancel it immediately. Walking and looking
continue, pausing freezes its simulation clock, and spawn/round-end resets clear
it. Inspection changes no ammunition, firing cadence or ballistic behaviour.
The touch control supports both profiles, left-handed mirroring and custom
layouts. Large controls on narrow screens place INSPECT above the utility strip
to clear the combat buttons. The field blade's old generic pistol-grip hand
target was raised to meet its horizontal handle after the side-view review
exposed a visible gap.

Optional weapon motion now includes bounded, handling-dependent angular lag and
an analytic damped recoil spring. These affect the rendered weapon only. Full
ADS keeps its X/Y and angular sight alignment exact; axial firing feedback remains.
Motion off clears the optional inertia/springs and preserves basic firing/melee
feedback. No new meshes, textures, effects or render passes were introduced.

## Evidence and limits

- [Browser validation](validation-inspection-browser.json): actual keyboard and
  pointer input reaches the simulation, eight 667 × 375 layout combinations pass,
  and native weapon/accessory geometry stays inside the viewport at both inspection
  phases for all thirty weapons. Sleeves are excluded from this framing check
  because they naturally continue off the bottom of the first-person view.
- Eighteen actual 932 × 430 gameplay renders cover rifle, SMG, shotgun, sniper,
  LMG, pistol, blade, suppressed weapon and revolver presentation. See the
  [receiver/side contact sheet](art-inspection/contact-sheet-side.jpg) and
  [top/action contact sheet](art-inspection/contact-sheet-top.jpg). The individual
  PNGs retain the full frames.
- [Blade follow-up validation](validation-inspection-12-browser.json) records the
  hand-target correction and recapture separately.
- `tests/weapon-inspection.test.mjs` checks all thirty complete timelines,
  inventory preservation, same-step interruption, pause/reset and controller
  edges. `tests/weapon-dynamics.test.mjs` checks 30/60/120 Hz recoil equivalence,
  all thirty bounded sustained-fire/turn responses, ADS alignment, motion off
  and retained melee feedback. Added input tests cover I-key repeats, cancelled
  taps and max-size mirrored layouts; the handling test checks blade/glove contact
  through repeated posed frames.

The captures use Chromium software WebGL at medium quality. They are not physical
iPhone measurements or Safari acceptance. Inspection is implemented; the coarse
weapon geometry, glove anatomy and existing finger/contact detail still fall
short of the requested professional art standard. The new recoil/inertia system
has behavioural validation, but premium temporal movement quality remains open.

Reproduce with `node scripts/validate-inspection.mjs`; use `--only 12` for the blade
follow-up. The validator writes the original PNGs and numerical evidence; contact
sheets are review aids assembled from those captures.
