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

Requirements: Python with NumPy/SciPy and FFmpeg. The output is 428 synthesized takes
in two segmented sound-bank files, plus per-clip offsets, durations and mastering
metrics. Four unsuppressed and three suppressed variations exist for every weapon;
reload, seat and rack actions accompany them. Boots cover eight surface families
(including wooden floors) with five heel/toe/scuff takes each. Impacts cover five
materials with four debris takes each, and explosions have four layered variations.
`ballistic-foley.json` adds editable ricochet, penetration and casing floor-contact
designs: sixteen material/event families with four takes each, including five
separate polymer shotgun-hull families. Their runtime
events follow real cover contacts and bounded cosmetic case positions; full
behavior, limits and an isolated listening reel are in
[`BALLISTIC_AUDIO61.md`](../../docs/BALLISTIC_AUDIO61.md) and the completed bounded
case/hull coverage, revolver extraction timelines and listening reel in
[`CASING_AUDIO66.md`](../../docs/CASING_AUDIO66.md). The melee weapon keeps
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

The bank downloads 3,794,406 bytes and decodes to 38,208,188 bytes of mono PCM
in the recorded Release 66 Chromium validation at 44.1 kHz. Native 48 kHz
decoding allocates 41,587,060 bytes, below the regression allowance of 40 MiB
by 355,980 bytes. Further bank growth needs a new budget review. This is an audio
allocation bound, not a measured Safari process-memory limit.

`node scripts/check-audio-browser.mjs` decodes every bank record with the browser,
checks finite decoded samples/peak, plays spatial and occluded sources, exercises
the 24-source cap and verifies source cleanup. The captured result is
`docs/validation-production-audio-browser.json`; it is explicitly desktop evidence,
not an iPhone benchmark or a subjective listening review.
Use `--output docs/validation-ballistic-audio61-browser.json` to record the
current checkpoint separately and preserve the earlier evidence.
Use `--sample-rate 48000 --output docs/validation-audio66-48k-browser.json`
to measure native resampling and bank memory at 48 kHz separately.
