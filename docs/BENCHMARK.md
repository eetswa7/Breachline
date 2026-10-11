# Benchmark Mode, release 57

1. Open Breachline in Safari on your iPhone in landscape.
2. Settings > Benchmark Mode ON.
3. Play normally for about 10 minutes, on any map, weapon or game mode.
4. Pause > BENCHMARK OFF, or switch it off in Settings.
5. Settings > EXPORT JSON. Attach the downloaded file in ChatGPT for analysis.

Recording, saving and export work locally, including offline. No additional
account or setup is needed. The small top-right indicator shows recording,
active time and current FPS. Graphics, assets, gameplay and existing settings
are preserved.

## Saved reports

Turning recording off saves the complete JSON on the device. Settings' saved
benchmark selector lets you export previous sessions independently. Twenty
reports can be retained; when full, export a report and use REMOVE SAVED REPORT
to free a slot. Removal requires a confirmation. Reports are never silently
pruned, and initiating a download does not remove its saved copy.

The separate benchmark database preserves existing measurements during this
update and removes obsolete setup records. Career progress and settings remain
in their existing storage. Recording is OFF after reload. An interrupted session
recovers its last 60-second checkpoint, marked `interrupted`. Up to 60 seconds
before an abrupt crash may be absent. Safari storage eviction/clearing and private
browsing can lose local data, so export each recording you intend to keep.
Storage errors are shown; the latest report stays exportable while the page
remains open. Menus, pauses, loading and hidden pages do not create gameplay frames.

## Build provenance and format

Reports retain the `breachline.benchmark.v1` schema, unique random session ID,
release, timestamps, duration, graphics/map contexts and raw sampled observations.
They omit player names, full user agents, account details, device identifiers,
coordinates and unmasked GPU fingerprinting. Safari's exact hardware model is
unavailable; the test device is known to you externally as an iPhone 16 Pro.

`scripts/benchmark-build.mjs` hashes all distributed files except its own manifest.
For a committed build it records the source revision that contains those files,
with `commit_resolution: source_commit`. A subsequent manifest-only commit does
not change the recorded game code or content fingerprint. For uncommitted local
code the commit is null and the fingerprint is retained, labelled
`content_fingerprint`; no commit identifier is invented.

Release procedure:

```sh
node scripts/release.mjs 57
npm test
npm run check
# Commit and push the game source, then stamp its committed revision:
node scripts/benchmark-build.mjs
# Commit and push the generated manifest, then publish the same dist/ files.
```

## Measurements

| Field | Meaning |
| --- | --- |
| Average FPS | Count divided by the sum of actual submitted-render intervals. Exact from the observed intervals, after the game's FPS cap. |
| Median FPS / 1% low | Histogram estimates. 1% low is the reciprocal of the mean of the slowest ceil(1%) intervals. |
| Frame percentiles | Estimates from fixed histograms: 0.125 ms bins below 64 ms, 0.5 ms below 256 ms, 2 ms below 512 ms, exponential bins above. All observed frames contribute, including long stalls. |
| CPU frame / render | Main-thread wall time for input, simulation, HUD and renderer submission; existing profiler render time is separately reported. These do not establish CPU utilisation. Canvas render timing is unavailable. |
| GPU | Existing asynchronous WebGL2 timer queries every 12 rendered frames, tagged with their issue context/phase. Unsupported and disjoint samples remain unavailable; no blocking waits or GPU readback. |
| Rendering | Three.js draw calls, triangles, textures and geometries sampled at 1 Hz. Main world/viewmodel calls and shadow draw calls are separate; total shadow passes remain unavailable. Canvas draw operations have their own field. |
| Memory | Owned-texture byte estimate and optional JS heap estimate, clearly labelled. Process memory, total VRAM, temperature, battery and display refresh rate are unavailable. |
| Graphics / resolution | Actual framebuffer, DPR, scale, requested/effective quality, configured/effective caps, FOV and motion. Dynamic resolution changes create separate contexts. |
| Gameplay | Map, mode, difficulty, population and observed combat counts. Overlapping movement/gunfight/explosion/smoke/interior/dead labels describe steady play. Interior/population are checked at 1 Hz. |
| Extended gameplay | First/last thirds of steady windows estimate degradation. Changes in maps, settings, combat and resolution are confounders; this does not establish thermal throttling. |
| Raw frames | Uniform reservoir of 4,096 actual observations, sorted by time, and up to 4,096 GPU samples. The independent benchmark RNG does not alter simulation randomness. |

Each match has 15 active seconds of warm-up, separate from steady measurements.
Intervals crossing that boundary use their starting phase. A significant spike
exceeds max(50 ms, twice the effective cap budget); a stutter exceeds 1.5 budgets.
Pausing primes the clock on resume rather than counting a background gap as a stall.
Safari rendering cadence cannot prove every frame was displayed by the compositor.

New reports retain optional `spikes[].frames.preceding` and `current` observations
outside the random raw-frame reservoir. Each contains its callback timestamp,
CPU/frame submission time, weapon and draw/triangle/shadow/shader counts. The
preceding callback's work can delay the current callback; the current CPU sample
measures work after that callback begins. These are separate observations, not a
claim that either caused the interval. Shader-count changes help investigate
first-use compilation but do not measure compiler time. Both observations remain
bounded by the existing 512-spike limit. Older v1 exports without them still
validate, including the archived Release 60 iPhone report.

Limits: 64 contexts, 720 timeline/render samples, 512 transitions/spikes and two
active hours. Overflow is counted and labelled. Global histograms include all
frames even after raw storage fills. Statistics include the recorder's overhead;
`instrumentation` reports timing overhead and checkpoint costs. Disabled recording
attaches no GPU listener and collects no frame data. JSON formatting runs only
when saving a checkpoint, finalising or explicitly exporting.

## Optional repeatable stress test

From the menu with recording OFF, press AUTOMATED STRESS TEST. A separate seeded
TDM simulation uses the selected map/difficulty/loadout, with fixed-step camera
sweeps, movement, combat and actual scripted cosmetic rendering effects. Its JSON
is labelled `scripted`, separate from normal `gameplay` data. The original game
object is restored after completion/cancellation; career progress is not awarded.
AI, physics and weapons retain their normal behaviour.

The sequence is 180 simulation seconds, so slower devices take longer in wall
time. Match completion can end it early and is marked incomplete. Backgrounding
or pausing suspends it. STOP TEST cancels it safely. Scripted effects are declared
workloads, never fabricated frame measurements. Compare matching scenario,
seed, completion, ticks, loadout, map, difficulty, cap and graphics.

## Analysis and checks

Attach the exported JSON files in ChatGPT. Reports can be analysed independently
or compared between releases. The offline comparison tool excludes warm-up and
matches map, mode, population, quality, caps, framebuffer, DPR, scale and FOV:

```sh
node scripts/compare-benchmarks.mjs baseline.json candidate.json
npm test
npm run check
node scripts/check-benchmark-browser.mjs
```

A cap-limited result does not reveal unused graphical headroom. Review combat
conditions, activity and timeline alongside averages, and compare multiple
sessions with similar conditions.

Unit-test clocks are synthetic. Desktop Chromium browser checks use software
WebGL and a mobile viewport; they validate recording, local storage, actual JSON
downloads, reload recovery, migration and offline startup. Neither represents
actual iPhone/Safari performance. Browser-check metadata is in
`docs/validation-release57-benchmark-browser.json`. No synthetic reports are stored
under `benchmarks/`. Optional `BENCHMARK_TEST_BROWSER` selects a local Chromium
executable; `BENCHMARK_TEST_ORIGIN` selects an existing preview, otherwise the
browser check starts and stops its own local preview.
