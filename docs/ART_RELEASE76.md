# Release 76: cover-material acoustic response

18 October 2026. Continue from Release 75 `068caf1` and its stance-correct ears.

## Implementation scope

Audio previously reduced every blocked ray to the same gain multiplier and
low-pass coefficient. A shared `coverResponse` now uses the existing-budget
`Arena.trace` from ear to the raised source endpoint, with the same normalized
direction, length and .12 m tolerance as `Arena.visible`. The nearest retained
collider selects a frozen authoring profile. Missing trace support falls back
to `visible` and the original generic response; unknown ownership stays generic.

| Authoring profile | Gain multiplier | Low-pass coefficient |
| --- | ---: | ---: |
| Generic legacy | .48 | 1600 Hz |
| Wood | .58 | 2400 Hz |
| Explicit shell thickness ≤ .01 m | .40 | 1800 Hz |
| Concrete/stone/rock/limestone/tiles | .24 | 1000 Hz |
| Future actual glass collider | .72 | 4200 Hz |

These are unmeasured design coefficients, not physical transmission measurements.
The existing distance denominator and 600 Hz filter floor remain. Hollow cargo
and car skins use their authored shell tag; the full gameplay AABB depth is not
interpreted as solid metal. Boolean/default gain and filter callers retain the
exact legacy law through optional trailing profile arguments.

Initial playback and moving-tail gain/filter use the same response. The existing
boolean cache remains, with at most eight shared response references beside it;
legacy hand-built caches retain generic behavior. One query per uncached source,
eight rays and four tail refreshes per batch, 25 ms smoothing, short-clip policy,
voice priority/caps, cancellation, HRTF/Safari fallback and decoded data remain.
No extra audio nodes, impulses, recordings or runtime account dependencies.

The first authoritative blocker is an asymmetric approximation. Layered cover,
diffraction, reciprocity and physical transmission remain unmodelled. Existing
glazing is decorative/native and absent from collision: the future glass profile
does not establish window transmission or cosmetic-glass destruction acoustics.

Independent source review found no concrete defect in trace/visibility matching,
initial/tail profile flow, boolean compatibility or resource bounds. Follow
[AGENTS.md](../AGENTS.md): only one final `npm run verify`, 74 core tests plus
packaged/offline checks. Actual listening, professional quality and physical
Safari costs remain open in the [overhaul checklist](OVERHAUL_CHECKLIST.md).
