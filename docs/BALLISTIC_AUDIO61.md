# Release 61 ballistic contact and casing audio

Implemented on 12 October 2026. This checkpoint adds dedicated sound/events for
cover penetration, shallow hard-surface bullet deflection and surface-specific
casing landings. Existing collision impacts and gameplay ballistics are preserved.

## Implemented behavior

- Actual penetrations expose the outgoing cover face from `traceBullet`, then
  emit `penetration` with both entry and exit positions. Metal, wood, glass and
  plaster/stone-family recordings combine a muted bite with exit rupture/debris.
  Damage, energy loss, cover thickness, actor selection and the four-layer limit
  keep their existing rules.
- A non-penetrating strike with incidence below 0.32 on metal or hard mineral
  cover emits `ricochet`. Two families contain short, moving fragment turbulence
  and quiet falling inharmonic material detail. These are cosmetic deflection
  cues: the existing bullet stops at cover. This checkpoint does not add reflected
  damage rays or bullets bouncing into another actor. Normal-incidence, wood,
  glass, water and shotgun contacts do not generate this cue.
- Cases use a separate, deterministic cosmetic flight simulation. Renderer and
  audio consume the same positions; a falling case emits one `casing` event at
  actual ground/deck contact. Hard, metal, wood, soft ground and water select
  distinct takes, including authored floor/puddle surfaces. Pump and bolt weapons
  delay ejection; revolvers retain cases. Shotgun hulls use a lower playback rate
  and distinct visible tint. The pool holds at most 48 cases and keeps local
  shots when ambient cases fill it. Distant actors do not allocate cases.
- Dedicated contact sounds replace the corresponding generic impact sound,
  preserving impact particles/decals. Their positions drive stereo pan, distance
  attenuation, occlusion filtering and shared room/hall responses. The player's
  distant contacts attenuate from the struck cover, including intervening walls.
  Quiet foley cannot consume the eight voices reserved for important player cues:
  the existing 16 ambient / 24 total voice limits and priority replacement remain.
  Ballistic contacts and case landings each admit at most three sounds per event
  batch, with 40 m and 18 m hearing cutoffs respectively.

## Editable original source and listening artifact

[`ballistic-foley.json`](../authoring/audio/ballistic-foley.json) exposes material
bands, transient frequencies, debris counts, exit spacing and casing bounce
timings. [`build_audio.py`](../authoring/audio/build_audio.py) generates original
noise/transient/granular synthesis without third-party samples. `npm run
assets:audio` regenerates the bank and segmented offline runtime files.

The new library adds eleven families with four takes each, bringing the shipped
bank to 408 recordings / 175 keys and **3,715,912 bytes**. No consecutive ready
take repeats. Native startup synthesis supplies every new family before decoding.

[Listen to the isolated 44-take preview](audio-release61/ballistic-foley-preview.m4a).
[Cue timings](audio-release61/ballistic-foley-preview.json) identify each family
and take. `node scripts/render-ballistic-audio-preview.mjs` rebuilds this reel
from the exact shipped AAC clips, at unity gain with 350 ms gaps. Runtime foley
uses quieter gains, so the reel does not reproduce a full combat mix.

## Verification and limits

`node --test tests/ballistic-audio.test.mjs tests/ballistics.test.mjs
tests/map-audio.test.mjs tests/production-audio.test.mjs` passed all **22 tests**.
These cover actual cover exits and reduced damage, glancing eligibility and
unchanged stop distance, raised-deck/puddle selection, one landing per case,
capacity/local priority, weapon ejection differences, pause/reset, unchanged
gameplay randomness, distance/occlusion and startup synthesis.

[`validation-ballistic-audio61-browser.json`](validation-ballistic-audio61-browser.json)
records actual Chromium native AAC decoding and Web Audio playback: all 408
recordings decoded, **37,432,028 bytes** of mono PCM at 44.1 kHz, finite samples,
0.91374 peak, two shared convolvers, 24 peak voices and zero remaining sources
after playback. The metadata-based 48 kHz allocation remains below the existing
40 MiB regression allowance. The preview and codec checks make the new sounds
reviewable; they do not establish premium audible realism.

Physical iPhone Safari latency, speaker/headphone response, memory behavior and
sustained combat listening remain unverified. Casing motion models a short
floor-contact trajectory; it does not model tumbling solids, collisions against
wall sides, actor interactions or a separate physics bounce for every audible
micro-contact. Pump/bolt ejection timing is an authored approximation. Soft
surfaces share one family, shotgun hulls share pitch-shifted material takes, and
revolver reload case dumping is not implemented. The overall shell-casing and
premium-audio checklist requirements should therefore remain partial.
