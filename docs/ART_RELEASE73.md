# Release 73: covered-feed sequence and operator wrist contacts

18 October 2026. Continue from pushed Release 72 `1e8cfb9`, preserving its
shared operator components and Release 71 separate magazine roles. The remaining
covered-feed bolt-open cue occurs before the lid finishes closing, and operator
hands use fixed orientation despite receiving rotating shared contacts.

## Scope

Seat the covered-feed lid before an empty-reload charging action. Align only
these two weapons' cosmetic bolt motion, action sounds and shared hand targets;
retain their total reload duration, ammunition crossings and all other families.
Apply shared reload-contact roll and mounting pitch to the operator wrist,
returning to its original neutral orientation when the reach weight is zero.

No media, world inventory or physics changes are required. The original rigid
fingers and bounded arm reach remain. Source review and core checks cannot
establish natural motion, professional appearance or premium audible quality.

## Verification and acceptance

Follow [AGENTS.md](../AGENTS.md): run only `npm run verify` once on the final
runtime state, containing the existing 74 core tests plus packaging/offline
checks. No additional suites, browser checks, listening fixtures, shader checks,
asset audits or profiles. Actual gameplay, listening and physical iPhone
acceptance remain open in the [overhaul checklist](OVERHAUL_CHECKLIST.md).

## Implementation and source review

The two covered-feed rigs (weapon IDs 9 and 27) now share frozen phase constants
between pose sampling and foley crossings. Their covers close over .77–.86;
empty hands move directly from the seated cover to the charging handle over
.86–.91, pull over .91–.95 and return over .95–.98. Open/close sounds cross at
.95/.98. Empty hands hold through closure and return by .995; tactical hands
release directly from the seated cover over .86–.995 without a charging action.
Other-family stages and motion remain unchanged. Reload clocks and ammunition
code have no edits. Existing event counts, bank, voices and cancellation remain.

Operator support wrists compose weighted weapon pitch and shared contact roll
around the original .1 pitch/−.2 roll glove pose. The shared actor body transform
then applies once to the glove and weapon. No per-frame objects, arrays, new
meshes or rendering resources are added; the two-bone arm still clamps reach.
Neutral contact weight restores the original orientation exactly. An independent
source review found no actionable issue in phase/cancellation branches, rotation
composition or actor transform flow. This is not gameplay-image acceptance.

`node scripts/release.mjs 73` packages 84 game modules and the existing 160
asset-list entries. Uncompressed game JavaScript grows from 703,981 to 705,873
bytes, an increase of 1,892 bytes. Media and editable source have no Git diff.
File sizes and source bounds do not measure physical frame time or memory.

## Recorded verification

Tracking checkpoint `04bdc1d` and runtime `365bd690d580fe1590a2485d3225b71ed916d965` are pushed on
`codex/overhaul73`. Benchmark provenance identifies that runtime and content
fingerprint `0f75f222fa01ba1b36994ed95da1ea615be83fd9fde412a5ce55cb9fae26c138`.

One final `npm run verify` passes **74/74 core tests**, zero failures, then the
**88-module** packaging/offline check, geometry winding, local assets and Home
Screen manifest. See [recorded result](validation-release73.json). No additional
suites, browser/listening fixtures, shader checks, asset audits or profiles ran.
The existing checks do not establish every revised animation/audio/LOD path.

Rigid fingers, forearm twist, natural grasp and reach clamping remain. Gameplay
and listening acceptance, professional quality and physical iPhone costs remain
open in the [overhaul checklist](OVERHAUL_CHECKLIST.md).
