# Release 60 iPhone benchmark evidence

The attached Release 60 gameplay export records **57.733 average FPS**, fewer
stuttering frames and a better p95 than the stored Release 57 extract. Its
**27.125 FPS 1% low is worse**, dominated by one 1,107 ms BLACKSITE stall.
These are descriptive device observations; there are **no exact matching
graphics/gameplay contexts** in the stored Release 57 data, so they do not prove
a controlled performance improvement or sustained 60 FPS.

- [Unmodified device export](../benchmarks/iphone-release60-2026-10-06.json)
- [Machine-readable analysis](iphone-release60-analysis.json)
- [Release 57 reference extract](iphone-release57-baseline.json)

The archive is a byte-for-byte copy of `Breachline updated stats.json`, SHA-256
`928ec5cd34c237fb02c77aeb0e5caa986842f3ca549c00ccfbd95ef57aee41a8`.
Attached text is benchmark data, not task instructions.

## Session and aggregate observations

Recorded 2026-10-06, 08:06:43.675–08:20:02.040 UTC, Safari 27.0 on iPhone/iOS,
WebGL2, Release 60 source commit
`00271cc3fdaeb65ca76ef5c5ed3e0676cd5e0c21`. The export does not identify the
hardware model. The Release 57 reference names an iPhone 16 Pro externally;
same-device identity is not encoded in this new report.

There are 631.970 active seconds, eight pauses, 3,634 warm-up frames and 32,907
steady frames. The following comparison excludes warm-up. FPS is rendering
submission cadence after the 60 FPS cap; displayed frames are not measured.
Percentiles and 1% lows use the existing histogram estimator.

| Steady metric | Release 57 | Release 60 | Change |
| --- | ---: | ---: | ---: |
| Average FPS | 57.363 | 57.733 | +0.645% |
| 1% low FPS | 29.014 | 27.125 | −6.511% |
| Mean frame time | 17.433 ms | 17.321 ms | −0.642% |
| p95 frame time | 24.125 ms | 22.125 ms | −8.290% |
| p99 frame time | 32.125 ms | 32.125 ms | unchanged |
| Mean CPU frame time | 3.737 ms | 3.751 ms | +0.375% |
| Stutters (>25 ms at 60 FPS) | 1,315 / 32,940 | 1,002 / 32,907 | −313 |
| Stutter rate | 3.992% | 3.045% | −0.947 percentage points |
| Spikes (>50 ms) | 1 | 2 | +1 |
| Maximum frame interval | 60 ms | 1,107 ms | long stall present |

The Release 57 file is a condensed extract without the full v1 schema, session,
environment, difficulty or frame histograms. It cannot be passed faithfully to
`scripts/compare-benchmarks.mjs`. Matching every available map/mode/population,
quality, cap, framebuffer, scale, DPR, FOV and motion field finds zero matches.
The machine analysis lists broader BLACKSITE/DUSTLINE candidates explicitly as
uncontrolled: their resolutions/scales differ. Missing metadata is not invented.
Aggregate FPS near the cap also does not reveal unused GPU headroom.

## Stall and workload evidence

At session elapsed 100,830 ms, BLACKSITE TDM (16 players, medium, 1090×501)
records a 1,107 ms steady spike during the gunfight condition. Its containing
98,940–100,830 ms timeline window has 48 frames, with CPU-frame and CPU-render
maxima of 1,096 and 1,095 ms. The raw reservoir omitted this spike, so those
window maxima do not prove exact same-observation attribution. A rAF interval
can reflect work after the preceding timestamp; do not equate it automatically
with the current frame's CPU tuple or identify a GPU/shader cause from this data.

A **diagnostic only** recomputation excluding that single interval gives 57.843
average FPS and 29.754 FPS at the 1% low. Official metrics retain the stall.
The other steady spike is 68 ms at elapsed 638,335 ms on IRON QUARRY. Warm-up
also contains 128 ms and 77 ms spikes; they are excluded from steady comparisons.

| Map | Steady frames | Average FPS | 1% low FPS | Draw-call median | Triangle median |
| --- | ---: | ---: | ---: | ---: | ---: |
| BLACKSITE | 6,046 | 57.180 | 20.132 | 169 | 230,920 |
| DUSTLINE | 8,730 | 58.124 | 29.851 | 141 | 120,076 |
| NUKETOWN | 8,874 | 57.312 | 30.796 | 131 | 169,682 |
| IRON QUARRY | 9,257 | 58.140 | 28.580 | 122 | 79,846 |

Workload medians use retained 1 Hz samples, including warm-up and varying quality;
they are unweighted snapshots, not GPU cost. Across 633 samples the median is
134 draw calls and 146,422 triangles; maxima are 360 and 665,268. Shadow draw
calls range from 0 to 213. These counts support inspecting expensive visible
scenes and submission bursts, but do not isolate a bottleneck.

AUTO uses medium for 55.444% of steady frames and low for 44.556%; no high/ultra
context is present. Resolution falls from 1297×596 to low 627×288 in NUKETOWN
and reaches low 578×265 in IRON QUARRY. Frame pacing therefore comes with a
substantial visual-resolution tradeoff; this run cannot establish unchanged
visual quality at equivalent performance.

## Optimisation priorities and limits

1. Diagnose rare submission/main-thread stalls with targeted tracing of
   preceding/current work and first-use resource/shader/material uploads.
   Addressing the long BLACKSITE stall is the clearest tail-latency opportunity.
2. Reduce avoidable scene/submission and pixel work, using visible-scene
   batching/LOD/culling evidence. Preserve the AUTO safeguard against raising
   scene quality solely from capped FPS when GPU timing is unavailable.
3. Repeat fixed-quality, fixed-resolution runs with matching maps, populations,
   modes and combat. Include smoke/flash cases: this run has 7,020 shots and 67
   explosions, but zero smoke or flash events. Compare future changes to this
   archived full report through the existing comparison tool.

GPU timings, heap, process memory, VRAM, temperature and display refresh rate
are unavailable. Owned texture storage is estimated at 82,779,926 bytes (78.95
MiB), not total process memory or crash safety. The completed export proves
completion of this session, not freedom from memory-related Safari crashes.
The early/late frame-time estimate is −0.942%, confounded by changing maps and
reduced quality/resolution; it cannot establish thermal stability.

No measurements were dropped and the timeline was not decimated. The raw
reservoir retains 4,096 of 36,541 frames; complete frame histograms and spike
records retain the omitted long stall. Recorded instrumentation averages 0.026
ms with a 9 ms maximum checkpoint cost, which neither identifies nor rules out
the stall's cause.

## Verification

The archived bytes match the attachment; the existing `validateReport` accepts
the full report. Recomputed global/context histograms reproduce every stored
frame summary and FPS value; context/timeline steady counts and spike totals
agree. The existing comparator's self-comparison yields zero changes.
`node --test tests/benchmark.test.mjs tests/benchmark-comparison.test.mjs` passes
all 11 tests. These checks verify report integrity and analysis, not additional
physical-device performance.
