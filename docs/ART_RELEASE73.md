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
