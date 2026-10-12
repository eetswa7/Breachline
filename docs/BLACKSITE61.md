# Blacksite architecture and loading yard, 12 October 2026

Blacksite's generator hall now has a purpose-built turbine-hall silhouette:
a shallow gable, continuous roof slopes, standing seams, a recessed louvre bank
and broad metal upper-wall sheets. These replace the visual dominance of the
old flat roof and repeated precast pattern above the windows. Roof equipment
has been raised to meet the new slopes. All four facade bands start at 3.20 m,
above the existing doors and open firing windows; the complete new roof remains
above the original 6.30 m roof surface.

The loading apron and its joined approach now use native poured-slab geometry,
backed joints, small damaged edges, a limited crack and curved tyre wear with
feathered vertex colour. They replace the existing flat finish instances rather
than add a transparent decal layer. Their highest visible point stays below
0.034 m, beneath the existing contact-shadow and impact receiver. The source is
original editable modelling in
[blacksite_models.py](../authoring/blender/blacksite_models.py); simulation blocks,
collision, door/window openings, routes and objectives retain their authoritative
positions and dimensions.

## Actual visual review

The matched [approach](art-release61/comparison-blacksite-approach.webp) and
[oblique view](art-release61/comparison-blacksite-oblique.webp) use the actual
shipped gameplay renderer at the same camera, viewport, quality and seed as the
before images. The new upper wall and gable visibly change the building's
construction and material hierarchy. At the close approach camera, the gable's
peak extends above the image; the oblique view shows its slope, and the wider
[forecourt view](art-release61/comparison-blacksite-forecourt.webp) includes the
complete frontage. Slab joints and tyre sweeps are visible in the foreground.
Native export success was followed by gameplay image inspection.

This is focused progress on Blacksite, not completion of the complete environment
library or the requested professional art standard. The lower wall still has
obvious repeated concrete artwork, metal panels remain comparatively flat,
background vegetation and terrain remain sparse, and the hall interior is still
dark and simplified. The terrain-blending and full damage/decal requirements
remain open. No reference-game art was copied.

## Cost and verification

Four new unique assets use 2,292 near triangles in total: 692 for the roof,
1,028 for cladding, 283 for the apron and 289 for the approach. Roof and cladding
far versions reduce those counts to 188 and 552. There are five additional scene
instances, because the four ground instances replace existing planes. The full
static Blacksite assembly contains 127 production instances, 211 active world
batches and 372,014 triangles before frustum/LOD selection, within the existing
220-batch and 375,000-triangle limits. The
[native validation record](validation-blacksite61-native.json) identifies the
saved editable source and these counts.

The matched approach selects 254,122 world triangles versus 248,182 before
(+2.4%), and 219 active world batches versus 213 (+6). Estimated texture storage
remains 82,779,926 bytes. Complete-frame submissions, including other Release 61
changes, rise from 309 to 319 draws and from 418,712 to 429,456 triangles. These
are software-renderer scene counts, not iPhone frame times, thermal results or
process-memory measurements. A new physical-device benchmark export is needed.

The production-world tests check authoritative-state preservation across all
sixteen maps, every native opening, destroyed-parent inheritance, both mirrored
roof slopes' outward normals, loading-surface connections and native contact
height. The native library, texture integrity, surface fidelity and scene
coherence checks also pass. All sixteen maps received fresh 32-sample Cycles GI;
Blacksite was rebaked again after a roof-normal defect was corrected.

## Rebuild

The editable source and segmented runtime library include all new geometry and
the complete level assemblies. Existing material bakes were reused exactly;
all sixty ASTC material containers retain their original bytes. The updated
material-preserving build path validates container hashes and exact fallback
pixels before reuse, and records full native PNG hashes for future checks.
A changed native-material pixel was exercised in a separate scratch build and
correctly rejected before ASTC reuse. Fresh lighting maps are still encoded and
packed. This geometry iteration required no ASTC encoder download.

Run `npm run assets:blender -- --reuse-bakes` to rebuild geometry and all GI with
the retained material artwork. For a change confined to Blacksite's static
assembly, `npm run assets:blender -- --reuse-bakes --rebake-maps=14` preserves the
other fifteen packed Cycles maps and rebakes Blacksite. Reuse those other bakes
only when their geometry, lighting and materials remain unchanged. A full
material rebuild requires the ASTC encoder as documented in the
[native source instructions](../authoring/blender/README.md).
