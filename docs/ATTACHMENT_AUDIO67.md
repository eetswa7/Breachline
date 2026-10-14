# Magazine attachment contacts — Release 67

Updated 14 October 2026. Fast, extended and drum magazine attachments now select
their own original extraction, manipulation/insertion and seating recordings at
the existing moving-component reload crossings. Stock latches, feed covers,
belts, bolts, slides, shells and cylinders retain their weapon-specific cues.
This is a bounded functional improvement. The full attachment handling and
premium audible-realism checklist requirements remain **Partial**.

## Runtime and original source

- [`attachment-audio.js`](../dist/js/attachment-audio.js) selects nine compact
  contact designs, with two native AAC variations apiece. An attachment contact
  replaces one existing playback voice; it does not layer another voice over it.
- [`weapons.js`](../dist/js/weapons.js) carries the selected magazine and handling
  slot on the actual component event. The reload phases, duration modifiers,
  reserve accounting and ammunition refill are unchanged. The 53 focused
  attachment/audio/component/reload/spatial/ballistic regressions passed.
- Routing follows the visible fast-tab, extended body and drum geometry on
  compatible moving magazine, top-magazine and belt-box components. The retained
  handling-slot extended magazine is covered. A drum takes precedence over that
  extension; an extension takes precedence over a fast tab when both are present.
- [`attachment-foley.json`](../authoring/audio/attachment-foley.json) and
  [`attachment_foley.py`](../authoring/audio/attachment_foley.py) are editable
  deterministic original sources. They generate noise-led body/rub contacts,
  short mechanical ticks and quiet modal detail without sampled recordings or
  third-party assets. Each take is 58 ms before encoding; the compact design
  respects the existing decoded-memory allowance. Responsive startup synthesis
  provides the same families before native decoding completes.
- Existing player priority, 16 ambient/24 total sources, immediate local playback,
  positional remote acoustics, the three-remote-contact batch limit, 18 m foley
  cutoff, per-weapon cancellation and pause cleanup apply to the new cues.

The rebuild preserved every original encoded recording and its offset/mastering
metadata byte-for-byte. The first 3,794,406 bytes still have SHA-256
`9913a0c1a387f78d2f452674e9892e645409cd50b2a40f6772a89111a24284b0`.
[Bank preservation evidence](validation-attachment-audio67-original-bank.json)
records that equality; the appended eighteen takes add 37,221 download bytes.

## Native evidence and allocation

[`check-attachment-audio-browser.mjs`](../scripts/check-attachment-audio-browser.mjs)
decodes the complete bank in desktop Chromium, plays the actual new contacts,
checks cancellation/priority/cutoff/caps/cleanup and renders eighteen isolated
take comparisons followed by nine real engine reload timelines. The fixtures
cover stock, fast, extended, drum, top loader, belt box, legacy extension,
unchanged pistol and unchanged individual-shell actions.

| Native sample rate | All 446 decoded recordings | New attachment PCM | Headroom below 40 MiB |
| --- | ---: | ---: | ---: |
| 44.1 kHz | 38,392,292 bytes | 184,104 bytes | 3,550,748 bytes |
| 48 kHz | 41,787,436 bytes | 200,376 bytes | 155,604 bytes |

The complete encoded bank is 3,831,627 bytes across two existing segments. Both
native validations decoded all takes, found audible finite unclipped attachment
PCM, admitted three remote contacts plus the reserved local contact, stopped
only the matching local group on cancellation, rejected the distant contact,
retained the 24-source cap and ended with zero retained sources.

- [44.1 kHz native validation](validation-attachment-audio67-44100-browser.json)
- [48 kHz native validation](validation-attachment-audio67-48000-browser.json)
- [44.1 kHz listening reel](audio-release67/magazine-contacts-44100.m4a) and
  [timeline/index](audio-release67/magazine-contacts-44100.json)
- [48 kHz listening reel](audio-release67/magazine-contacts-48000.m4a) and
  [timeline/index](audio-release67/magazine-contacts-48000.json)

The reels contain exact decoded takes at unity gain, followed by the production
cue gains and actual engine timings, with no normalization. They make the change
reviewable; they have not received a subjective listening review. Source hashes,
browser version and capture time are recorded in each native report. Packaging
can subsequently update import version tags without changing contact behavior.

Reproduce a rate-specific capture with:

```sh
node scripts/check-attachment-audio-browser.mjs --sample-rate 48000 \
  --output docs/validation-attachment-audio67-48000-browser.json \
  --preview docs/audio-release67/magazine-contacts-48000
```

## Remaining limits

This library covers actual moving magazine attachment contacts. The game has no
attachment-fitting/removal action, optic adjustment, laser activation or bipod
deployment animation to sound. Pistol attachment magazine geometry is absent;
shell and revolver reloads manipulate their existing ammunition/cylinder rather
than a replacement attachment magazine. Those actions retain their established
weapon cues. Whole-weapon switching also retains its existing handling sound.
The three material/body families are shared across compatible rigs; they are not
field recordings of every weapon/attachment combination.

The remaining 155,604-byte 48 kHz allocation margin is small. Further bank growth
must be measured against native 48 kHz decoding and rejected if it exceeds the
40 MiB allowance, or accompanied by a separately justified budget change. This
is a mono PCM allocation bound, not total browser/process memory. Hardware
output latency, phone loudspeaker response, subjective realism and physical
Safari/iPhone performance remain unverified.
