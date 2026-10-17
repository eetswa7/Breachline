# BREACHLINE asset provenance

| Asset | Source and production | Attribution |
| --- | --- | --- |
| Architecture, ground, equipment and natural diffuse sheets | Original artwork generated for Breachline with OpenAI ImageGen; four retained PNG inputs plus original road-surface and weapon-steel replacement sheets | No third-party asset pack used |
| Physical texture maps | Native Blender shader graphs and Cycles bakes; source luminance supplies approximate macro relief | Editable source in `authoring/blender` |
| Environment, weapon and operator meshes | Original native modelling in the repository's Blender definitions; exported with their existing gameplay rig contracts | Editable definitions and packed `.blend` retained |
| Ground irradiance | Cycles baking of the native level assemblies, 32 samples, direct and indirect diffuse, RGBM encoding | Editable baking script and packed images retained |
| New gunfire, actions, boots, impacts and explosions | Original deterministic sound designs, rendered to PCM and mastered before AAC encoding | Editable source in `authoring/audio`; no third-party samples |
| Sky, foliage and auxiliary effect imagery | Retained Release 57 baseline artwork, packed in the existing Blender pipeline | Retained history; not relabelled as newly created assets |
| Three.js and gzip fallback | Existing vendored dependencies | Licence files retained in `dist/vendor` |

Release 69's open-skid diesel generator is original construction in
`authoring/blender/environment_models.py`, with both native LODs and all level
instances retained in the packed editable source. Its existing shared finishes
are reused; five affected ground-lighting maps are fresh Cycles bakes. No
third-party machinery model, image or texture was introduced. See
[construction and remaining acceptance limits](ART_RELEASE69.md).

Release 70's four semiautomatic pistol magazine bodies, feed lips, followers,
stepped floorplates and attachment shapes are original definitions in
`weapon-models.js` and `authoring/blender/hero_models.py`. The packed editable
source retains the new hollow native bodies and witness ports. Existing
material bakes, lightmaps and original attachment-sound families are reused;
no third-party model, texture or recording was added. See
[pistol construction and acceptance limits](ART_RELEASE70.md).

Release 71 introduces original first-person phase/rig code in
`reload-components.js` and `weapon-models.js`. Replacement proxies share the
existing original native meshes and materials. No mesh, texture, lightmap,
recording or packed Blender source payload changes; see
[magazine exchange implementation and limits](ART_RELEASE71.md).

The diffuse sheets are generated artwork, not measured photographs or
photogrammetry scans. Normal maps are art-directed approximations. No Delta
Force, Arena Breakout or Call of Duty model, texture or sound was downloaded or
copied for this overhaul. The retained map named Nuketown predates this release;
its existing game layout was preserved, and no commercial map asset was imported.

No external account, texture CDN, audio hosting service or runtime asset licence
key is required. All new runtime media and the editable source are committed.
