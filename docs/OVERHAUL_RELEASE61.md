# Release 61 overhaul checkpoint

This checkpoint adds functional handling and ballistic-contact audio, improves
Blacksite forecourt finishing and reduces avoidable rendering work. The full
professional graphics/audio overhaul remains incomplete; the thirteen-section
[checklist](OVERHAUL_CHECKLIST.md) retains that distinction.

## Player-visible changes

- Every weapon has a receiver/side inspection followed by a top/action check.
  Press **I**, touch **INSPECT** or controller **D-pad down**. Fire, ADS, reload,
  sprint, swapping, equipment, damage and traversal interrupt immediately.
  Pausing freezes the sequence; death and spawn clear it. The control supports
  simple/advanced, mirrored, rescaled and edited touch layouts.
- Damped handling-dependent angular inertia and shot impulses change the
  viewmodel's movement. Existing bullet directions, aim recoil, ADS sight
  alignment, simulation cadence and reduced-motion behaviour are preserved.
- Dedicated metal/stone glancing contacts and verified penetration entry/exit
  cues use original sound designs. Casing contacts choose hard, metal, wood,
  soft, water or snow floors. Landing is a cosmetic floor-query estimate;
  revolvers/melee do not eject a case per shot. The offline bank has 406 takes.
- Blacksite's forecourts contain twenty construction pours with joints,
  uneven curing, traffic marks, edge deposits and worn paint. Existing native
  PBR maps/normal detail remain. The paired renders show an incremental
  improvement; architecture, texture repetition and coarse hero anatomy remain.

## Rendering and device evidence

The user's [unaltered Release 60 iPhone export](../benchmarks/iphone-release60-2026-10-06.json)
is archived and [analysed](BENCHMARK_RELEASE60_ANALYSIS.md). It records 57.733
average FPS, a 27.125 FPS 1% low and a 1,107 ms Blacksite interval. Aggregate
stutters/p95 improve over the older extract, but no exact workload/graphics
contexts match. Those results do not measure this checkpoint.

Operator occlusion requires one known closed native wall to cover the complete
projected live/falling envelope, including the held weapon. Door/window frames,
facades, transparent, rotated, breakable, microdetail and deforming geometry are
excluded. Near-camera actors and loading bypass it; every shadow-refresh frame
keeps the original actor buffers so occluded actors still cast their shadows.
This implements conservative actor occlusion, with broader world occlusion open.

Loading prepares primary and actual shadow-depth material variants in groups
of at most eight and yields between groups. Preparation includes near/far
geometry, native and generic held weapons, hidden muzzle/reload components,
both weapon slots, interior/exterior reflection probe sizes and shadow-enabled
and shadow-disabled quality variants. It restores
render state, weapon slot and actor detail state without advancing the match.
This addresses first-use opportunities found by auditing the submission path;
the original device stall's cause and its removal are unproven.

Blacksite ground finishing adds two submitted draws, 32 plane triangles and six
shader variants in each reviewed view. It adds no texture allocation, shadow
draws or fullscreen pass. Shader arithmetic and new audio allocation still have
device costs; software scene counts do not establish GPU speed or Safari memory
safety. Native decoded audio is 38.83 MiB at 48 kHz, within its 40 MiB allowance.

New benchmark spike records retain preceding/current callback CPU, draw,
triangle, shadow and shader counts independently of reservoir sampling. A long
rAF interval and either callback's CPU work remain separately labelled. Older
v1 exports, local saving and JSON export remain compatible.

## Reviewable evidence

- [All-weapon inspection and control validation](validation-inspection-browser.json)
  and [representative actual gameplay images](art-inspection/00-side.png).
- [Ground comparisons and scene deltas](validation-blacksite-ground.json),
  [before](art-ground-checkpoint/approach-before.webp),
  [after](art-ground-checkpoint/approach-after.webp) and
  [editable placement/material source](../authoring/BLACKSITE_GROUND.md).
- [Operator geometry profile](validation-release61-occlusion.json) and
  [matched frame/shadow validation](validation-release61-occlusion-browser.json).
- [Material warmup validation](validation-release61-warmup-browser.json).
- [Native audio decode/playback](validation-production-audio-browser.json),
  [ballistic playback and voice cleanup](validation-ballistic-audio-browser.json)
  and [actual spatial event audio preview](audio-contact-preview.m4a).
- [Combined regression, package and lifecycle results](validation-release61.json).

The warmup capture retains its original distribution fingerprint. The final
blade hand-target correction happened afterward and changed that fingerprint;
the aggregate validation records this narrow difference and the follow-up
weapon tests/capture. Renderer and shader sources were unchanged by that fix.

Physical Release 61 iPhone FPS, frame pacing, audio latency, memory pressure and
thermals remain unverified. The audio preview supports listening review; signal
generation/native playback do not establish premium realism. Skeletal character
animation, comprehensive environment/hero production, runtime texture residency
and the overall professional quality standard remain open in the checklist.
