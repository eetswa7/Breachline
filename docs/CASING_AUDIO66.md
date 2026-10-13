# Release 66 case and shotgun-hull audio coverage

Implemented on 13 October 2026. This checkpoint completes bounded functional
case/hull landing coverage for the current arsenal. Premium audible realism and
physical-device latency remain separate, unverified requirements.

Revolvers now retain the actual fired-case count until reload phase **0.28**,
after the existing cylinder finishes swinging open at **0.26**, before chamber
loading at **0.40**. That simulation crossing releases the retained cases into
the existing engine-owned pool. The renderer consumes those same positions;
each case emits its sound once at actual floor/deck contact. Extraction does
not refill ammunition: the original reload duration, reserve consumption and
completion remain unchanged. Pausing freezes extraction. Canceling before
extraction retains the spent count; canceling afterwards cannot dump it twice.
Death/respawn and round reset preserve the existing reset rules.

Shotguns now select five separate polymer-hull designs for hard, metal, wood,
soft ground and water. The authored hollow-body contact/scuff and quiet brass
head tick replace pitch-shifted metallic-case clips. The twenty new takes are
original deterministic synthesis, with editable parameters in
[`ballistic-foley.json`](../authoring/audio/ballistic-foley.json) and rendering in
[`build_audio.py`](../authoring/audio/build_audio.py); no microphone recordings or
third-party samples are claimed. Every hull family also has an immediate native
startup fallback before AAC decoding completes.

The existing bounds remain: **48** rendered cases, nearby actors only, local
cases preferred when the pool fills, **three** audible contacts per event batch,
**18 m** hearing cutoff, **16** ambient/**24** total voices, and two shared room
responses. Extraction and flight use deterministic cosmetic formulas and
consume no gameplay randomness. Casing/hull contacts remain quiet ambient
voices, preserving the player's reserved capacity.

## Reviewable evidence

[Listen to the 50.25-second stereo reel](audio-release66/casing-foley-preview.m4a).
[Cue timings](audio-release66/casing-foley-preview.json) identify forty exact
native-decoded case/hull takes, paired at unity gain without rate changes, then
five actual revolver reloads over different surfaces plus pump/autoloading
shotgun shots and their real landings. Gameplay segments retain production
gains, native world panners and shared room responses. The reel is deliberately
not normalized. It is a listening artifact; no subjective listening approval
or premium audible-quality claim is made.

[`validation-casing-audio66-browser.json`](validation-casing-audio66-browser.json)
records native Chromium decoding/playback and seven actual gameplay timelines.
All five revolver timelines extract three fired cases only after the cylinder
is fully open, keep ammunition unchanged at extraction, and trigger landing
sounds later at their actual contact positions. Both shotgun action families
select separate hull PCM. Native sources clean up naturally; all rendered
samples are finite. Rebuild with `node scripts/check-casing-audio-browser.mjs`.

The shipped bank now has **428 synthesized takes / 180 keys**, downloading
**3,794,406 bytes**, an increase of **78,494 bytes**. Full-bank native checks at
[44.1 kHz](validation-audio66-browser.json) and
[48 kHz](validation-audio66-48k-browser.json) decoded **38,208,188** and
**41,587,060 bytes** of mono PCM respectively. Both runs reached the 24-voice
cap with two shared convolvers, finite decoded samples and zero sources left
after playback. The native 48 kHz bank stays below the existing **40 MiB**
regression allowance by **355,980 bytes**; further library growth needs a fresh
budget review. This is a bank allocation check, not a measured Safari
process-memory limit. The metadata estimate is 41,589,112 bytes at 48 kHz.

The 37 focused tests in `ballistic-audio`, `component-foley`, `weapon-reload` and
`production-audio` passed. Coverage includes actual firing/reload conservation,
once-only extraction/landing, fully open cylinder phase, pause/cancellation,
large phase crossings, capacity/local priority, unchanged gameplay randomness,
separate hull families, source cleanup and startup fallbacks.

## Remaining limits

This completes functional audio coverage across the current firing/ejection
families and material groups. The cosmetic trajectories approximate an actor's
cylinder/ejection position; they do not reproduce a physically simulated
extractor or tumbling rigid bodies. Existing renderer billboards, first-contact
flight, authored pump/bolt delays and shared soft-ground material grouping
remain. One landing recording contains quieter bounce detail, without a separate
physics event for each micro-contact. Walls and actors do not collide with cases.
The three-contact event limit can suppress individual contacts in a large
simultaneous dump. Physical iPhone Safari latency, speakers/headphones, memory,
sustained combat listening and premium audible realism remain unverified.
