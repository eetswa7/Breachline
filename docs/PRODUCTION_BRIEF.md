# Production objective restored on 5 October 2026

Read [the overhaul checklist](OVERHAUL_CHECKLIST.md) when resuming this work.
It records the full thirteen-section audit, completed requirements and remaining
partial, incomplete or unverified work. Update its checkboxes with evidence as
requirements are completed in future sessions.

The user authorizes a complete graphics and audio production overhaul of
BREACHLINE, including frequent pushed usable checkpoints and deployment. The
goal is a dramatic, immediately visible increase in realism and production
quality across the complete game, with Blacksite establishing the initial
standard. The visual direction references modern mobile military shooters;
commercial reference-game assets must not be copied.

Judge actual gameplay renders, including exteriors, interiors, combat, operators,
weapons and reloads. Replace weak assets and materials rather than adding tiny
details to inadequate primitive models. Use editable Blender modelling, UVs,
PBR graphs and native bakes. Higher justified asset downloads are authorized.
Do not declare completion from export, test counts or shader compilation alone.

Retain all 16 maps, 30 weapon rigs, modes, AI, collision, movement, ballistics,
progression, controls, Safari portability, offline functionality, Benchmark Mode
and manual JSON export. Keep runtime assets in the repository and deployment,
keep native sources editable, and preserve `release57-baseline`.

The physical iPhone 16 Pro Release 57 reference is in
`iphone-release57-baseline.json`: approximately 57.4 average FPS, 29 FPS at the
1% low, 17.4 ms mean frame time, 3.74 ms mean CPU frame and 1,315 stuttering
frames. Safari GPU timing was unavailable and adaptive quality/resolution
changed. CPU spare time does not establish GPU headroom. Aim for comparable or
better practical performance, responsive controls, bounded memory and sustained
60 FPS through efficient LOD, batching, compressed mipmaps, baked illumination,
limited overdraw and adaptive quality. Browser/software/scene results are never
physical iPhone measurements. A new exported device report is needed to measure
the changed art on actual hardware.

Audio should have distinctive pressure-led weapons, convincing mechanical
details and foley, material-specific movement/impacts, distance/occlusion and
room-dependent acoustics. Original synthesis is authorized; third-party sources
require appropriate licensing. Preserve playback latency, player priority and
bounded polyphony. Work autonomously and continue visual review after every
substantial integrated checkpoint.
