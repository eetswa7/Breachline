# Release 65 spatial audio checkpoint

Recorded 13 October 2026. This completes the bounded browser 3D directional
path; premium audible realism and physical iPhone acceptance remain open.

World gunshots, steps/landings, surface impacts, ricochets, penetration exits,
casings, explosions and nearby remote weapon components now use native Web
Audio HRTF panners. Their source positions retain all three game coordinates.
The listener receives the player's gameplay eye position and full yaw/pitch
frame every gameplay audio batch, including empty batches while existing tails
play. Yaw zero faces world −Z, +Y is up, and positive pitch looks upward. The
pitched head-up vector agrees with the camera's view basis. Camera bob, visual
recoil and death-camera offsets remain presentation effects; audio follows the
gameplay eye and aim.

Player muzzle, boots/landings, reload/handling and UI cues keep their immediate
stereo/direct path, centered at every player yaw. A player's bullet contacts
still originate at the struck world surface. No propagation delay, audio timer
or per-voice position update
was added. Each emitted source remains at its emission/contact position while
the moving listener updates. The existing manual distance gain, cover loss,
distance/cover low-pass filter and short component envelopes remain active.
Native `rolloffFactor` is zero and the source cone is omnidirectional, so HRTF
does not apply a second distance/cone attenuation. Shared room/hall wet sends
still originate after the manual gain/filter and before the dry panner.

Ambient voices remain capped at 16 and total voices at 24. Important player
cues can replace an ambient tail at capacity. Natural completion, replacement,
foley cancellation and pause disconnect the corresponding native graph through
the same idempotent cleanup. Pause now performs that cleanup immediately before
suspending the context, including when a native `ended` callback arrives later.
No new decoded recordings, sample copies or shared convolvers were introduced.
Live listener poses write intrinsic AudioParam values, avoiding a stream of
scheduled automation events through a long match.

Modern AudioParam positions/orientation and legacy Safari listener/panner
setters are supported. A missing listener, unavailable HRTF, rejected HRTF
configuration or absent native world-position setter keeps existing stereo
azimuth playback; browsers lacking StereoPannerNode keep direct playback.
The legacy paths have automated coverage, but no physical Safari listening or
performance result is claimed.

## Evidence

- [Native Chromium validation](validation-spatial-audio65-browser.json): actual
  running AudioSystem events reached 16 ambient / 24 total sources, with 24
  native world panners and an immediate local stereo muzzle. Empty batches
  changed native listener eye/yaw/pitch; priority replacement and pause released
  all inspected source/panner graphs. Context pause reached `suspended` with
  zero voices/sources.
- [Stereo listening reel](art-release65/spatial-audio-preview.m4a) and
  [segment timings/provenance](art-release65/spatial-audio-preview.json): the
  same shipped mono `shot0` recording appears in front, back, above, below,
  left and right, then in three equivalent head-rotation/pitch cases. Use
  headphones. This 10.44-second isolated reel uses the native browser HRTF,
  equal fixed gains, 350 ms preroll and no loudness normalization. It isolates
  direction from the unchanged manual distance/cover law.
- Actual OfflineAudioContext stereo PCM distinguished front/back (normalized
  waveform RMS difference **0.6431**), above/below (**0.4001**) and left/right
  (**1.3771**). Head half-turn, quarter-turn and upward-pitch equivalents
  matched their corresponding reference with **1.0 correlation** in all three
  cases. Left/right near-ear RMS ordering was correct, and every
  rendered sample was finite.
  The validator fails if directional output collapses or rotations disagree.
- [Spatial tests](../tests/spatial-audio.test.mjs) compare the listener basis
  against the actual renderer's `lookAt` basis over full yaw/pitch quadrants;
  exercise modern/legacy positions, all world/local event families, explicit
  unsupported-HRTF fallback, centered real player emission positions at every
  yaw, manual gain/filter and wet sends, voice bounds, natural/forced cleanup,
  foley cancellation and immediate pause cleanup.
  The focused audio/game regression run passed 48 tests after integration with
  component onset trimming and the local-source centering correction.
- [Reproducible validator](../scripts/check-spatial-audio-browser.mjs) records
  source commit, working-tree dirtiness, runtime SHA-256 hashes and browser
  version. The final native gate tested committed Release 65 runtime at
  `bb095df941e6c1a21a451e102060377991766263`, built from implementation
  `e75eeed`. The runtime was clean; the report's overall `sourceDirty: true`
  records pending checklist/documentation/evidence files. Runtime hashes
  identify the exact tested audio implementation. Chromium 154.0.8037.57
  rendered the 44.1 kHz stereo reel.

## Remaining limits

Browser HRTF creates binaural direction; individual front/back/elevation
perception varies with headphones and listeners. The reel and waveform checks
establish native output differences and coordinate consistency, not premium
subjective realism. Shared wet responses are still simplified room/hall
approximations, without directional reflected-ray acoustics. Emitters and the
manual attenuation/filter remain sampled at the original event time. No
physical iPhone CPU/audio cost, thermal behavior or headphone/Safari listening
result is available; desktop browser evidence must not be relabelled as one.
