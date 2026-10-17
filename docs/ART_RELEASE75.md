# Release 75: listener stance and raised debris contacts

18 October 2026. Continue from Release 74 `aa0aeaf`.

## Source gaps and changes

HRTF already uses `Game.eye`, but audio cover rays originated at a fixed 1.55 m
above the player's feet. Standing/crouched ears are 1.66/1.00 m; crouching behind
an existing 1.3 m barrier could therefore leave the audio ray above cover.
Distance and the early moving-tail refresh trigger also used the feet.

One batch eye snapshot now supplies HRTF, event and tail distances, ray origins,
and stored refresh positions. `Game.eye` and the existing height-based fallback
remain available to legacy callers. Source endpoints/height offsets, local cues,
eight-ray budget, four-tail refresh cap, short-clip policy, 25 ms gain/filter
slew, voices, nodes, decoded bank, cancellation and Safari paths remain.

Hard impact/explosion particles previously stopped only at world `y=.025`.
Their downward motion now checks actual raised collision tops and cached thin
finishes at the interpolated crossing point. Exact point footprints avoid the
actor-radius expansion of `Arena.floorAt`. Resting debris rechecks support and
falls when it leaves an edge or the owner is destroyed. Existing nearby buckets
and at most four finish cells cover normal frame-step travel; larger collision
travel uses the existing block-list fallback. Soft gas keeps its prior behavior.

The 200-slot hard/soft pool, quality caps, expiry, arena resets, pause handling,
shared draw/resources, events/audio and random sources remain. New local queries
add unmeasured CPU work. Contacts are cosmetic points against horizontal tops,
not side walls, undersides or native triangle collision; no bounce physics is added.

Independent source reviews found no actionable listener or contact-path issues.
No tests beyond the required final command or actual gameplay/listening evidence
are claimed. Follow [AGENTS.md](../AGENTS.md): only one final `npm run verify`
with 74 core tests and packaged/offline checks. Professional quality, full effect
appearance and physical iPhone costs remain open in the
[overhaul checklist](OVERHAUL_CHECKLIST.md).
