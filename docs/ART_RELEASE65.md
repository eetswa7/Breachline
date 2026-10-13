# Release 65: reviewed effects, contact timing and spatial direction

This continuation finishes the unfinished Release 64 browser/evidence work,
repairs its unreachable native facade glazing, and adds the open spatial-audio
feature from [the thirteen-section checklist](OVERHAUL_CHECKLIST.md).
The full professional art overhaul and physical iPhone acceptance remain open.

Release 65 is published at https://breachline.eetswa.chatgpt.site with the
existing private audience. [Deployment provenance](deployment-release65.json)
links the pushed GitHub source, exact Sites source/archive and successful
publication to the validated runtime fingerprint.

## Actual gameplay effects

Native gameplay images show a short world-space pressure rim and lifted dust
from a real thrown grenade, upright flames after an authored fuel barrel is
destroyed, and progressive cracks on existing native window glazing:

- [Grenade pressure front](art-release64/grenade-front-067ms.png) and
  [later dust](art-release64/grenade-front-250ms.png).
- [Barrel aftermath at one second](art-release64/barrel-aftermath-1s.png),
  [four seconds](art-release64/barrel-aftermath-4s.png) and
  [fade](art-release64/barrel-aftermath-fade-10p5s.png).
- Old Quarter [intact](art-release64/glass-map0-intact.png),
  [first hit](art-release64/glass-map0-first-hit.png) and
  [repeated hits](art-release64/glass-map0-progressive.png).
- Blacksite [intact](art-release64/glass-map14-intact.png) and
  [repeated hits](art-release64/glass-map14-progressive.png).

These are unmodified 844 × 390 frames of the shipped native renderer in
Chromium/SwiftShader. The seeded fixtures use actual Game equipment physics,
barrel destruction and shot events, with bots removed to isolate effects.
The [browser record](validation-effects64-browser.json) documents placement,
timelines, quality limits, pause, round/map resets and disposal. The `effects64`
directory names identify the feature stage; each record identifies the actual
runtime release and source hashes used for the final integrated capture.

The visual review finds the expanding rim, upright flame and small spider
fracture readable in gameplay. The crack pattern remains stylised and flames
are planar procedural silhouettes. The pictures retain the existing dark,
repetitive architecture and coarse weapons. They establish visible incremental
effects, not premium overall realism or polished commercial-game effect quality.

## Glass correctness and preservation

The original Release 64 code intersected only the stopped bullet segment.
Generic building collision lies in front of its inset native glazing, so those
panes could never crack. The fix records the actual final unpenetrated collider
on the shot event. A cosmetic contact may project into that collider's own
glazing only when the bullet ends on its entry face, its face normal matches,
the contact is inside the pane, and the inset is at most eight percent of the
collider depth and 1.2 metres. Identity/prototype ownership is required;
matching dimensions are insufficient. Unrelated cover, actor hits and
penetrated layers cannot create an inset contact.

Bullet endpoints, penetration, damage, collision, original panes and open
combat apertures remain authoritative. Cracking does not remove glass or open
a route. [Native facade and foreground-cover regressions](../tests/glass-damage.test.mjs)
exercise actual Game shots on Old Quarter, Crossfire District and Blacksite.
The source repair is `1314646`; the effects implementation remains traceable
to `45295a84b2eaba1a264bf247df81cc7ba843bde4`.

## Reload audio and three-dimensional direction

Component cues follow the actual magazine, shell, feed-cover, cylinder and
charging timelines. Native review found up to 161 ms of leading silence in
selected recorded regions. The final playback trims cached PCM onset while
retaining a short preroll and edge ramp; native buffers and their original
recordings are unchanged. The maximum decoded-sample onset is 2.018 ms using
the validator's −80 dBFS amplitude threshold; this is clip silence, not measured
speaker/headphone or Safari playback latency.
[Reload timeline and native-region evidence](validation-component-foley64-browser.json)
and the [component listening reel](art-release64/component-foley-preview.m4a)
retain the measured offsets, finite signal checks and cancellation results.

World gunfire, steps, contacts, casing landings, explosions and remote handling
use a native HRTF panner with full X/Y/Z position and yaw/pitch head orientation.
Player muzzle, boots and handling stay immediate and centred. The existing
distance gain, occlusion filter, shared room responses and voice priorities are
retained; native rolloff is zero to avoid applying attenuation twice. Unsupported
HRTF/listener APIs retain stereo/direct playback. Pause now disconnects active
graphs immediately, including when the audio context suspends before native
`ended` callbacks. See [implementation and directional evidence](SPATIAL_AUDIO65.md).

Browser PCM distinction and listening reels make the output reviewable. They
do not establish perceptual localisation for every listener, premium audible
realism, physical Safari latency or sustained device performance.

## Cost and remaining acceptance

The effects use at most one draw each for shock, fire and glass, with fixed
pools: six pressure fronts, six fires and 24 damaged panes/two stamps each.
Low quality submits at most two fronts and two fires/six fire quads. The effects
add no texture, shadow, light or full-screen pass. The complete
[52-program shader gate](validation-release64-shaders.json) passes including
the exported fire and shock programs; actual native images separately exercise
the fracture program.

Spatial audio adds one bounded native panner to active world voices, within the
existing 16 ambient/24 total voice limits, and no new audio recordings, timers
or asset downloads. HRTF processing has a device cost that remains unmeasured.
Scene counts, software timings and decoded-byte estimates are not iPhone FPS,
process memory, latency or thermal measurements. All 16 maps, 30 weapons,
11 modes, large-map 40-player rosters, editable native source, offline assets,
Benchmark recording/export and the Release 57 recovery ref are retained.

The [integrated validation record](validation-release65.json) records final
source provenance and checks. All 384 regression tests and the 83-module,
local-asset, geometry and Home Screen shell check pass. The final native effects
gate passes all 25 checks across 18 images; native component verification covers
58 reload timelines, 367 events and 191 selected regions. The final spatial
gate distinguishes front/back, above/below and left/right output and matches
three equivalent head rotations with 1.0 correlation.

Environment composition/material repetition,
natural skeletal animation, premium hand anatomy, broader occlusion/streaming,
professional visual/audio acceptance and physical iPhone 16 Pro performance
remain open in the checklist.
