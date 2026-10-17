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

The revised closing-hand envelope reaches the lid over .74–.80 and stays there
through .88 before releasing by .93. Both tactical and empty covered reloads
retain full reach until .94, then return by .995. The empty covered hand blends
to its existing action target over .88–.94; other weapon families keep their
original reach/action envelopes. These are normalized animation phases.

The existing covered bolt-open cue is .84, before cover-close at .86. Keeping
both original cues means one support hand cannot fully match both contacts.
This change prioritizes the close contact; earlier bolt-open grasp remains
imperfect. It does not claim fully corrected mechanical sequencing.

No new media, Blender exports, world magazine inventory or physics are needed.
Hands remain rigid and two-bone arm reach remains bounded. This work advances
functional choreography; professional appearance is not established by source
review or core tests.

## Verification and acceptance

Follow [AGENTS.md](../AGENTS.md): run only `npm run verify` once on the final
runtime state, containing the existing 74 core tests plus the packaging/offline
check. No extra tests, browser, shader, asset-audit or profile runs.

## Implementation

`poseOperator` now animates one actor-owned `weaponModel` with exchange enabled.
Native proxies and reduced slots read that same pose, eliminating separate
magazine travel and hand-target formulas. The rig resets source/replacement
visibility each animation call; changing the selected weapon or attachments
refreshes the appropriate model/proxies. Same-geometry weapon switches reuse the
model with the newly selected weapon's current phase and state.

Native magazine proxies reuse the original mesh/material metadata. Cloned
native core primitives are excluded from the accessory path. Reduced weapons
retain at most 24 source-index slots; each magazine slot selects its original
or replacement part, with both hidden during the existing handoff gap. The main
magazine body is retained even when small enough to fall below the volume cut.
The original five far slots and all distance/quality thresholds stay unchanged;
a magazine omitted by far LOD remains omitted. Small shell/loading components
are not guaranteed to survive the reduced selection.

Reduced pieces compose the mounting pitch with their complete animated local
rotation, preserving magazine roll/yaw. Operator support-hand positions use
the common component contact and reach envelope. The existing two-bone arms
still clamp distant targets and keep their original rigid hand orientation;
contact roll does not articulate the operator fingers or wrist.

The template cache remains bounded at 32 entries. Models and source mappings
are constructed on loadout changes; animation uses cached state. Near native
operators reuse the same full model rather than constructing a second one.
Far/fallback operators now animate a full cached rig rather than their previous
short bespoke formulas. This adds CPU/memory work whose device cost is unmeasured.
An independent source review covered role/index mapping, mid-reload native
proxy creation, cancellation, cache changes and root/rotation composition.

## Package observations

`node scripts/release.mjs 72` prepared 84 game modules and the existing 160
asset-list entries for offline installation.

| Observation | Release 71 | Release 72 |
| --- | ---: | ---: |
| Uncompressed game JavaScript | 703,465 bytes | 703,981 bytes |
| Operator presentation module | 9,036 bytes | 9,335 bytes |
| Shared weapon model module | 43,867 bytes | 44,084 bytes |
| Compressed native library | 13,499,841 bytes | 13,499,841 bytes |
| Production materials/lighting | 67,319,376 bytes | 67,319,376 bytes |
| Packed editable Blender source | 172,093,782 bytes | 172,093,782 bytes |

The JavaScript increase is 516 bytes before host compression. Media and editable
source have no Git diff. File sizes and source bounds do not measure frame time,
heap, GPU cost or physical iPhone memory.

## Recorded verification

Scope checkpoint `5107571` and runtime source
`ec0afe39242b947cf0b7caba18fb61357601ac96` are pushed on `codex/overhaul72`.
Benchmark provenance identifies that runtime and content fingerprint
`1ca0ffb0b9a0667dcabe06dcf6bc40b28233f1bf97f47c754f479c83618e63fc`.

`npm run verify` passed once on the final runtime and stamped provenance:
**74/74 core tests**, zero failures, then the **88-module** packaging/offline
check, geometry winding, local assets and Home Screen manifest. See
[the recorded result](validation-release72.json). No extra suites, browser,
shader, asset-audit or profile runs were performed. These existing checks do
not establish every operator exchange/contact path or its visible quality.

Actual gameplay images, natural grasp, professional animation and physical
iPhone costs remain open in the [overhaul checklist](OVERHAUL_CHECKLIST.md).
