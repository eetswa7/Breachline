# Character motion checkpoint, 12 October 2026

The existing efficient rigid operator rig now has a new locomotion and weight
transfer layer. This replaces the previous uniform sine stride and whole-body
death tilt; it does **not** introduce a skinned skeleton, motion capture,
ragdolls, new anatomy, or professional human-animation coverage.

Walking uses a longer stance with a low eased swing, heel strike and toe
push-off. Faster travel blends to shorter ground contact, longer reach,
increased boot clearance and a forward chest lean. Cadence follows speed and
directional reach. Strafing has smaller lateral steps and a restrained torso
lean; backwards travel reverses the foot path. Crouching blends the hips down
and back, reduces the step, and inclines the chest. The head and attached helmet
equipment blend towards the look pitch while the gun keeps the exact current
aim input. Jump/landing presentation includes tucked boots and a brief pelvis
compression on contact.

Damage now produces a short chest recoil, side stagger and knee compression
with a recovery envelope. Death folds the chest and buckles the knees with an
asymmetric brace. The existing half-second rendering lifetime is retained;
there is no lasting corpse or simulated fall against surrounding geometry.
Elapsed damage time advances this pose in all eleven modes, including
Sabotage and Elimination where a respawn timer does not advance.

One reusable rotation/translation moves the upper body, sleeves, equipment,
fallback carried weapon and native carried weapon together. Arm IK and the
sewn sleeve identifiers follow the final transforms. Both actual gun hand
anchors remain attached across the thirty weapon families. The muzzle effect
origin shares this presentation mount; simulation aim, collision capsules,
movement velocities, damage, ammunition and ballistic traces are unchanged.
Canonical part dimensions, part indices, editable native anatomy, body/weapon
LOD selection and rendering lifetime are preserved. No meshes, render passes,
material variants or dynamic draw calls were added by the motion layer.

## Actual native gameplay renders

[The browser report](validation-character-motion61-browser.json) records 23
scripted temporal fixtures in the shipped WebGL renderer at 844 by 390, with
native body and carried gun assets. The actor stands 4.5 metres from the player
on Blacksite; the camera looks down slightly so the entire boot cycle remains
visible. These are controlled posing fixtures, not recordings of autonomous AI
play, physical iPhone measurements or performance benchmarks.

Eight unaltered renders are saved with SHA-256 provenance in
[the image manifest](character-motion61/manifest.json):

| State | Render | What was reviewed |
| --- | --- | --- |
| Stand | [Image](character-motion61/stand.png) | Reference silhouette and both weapon hand joins. |
| Walk weight transfer | [Image](character-motion61/walk-transfer.png) | Alternating boot lift, restrained upper-body movement and closed joints. |
| Run support | [Image](character-motion61/run-support.png) | Increased stride reach, grounded support and forward chest lean. |
| Run swing | [Image](character-motion61/run-swing.png) | Increased clearance without separating the knee or ankle. |
| Crouch/aim settled | [Image](character-motion61/crouch-aim-settled.png) | Lowered tactical stance, inclined torso, head aim and attached gun. |
| Hit impulse | [Image](character-motion61/hit-impact.png) | Short upper-body recoil/stagger with stable boot placement. |
| Death knees | [Image](character-motion61/death-knees.png) | Initial knee buckle instead of tilting an upright figure at the root. |
| Death end | [Image](character-motion61/death-end.png) | Lowered chest and asymmetric fold near the original despawn time. |

The frame review shows coherent limb/equipment joins and visibly differentiated
travel, crouch and collapse states. The existing dark, faceted character forms
and limited clothing detail remain apparent. A full professional character
standard is still unmet. The rigid body cannot produce realistic cloth or
shoulder deformation; procedural contacts approximate ground support and do
not solve against uneven terrain, stairs or walls. The brief death window also
limits how much of a believable fall can be shown. These limitations remain
open in the overhaul checklist.

## Reproduction and checks

Run `node scripts/check-character-motion-browser.mjs` with the same Playwright
environment used by the other browser checks. The script saves the full 23-frame
sequence in `test-results/characters61/` and updates the JSON report. It records
the source commit and dirty-distribution flag, and tests native asset presence,
crouch progression, speed-dependent support fraction and chest collapse. The
captured checkpoint had no console errors or failed asset requests. Numeric
gates do not establish the desired artistic quality.

The targeted command is:

```sh
node --test tests/render-budget.test.mjs tests/character-motion.test.mjs tests/operator-mantle.test.mjs tests/presentation-stability.test.mjs tests/aim-momentum.test.mjs tests/actor-frustum.test.mjs
```

Coverage includes boot lower corners above the ground during heel/toe motion,
continuous knee/elbow/wrist joins, native gun contacts for all thirty weapons,
the complete combined rotation, bounded animation transitions, exact paused
poses, landing recovery, respawn cleanup and actual damage deaths in all eleven
modes. Existing native frustum/LOD checks measure 1,800 body/weapon poses against
their conservative culling envelopes. Desktop/software checks do not verify
physical Safari frame pacing, thermal behaviour or animation quality on an
iPhone 16 Pro.

The final targeted pass contains 29 tests. A cadence regression compares a
speed-changing actor with a constant-speed control and checks visible foot
displacement, wrapped angular advance and gradual body descent. This replaces
the obsolete fixed phase-increment cap from the slower sine stride. Boundary
probing also found and corrected small heel/toe rotation pops at ground release
and cycle wrap; a separate check verifies continuous boot position and pitch
there for both walking and running, standing and crouched.
