# Release 71: first-person magazine exchange

18 October 2026. Continue from pushed Release 70 `41f252b`. The remaining reload
gap is a single magazine travelling out and back into the weapon. This scope
adds separate removed and replacement presentation components while retaining
the existing simulation and native asset library.

## Scope

Use constructor-time copies of the selected magazine and its attachments for
the 26 magazine-fed rigs. Breach 12, Bison 12, Field blade and Krait R retain
their shell, melee and cylinder mechanisms. Lynx's top loader and the two
covered belt boxes retain their family-specific extraction and contact timing.

The outgoing magazine is stowed during tactical reloads or departs during empty
reloads; a distinct incoming component is retrieved and seated. Hand targets
follow those components through the exchange. These are bounded first-person
presentation roles, with no discarded world inventory or gameplay ammunition
transfer before the existing reload completion.

Native proxies reuse existing magazine meshes, finishes and cloned anchors.
Fallback parts share the same pose sampler. First-person rendering opts in;
actor choreography and native export use the original model by default.
Fallback/operator cache keys also include magazine and ammunition selections.

## Integration status

Implementation is packaged as offline Release 71. The initial scope checkpoint
is `592ea52`; runtime source is `549139bdd6a508cce684638899c09ba40de8a5e0`.
No Blender or sound-bank rebuild was needed: native geometry, textures, static
lighting, audio and the packed editable Blender source have no Git diff.

The pure sampler derives poses and visibility from the existing reload phase,
without new timers, simulation RNG, ammunition updates or audio events. Every
animation call resets source and replacement transforms/visibility, including
menu suppression and cancelled/completed reloads. A released empty magazine has
a separate non-tumbling hand target. Tactical removal follows the stowed part;
the hand blends to the replacement before insertion and existing action cycles.

| Family | Extraction completes | Source hides | Replacement appears | Retrieval ends | Seats |
| --- | ---: | ---: | ---: | ---: | ---: |
| Standard and top loader | .34 | .45 | .47 | .58 | .74 |
| Covered belt box | .43 | .49 | .51 | .60 | .74 |

These are normalized animation phases, not device latency measurements. Existing
.64/.68 insertion and .74 seating audio contacts stay unchanged. Only one
magazine role is visible at once; the original returns at the same neutral pose
when the reload completes. There is no persistent discarded-world object.

Construction caches at most twelve replacement part objects, a source-index map,
rigid-group metadata and pose/contact state for the opted-in first-person model.
The added sampler and pose code do not construct objects per animation call.
Native aliases reuse existing mesh/material metadata; cloned core primitives
are excluded from the native accessory loop, while cloned attachments render.
The long-gun fast-mag loop now has the magazine tag and travels with its owner.

An independent source review covered eligibility, native anchors, hand indices,
visibility resets and cache invalidation. No additional runtime/visual checks
were run. Corrected fallback and actor template keys include magazine and
ammunition-type selections, avoiding stale selected attachment geometry.

| Package observation | Release 70 | Release 71 |
| --- | ---: | ---: |
| Game JavaScript modules | 83 | 84 |
| Uncompressed game JavaScript | 696,980 bytes | 703,465 bytes |
| Added phase sampler | — | 2,794 bytes |
| Compressed native library | 13,499,841 bytes | 13,499,841 bytes |
| Production materials/lighting | 67,319,376 bytes | 67,319,376 bytes |
| Packed editable Blender source | 172,093,782 bytes | 172,093,782 bytes |

The JavaScript increase is 6,485 bytes before host compression. These are static
package sizes and source bounds, not measured heap, GPU cost or iPhone FPS.
Benchmark provenance identifies that committed runtime and content fingerprint
`b51a9f2e2298901527b7cd312f2e1afef700f9bbb148e854ccd5a6fa597af36e`.
`npm run verify` passed once on the final runtime state: **74/74 core tests**,
zero failures, followed by the **88-module** packaging/offline check, geometry
winding, local assets and Home Screen manifest. See
[the recorded result](validation-release71.json). No additional suites, browser,
shader, asset-audit or profiling checks ran. The existing core suite does not
establish correctness, visibility or natural motion of every exchange path.

## Acceptance limits

Follow [the current verification policy](../AGENTS.md): run only
`npm run verify` once on the final runtime state, with the existing 74 core
tests and packaging/offline check. No additional browser, shader, asset-audit,
profiling or retired-suite checks are authorized by this continuation.

Actual native/fallback gameplay frames, natural finger grasp, professional
animation quality and physical iPhone performance remain unverified. Third-person
reloads, physical discarded magazines and world collision/landing sounds are
outside this first-person presentation scope. The full
[overhaul checklist](OVERHAUL_CHECKLIST.md) remains incomplete.
