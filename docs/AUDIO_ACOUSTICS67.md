# Release 67 moving-listener acoustics

Recorded 14 October 2026. Playing world sounds now change level, distance
filtering and cover loss as the listener moves. This addresses the frozen
event-time attenuation documented in [Release 65](SPATIAL_AUDIO65.md); the
overall premium sound and physical iPhone requirements remain open.

Previously the listener's native HRTF position changed every gameplay batch,
but an existing explosion/gunshot tail retained its original gain and filter.
Walking away could change its direction while its level stayed unchanged, and
stepping behind or destroying cover had no effect until another sound started.
Now each active world emission retains a copied contact/emission position and
recomputes its distance gain/filter on the existing gameplay audio batch,
including empty batches. Already emitted waves stay at their original world
origin; new moving-actor cues use that actor's new emission position.

The existing distance law, 0.48 cover multiplier, covered/distant low-pass
targets, explosion minimum level, local centering and zero native HRTF rolloff
are retained. Legacy stereo fallback now refreshes azimuth during head turns.
Intrinsic gain/filter writes use a 25 ms exponential slew between batches,
without adding a scheduled automation timeline. Remote component edge envelopes
use a separate gain node, preserving their short click-free region endings
while listener gain changes. Player cues keep their immediate path and voice
priority.

A native moving-cover render exposed a coefficient/state problem when reopening
the retained BiquadFilter at exactly Nyquist: the decoded explosion produced a
12.77 peak during that development fixture. The clear, close-source cutoff is
now 0.45 times sample rate (19,845 Hz at 44.1 kHz; 21,600 Hz at 48 kHz).
This adds a small upper-band rolloff to close world cues and avoids the explosive
ringing in the native retained filter. The final five PCM fixtures peak at or
below 0.3454, with no nonfinite samples. The distant and covered filter laws
remain unchanged.

## Work and lifetime bounds

- Existing 16 ambient / 24 total source limits remain. Tracking has at most
  24 records and creates no additional decoded samples or sound-bank files.
- Every batch updates level/filter/stereo pan for at most 24 world voices.
  Cover refresh scans at most 24 records and selects at most four existing
  voices, round robin. Initial emissions and refreshes share eight maximum
  visibility rays per batch; identical contact/height pairs share a ray.
  New voices beyond that batch's cover budget begin clear and acquire cover
  during a subsequent refresh.
- Stationary cover refresh has an 80 ms minimum interval; 20 cm listener
  movement permits an earlier refresh. At 24 eligible voices, a full refresh
  takes at most six gameplay batches once the refresh interval is due. Clips
  shorter than 180 ms and their final 60 ms retain their initial cover, while
  their live distance and stereo direction still update.
- World voices have one retained low-pass node so an initially close/clear
  sound can later become distant/covered. Remote region cues additionally have
  one edge-envelope gain. These nodes remain bounded by active voice capacity;
  the two shared room convolvers and decoded-bank memory stay unchanged.
- Natural end, player-priority replacement, component cancellation and pause
  remove tracking and disconnect the corresponding graph through the same
  idempotent cleanup. No audio timer, delayed source start or gameplay collision
  change was added.

## Native playback, PCM and listening evidence

[Chromium validation](validation-world-acoustics67-browser.json) exercises the
actual running AudioSystem, shipped native-decoded buffers and native gain,
filter and HRTF nodes. The real-context checks use the advancing audio clock,
rather than assuming wall-clock delay equals rendered audio time. They confirm
existing-tail distance and cover changes, stationary cover removal, remote
component cancellation, player-priority replacement and immediate pause cleanup.

The [10.5-second stereo reel](art-release67/world-acoustics-preview.m4a) has
[segment timings, listener states and provenance](art-release67/world-acoustics-preview.json).
Use headphones. The same shipped mono explosion plays in five native
OfflineAudioContext fixtures: fixed front reference, listener moving 30 m away,
cover added, cover removed and listener moving 8 m left. Changes start 300 ms
after the sound; batches continue at 60 Hz. There is no normalization or room
wet send. Comparing the tail from 0.85–1.45 seconds isolates output after the
listener/cover change:

| Fixture | Tail RMS / fixed reference | First-difference RMS / reference |
| --- | ---: | ---: |
| Listener moves 30 m away | 0.172874 | 0.136078 |
| Cover added | 0.485151 | 0.201283 |
| Cover removed | 0.999901 | 0.999929 |
| Listener moves 8 m left | 0.862059 | 0.916358 |

First-difference RMS measures rapidly changing sample energy; it is not a
calibrated spectral or perceptual brightness measure. The cover fixture loses
both level and high-frequency sample variation. The removed-cover tail recovers
the reference. With the listener moving left of the source, the right-ear tail
RMS is 0.005474 versus 0.004074 on the left, confirming the moving native HRTF
direction. Every fixture ends with zero voices and zero live tracking records.

The native 2,000-update cost fixture retained 24 world voices, used eight initial
emission rays and never exceeded four existing-voice rays in a batch. Desktop
median update time rounded to 0 ms, p95 was 0.2 ms, and the worst sampled update
was 50.9 ms during concurrent browser work. These coarse desktop wall-clock
timings are not a frame-budget guarantee or physical iPhone measurement; the
explicit source/ray/node bounds are the enforceable workload limits.

[Focused acoustics tests](../tests/world-acoustics.test.mjs) cover copied emission
positions, distance/cutoff slewing, destruction with a stationary listener,
round-robin fairness, shared ray caps, duplicate contacts, short-cue cost,
component envelope preservation/cancellation, legacy pan, local centering,
explosion floor and natural/forced cleanup. Together with the existing spatial,
production and ballistic tests, all 33 focused checks passed. The
[native validator](../scripts/check-world-acoustics-browser.mjs) records source
commit, working-tree state, exact runtime hashes and browser version; it rendered
the reel in Chromium 154.0.8037.57 at 44.1 kHz. Evidence records the dirty
implementation hashes before the integration checkpoint.

## Remaining limits

This is bounded direct-path acoustics, with one binary line-of-sight cover
sample. There is no material-dependent transmission, diffraction, propagation
delay or reflected-ray room model. Shared room/hall responses are still selected
at emission and their already mixed tails do not follow the listener's changing
enclosure. Cover transitions can wait for their round-robin turn, especially at
30 FPS, and brief cues intentionally retain emission-time cover. The listening
reel makes the audible change reviewable but does not establish premium realism
or individual HRTF localization. Physical iPhone Safari CPU, sustained frame
pacing, device output latency and subjective headphone acceptance remain
unverified.
