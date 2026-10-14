# Release 67: attachment contacts, firing presentation and world bounds

This continuation updates the [thirteen-section overhaul checklist](OVERHAUL_CHECKLIST.md)
with source checkpoints and specific evidence. It packages the recent casing,
material and smoke work together with moving-listener acoustics, new magazine
contacts and bounded first-person firing presentation. The full professional
visual/audio target and physical iPhone acceptance remain open.

## Attachment contacts and live acoustics

Fast, extended and drum magazine extraction, manipulation/insertion and seating
now select their own original takes on existing reload events. Stock latches,
bolts, feed covers, individual shells and cylinders retain their weapon cues.
The new take replaces an existing voice, keeping reload timing, ammunition,
spatial processing, cancellation and player priority intact.

[Native 44.1/48 kHz playback and engine timelines](ATTACHMENT_AUDIO67.md) include
listening reels and editable original source. All original 428 encoded recordings
and their metadata remain byte-for-byte unchanged. Eighteen additional takes add
37,221 download bytes. The 446-recording bank decodes to 41,787,436 bytes at
48 kHz, retaining 155,604 bytes below its existing 40 MiB PCM allowance. This
measures the decoded bank, not total browser memory or hardware output latency.

The earlier [moving-listener acoustics checkpoint](AUDIO_ACOUSTICS67.md) keeps
playing world-tail gain/filter/cover loss current as the listener moves. Its
five native PCM/listening fixtures, 24-source cap and bounded cover refresh
remain part of this source release. Shared enclosure responses and subjective
premium sound acceptance remain unfinished.

## Firing presentation

The existing first-person flash sprite expands, stretches and fades over a
34–45 ms family-specific lifetime. Its sampled area and light intensity stay
inside the previous bounds. Monotonic shot serials vary isolated-shot stamps.
The existing single player gas puff is sized/timed for pistol, SMG, rifle,
shotgun and heavier families and now carries the firing pitch into its velocity.
Suppressors retain flame suppression and vent smaller/slower gas.

Gas uses the firing event's weapon and suppressor state, including a killing
Gun Game shot that replaces the held weapon before render-event processing.
Real Spectre SD-to-Breach 12 and Talon 338-to-Sable P regressions cover that case.
The Canvas fallback shares temporal flash gating and clears stale menu flashes.
Gameplay aim, damage, recoil, ammo and casing simulation remain authoritative.

[Matched native gameplay frames and temporal preservation gates](FIRING67.md)
document the visible change and resource costs. The authored flash texture and
approximate gas origin are retained; third-person flashes/tracers are unchanged.
These frames support a bounded presentation improvement and do not establish
professional overall effect quality.

## World batching and bounds

[The world-batch comparison](WORLD_BATCHES67.md) isolates the centred-cell
assignment from other changes across all sixteen maps and 49 views. Its source
scene maximum falls from 223 to 212 within the existing 220 cap. Native Blacksite
comparisons review geometry, materials, grounded camera placement and LOD.

That review also exposed simplified strata-rock vertices outside bounds derived
only from the near mesh. Unioning each native near/far pair's existing local box
and sphere makes both alternatives conservative during batch creation, LOD
switches and destruction recomputation. It retains batch/resource counts and
creates no new shader, texture, geometry buffer, collider or retained bound
object. More conservative culling submits one additional Iron Quarry draw
(64 complete-frame triangles), while Citadel's selected-world count rises by
88 triangles outside the visible frame. The nine targeted before/after images
are pixel-exact. The separate targeted
post-fix evidence distinguishes this correction from the original cell-only
comparison.

## Validation and preservation

[Final aggregate software validation](validation-release67.json) records the
runtime fingerprint, regression/source/shader gates, native feature evidence,
scene budgets, offline installation and Benchmark Mode/manual JSON export.
The application browser report is [here](validation-release67-benchmark-browser.json).
Screenshots and desktop PCM are integration evidence, not physical iPhone FPS,
thermal endurance, device memory safety, output latency or perceptual acceptance.

All sixteen maps, thirty weapon rigs, eleven modes, the large-map 40-player
rosters, progression, inputs, offline operation and Benchmark Mode remain.
`release57-baseline` remains at `454a5a26a8418fa8db1d3cc1ec197f7e56c56415`.
The production checklist retains unfinished realism, skeletal animation,
library polish and physical-device requirements with their existing open status.
