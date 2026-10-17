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

Implementation is in progress. Record the completed runtime, source size,
benchmark provenance and permitted verification after integration. No Blender
or sound-bank rebuild is needed: native geometry, textures, static lighting,
audio and the packed editable Blender source are retained.

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
