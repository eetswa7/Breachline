# Original sound design

`build_audio.py` renders deterministic, original PCM from bipolar muzzle pressure
fronts, band-limited turbulence, short mechanical contacts, granular foley and acoustic tails.
It masters each clip and uses FFmpeg to encode AAC-LC in M4A containers. There
are no sampled commercial weapons or sounds extracted from other games.
`weapons.json` records the existing weapon categories and action timings.
`weapon-voicing.json` gives each of the 30 weapons editable pressure mass,
blast envelope, crack spectrum, mechanism, action timing and tail parameters.
Gunfire no longer uses a sustained bass note, and metal/debris contacts use
noise-led transients with quiet inharmonic modes rather than prominent chimes.

```sh
npm run assets:audio
node scripts/release.mjs 59
```

Requirements: Python with NumPy/SciPy and FFmpeg. The output is 406 recordings
in two segmented sound-bank files, plus per-clip offsets, durations and mastering
metrics. Four unsuppressed and three suppressed variations exist for every weapon;
reload, seat and rack actions accompany them. Boots cover eight surface families
(including wooden floors) with five heel/toe/scuff takes each. Impacts cover five
materials with four debris takes each, and explosions have four layered variations.
Dedicated glancing metal/stone contacts have four takes each; verified through-cover
contacts cover metal, wood, glass and plaster/stone with four takes per family.
Small casing contacts cover hard, metal, wood, soft, water and snow floors with
three takes per family. The melee weapon keeps
its own swing/action treatment.

Safari decodes M4A natively. The loader performs two decoder jobs at a time and
publishes clips incrementally. Short pressure-front synthesis remains a responsive
startup fallback. Ready takes never repeat consecutively, including during incremental
decoding. Playback uses 24 total voices, a 16-voice ambient limit, player
priority, positional stereo cues, distance/wall filtering and two shared short-room/warehouse
responses selected from roof geometry. Outdoors remains dry; destroyed roofs
stop selecting the indoor response; rotated roof footprints are respected. Shared
responses roll off high frequencies over their short decay and use two convolution nodes
for the entire scene. These are designed sounds, not field recordings. Hardware audio
latency and loudspeaker response still require physical device listening.

The bank downloads 3,676,377 bytes and decodes to 37,410,860 bytes of mono PCM
in the recorded Chromium validation at 44.1 kHz. The 42 additional contact takes
add about 5.4% decoded memory and 4.5% download bytes to the 364-take bank. Native
48 kHz native decoding uses 40,719,220 bytes (38.83 MiB), below the regression
allowance of 40 MiB. This is an audio
allocation bound, not a measured Safari process-memory limit.

`node scripts/check-audio-browser.mjs` decodes every bank record with the browser,
checks finite decoded samples/peak, plays spatial and occluded sources, exercises
the 24-source cap and verifies source cleanup. The captured result is
`docs/validation-production-audio-browser.json`; it is explicitly desktop evidence,
not an iPhone benchmark or a subjective listening review.

`ballistic-audio.js` reads confirmed `traceBullet` contact results. Through-cover
sounds play at their entry and exit faces; only verified penetrations emit them.
Glancing terminal hard impacts produce a short fragment scrape. This never
reflects the gameplay bullet, adds a new target hit, or changes its damage.
Ordinary impact audio is replaced by the dedicated cue, while the impact visual
event remains intact. Contact audio applies distance, occlusion and room selection
at the actual contact, including contacts from the player's own gun.

Casing landing uses a bounded floor-query estimate with the existing ejection
velocity and gravity. The surface comes from the floor under the projected case;
revolvers and melee weapons emit no per-shot case. Bolts and pumps add an action
delay. This is cosmetic foley and does not add casing physics. Web Audio schedules
each delayed source directly; scheduled sources count immediately against the
same 16 ambient/24 total limits, yield to a player shot, and are cleaned up on
pause before the audio clock is suspended. There are no per-shot timers or queues.

`node scripts/check-ballistic-audio-browser.mjs` validates native delayed playback,
priority and pause cleanup, then renders actual spatial event playback to
[`audio-contact-preview.m4a`](../../docs/audio-contact-preview.m4a). The companion
[`validation-ballistic-audio-browser.json`](../../docs/validation-ballistic-audio-browser.json)
identifies each 1.6-second section: two glancing contacts, four through-cover
materials, then six rifle/casing floor comparisons. This fixture is available for
listening; generation and signal checks do not establish convincing or premium
audible quality. Physical iPhone latency and subjective listening remain open.
