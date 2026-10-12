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

## Gameplay presentation checkpoint

- Thirty weapons now support two inspection angles and an eased return to ready.
  Touch has an INSPECT button; keyboard uses I; the controller uses D-pad left.
  Fire, ADS, reload, switching, equipment, interactions and traversal cancel
  inspection immediately. Inspection changes no ammunition or combat timers.
- Weight-dependent recoil and turn/travel springs add shoulder lag and recovery.
  Fully aimed sights remain centred through all thirty weapons/seven optics;
  ballistic recoil remains simulation-owned. Reduced-motion settings suppress
  the new angular shake.
- Operators blend direction, run readiness, crouch and ADS; contact feet stay
  planted through the stance interval instead of skating. Equipment, hands and
  close carried guns share leaned mounting. Hit/death motion now has staged
  buckling and settling. Native human skinning and professional motion quality
  remain unfinished; final image review is still in progress.
- Dedicated grazing ricochet and penetration events use original material cues.
  A fixed 32-body casing pool shares visible and audible landing contacts, with
  mechanism delays, extraction cancellation and seven landing families. It
  preserves simulation randomness and the existing damage/penetration result.

Seventy-one focused input/presentation/audio checks and static/offline checks pass on
the isolated source checkpoint using the existing Release 60 native library.
The independent [176-scenario preservation review](validation-release61-gameplay-preservation.json)
covers every map/mode combination for 180 mixed-input frames; it is short
software simulation coverage, not exhaustive gameplay or device acceptance.

Native Chromium playback at [44.1 kHz](validation-release61-audio-browser.json)
and [48 kHz](validation-release61-audio48-browser.json) decodes all 416 original
takes, invokes all thirteen new cue keys, respects the 24-voice cap and cleans up
all sources. At 48 kHz, decoded PCM is 38.92 MiB. Decode/playback proves the
functional audio system; premium audible quality still requires listening.

The corrected Blacksite native facade is a separate art checkpoint. The first
actual render review caught section-winding artefacts and incorrect lower-wall
texture routing; that artwork is being corrected before integration.
