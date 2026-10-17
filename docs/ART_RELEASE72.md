# Release 72: shared operator reload components

18 October 2026. Continue from pushed Release 71 `25c2fb4`, preserving the
first-person exchange in draft [PR #9](https://github.com/eetswa7/Breachline/pull/9).
Operators still use a separate reduced-model magazine path that returns the
same component and disagrees with native reload/hand timing.

## Scope

Use an actor-owned, cached weapon model to share the existing component poses
and support-hand contact between native and reduced operator rendering. Extend
Release 71's outgoing/replacement exchange to the 26 magazine-fed operator rigs.
Keep the reduced weapon's existing 24-piece limit by reusing each magazine slot
for whichever component is visible. Retain existing actor distance/quality LOD.

Correct the shared belt-feed support-hand cover contact: it currently ends at
phase .84 although the existing close sound occurs at .86 and the lid finishes
closing at .93. Preserve actual action, cover, audio and ammunition timing.

No new media, Blender exports, world magazine inventory or physics are needed.
Hands remain rigid and two-bone arm reach remains bounded. This work advances
functional choreography; professional appearance is not established by source
review or core tests.

## Verification and acceptance

Follow [AGENTS.md](../AGENTS.md): run only `npm run verify` once on the final
runtime state, containing the existing 74 core tests plus the packaging/offline
check. No extra tests, browser, shader, asset-audit or profile runs.

Implementation, final static package costs, verification and benchmark provenance
will be recorded as this pass progresses. Actual gameplay images, natural grasp,
professional animation and physical iPhone costs remain open in the
[overhaul checklist](OVERHAUL_CHECKLIST.md).
