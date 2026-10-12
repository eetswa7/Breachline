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

Requirements: Python with NumPy/SciPy and FFmpeg. The output is 416 recordings
in two segmented sound-bank files, plus per-clip offsets, durations and mastering
metrics. Four unsuppressed and three suppressed variations exist for every weapon;
reload, seat and rack actions accompany them. Boots cover eight surface families
(including wooden floors) with five heel/toe/scuff takes each. Impacts cover five
materials with four debris takes each, and explosions have four layered variations. The melee weapon keeps
its own swing/action treatment.

The 12 October 2026 contact pass adds four takes each for metal/stone ricochets,
metal/wood/glass/plaster penetration exits, and case landings on hard, gravel,
soft, snow, metal, water and wood surfaces. All 52 additions are original offline
designs in `build_audio.py`, with editable noise bands, envelopes, modes and
grain/contact timings. Ricochets use brief scraping pressure and a quiet falling
mode; exits use material tearing/fracture; cases use smaller contacts and two
decaying micro-bounces. Shotgun hulls play slower than brass cases. The casing
family shares gravel/quarry and groups dirt/grass/sand as soft ground.

`ballistics.js` records actual entry normals and penetration exit coordinates.
Successful existing penetrations emit a dedicated exit cue. Stopped projectiles
emit a ricochet cue only at grazing angles on metal or stone; head-on hits, soft
materials and origins inside a block cannot trigger it. These are presentation
events: there is no secondary damage ray and existing cover energy/damage stays
unchanged. Entry impact graphics remain; audio chooses a single dedicated cue
instead of layering another generic contact on top. Three incidental projectile
contacts and three case landings can play per frame, inside the existing voice
limits. Own distant contacts still receive positional attenuation/occlusion.

`CasingFoley` supplies 32 reusable cosmetic bodies in the game. The renderer draws
the same positions that produce the landing event, independently of the visual
particle eviction budget and audio mute state. Swept collision follows raised
supports, walls and destruction; the landing material recognises actual thin
floor finishes, puddles and rotated footprints. Pump/bolt cases wait for their
mechanism; delayed cases follow the moving weapon until release. Revolvers retain
cases when firing and extract up to six during player reload; cancelled extraction
or weapon switching drops unreleased cases. Distant bot cases are omitted and
player cases can replace a non-player slot. Cases stop after the first landing,
with their small recorded bounce/tumble staying inside one audio voice. Pauses
freeze simulation time; rounds/new matches clear bodies. This is bounded cosmetic
contact simulation, not a full rigid-body or full component-animation system.

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

The bank downloads 3,701,184 bytes and decodes to 37,495,532 bytes of mono PCM
in the recorded Chromium validation at 44.1 kHz. This is about 5.7% more decoded
memory than the prior 364-take bank. Native
48 kHz PCM stays below the regression allowance of 40 MiB. This is an audio
allocation bound, not a measured Safari process-memory limit.

`node scripts/check-audio-browser.mjs` decodes every bank record with the browser,
checks finite decoded samples/peak, plays spatial and occluded sources, exercises
all 13 new contact keys, the 24-source cap and source cleanup. The captured result is
`docs/validation-production-audio-browser.json`; it is explicitly desktop evidence,
not an iPhone benchmark or a subjective listening review.
