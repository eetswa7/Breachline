# Release 61 overhaul continuation

Work continues from the Release 60 audit. The full professional art/audio target
and physical iPhone acceptance remain open in [the checklist](OVERHAUL_CHECKLIST.md).

## Effects checkpoint

Explosions now have a world-horizontal, depth-tested expanding dust front, a
short hot core, outward debris and longer rising smoke. The front shares the
existing instanced effect shader: no additional draw or full-screen pass.
Each explosion emits 15 particles on Low and 27 on other tiers, replacing 30.
The dust front expires after 0.48 seconds; existing fixed pool capacities remain.

The two targeted regressions pass, including finite-input rejection, airborne
blast height, lifetime/expansion and quality bounds. All three offline effects
GLSL ES shader variants compile/link. Actual temporal gameplay review follows
the integrated native-art rebuild; these checks do not establish visual quality
or physical iPhone performance.
