# Release 61 overhaul continuation

This checkpoint continues the complete [overhaul checklist](OVERHAUL_CHECKLIST.md)
from Release 60. It completes specific missing systems and makes visible
Blacksite and animation progress. The complete professional graphics/audio
standard and physical iPhone acceptance remain unfinished.

Blacksite now has a purpose-built industrial gable and recessed ventilation,
metal upper-wall sheets, supported roof equipment, and poured loading surfaces
with joints, chipped edges and feathered tyre wear. Native editable geometry,
all sixteen Cycles ground-lighting bakes and required segmented runtime assets
are preserved. The matched approach adds 2.4% selected world triangles and six
world batches; estimated texture storage is unchanged. See the
[matched wider frontage](art-release61/comparison-blacksite-forecourt.webp),
[close approach](art-release61/comparison-blacksite-approach.webp),
[interior](art-release61/comparison-blacksite-interior.webp) and
[Blacksite production evidence and limits](BLACKSITE61.md).

All weapon families now have cancelable two-sided inspection through touch,
keyboard and controller input. Weighted firing recovery, turning/landing inertia
and the blade attack preserve exact fully aimed alignment and gameplay recoil.
Native temporal frame review corrected an initially weak second-side inspection
arc. The [motion gallery](art-release61/contact-weapon-motion.webp) and
[weapon validation](WEAPON_MOTION61.md) retain actual gameplay images and limits.
The existing coarse construction and rigid hands have not reached the requested
professional weapon/hand standard.

The existing efficient character rig has revised support/swing cycles, stance
and aim blending, landing compression, hit recovery and a knee/chest death fold.
Body, sleeves, equipment and native/fallback carried weapons share the same
presentation transform; gameplay capsules and ballistics remain unchanged.
Deaths also advance in modes without respawns. The
[character poses and evidence](CHARACTER_MOTION61.md) retain the half-second
lifetime, original rigid anatomy and explicit limitations. This is not a new
skinned-human animation or ragdoll system.

Dedicated ricochet and penetration audio now follow actual cover events;
ricochet cues are cosmetic and do not introduce reflected damage rays. Cases
share visible flight/landing positions with material-specific foley. Forty-four
editable original takes bring the bank to 408 recordings. Browser decoding,
voice limits and cleanup pass. The [audio evidence and listening reel](BALLISTIC_AUDIO61.md)
make the exact shipped sounds reviewable; premium audible realism and physical
Safari latency remain unverified. Revolver reload dumping and complete hull
recordings remain unfinished.

## Validation and preservation

The final suite passes **340 regressions**, the **78-module** packaged/offline
check and **50 shader variants**. All sixteen maps render without errors; 26
weapon and 23 character temporal frames were reviewed. The real booted browser
passes keyboard/touch inspection, cancellation, offline boot, saved reports and
JSON downloads. [Aggregate evidence](validation-release61.json) retains the exact
validated build. All results are
software/browser, native-source or scene evidence; none are physical iPhone data.

- [Live controls, offline boot and benchmark JSON export](validation-release61-benchmark-browser.json)
- [Native Blacksite topology, source and budgets](validation-blacksite61-native.json)
- [Weapon temporal rendering and ADS alignment](validation-weapon-motion61-browser.json)
- [Character temporal posing](validation-character-motion61-browser.json)
- [Native audio decoding/playback](validation-ballistic-audio61-browser.json)
- [GLSL ES compile/link](validation-release61-shaders.json)
- [Gameplay image manifest and matched scene counts](art-release61/manifest.json)

Thirty weapons, sixteen maps, eleven modes, progression, movement, collision,
AI and ballistics remain. The complete offline shell advances together to 61.
Benchmark recording, saved reports and JSON export remain available for the
next real iPhone report. The recovery ref `release57-baseline` stays at
`454a5a26a8418fa8db1d3cc1ec197f7e56c56415`.

Lower-wall/ground repetition, sparse landscape, dark simplified interiors,
coarse weapon and character forms, broader reload choreography, natural
skeletal animation and premium sound quality remain open. These shortcomings
are recorded in the checklist; feature implementation, image inspection and
passing software tests do not establish completion of the whole overhaul.
