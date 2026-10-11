# Blacksite construction and ground finishing

The editable placement source is
[`dist/js/production-world.js`](../dist/js/production-world.js). The material
finishing source is [`dist/js/ground-wear.js`](../dist/js/ground-wear.js). Both use
the shipped Blender `surface` mesh and the existing native baked concrete,
asphalt and gravel albedo, normal and packed occlusion/roughness/metal maps.
No external imagery or commercial game assets were used.

The service forecourts now contain eight poured slabs per side, measuring
8.5 by 4.1 metres before the 18 mm construction joints. Each connected vehicle
approach contains two 13.5 by 5.85 metre pours. Approaches start at the edge of
the forecourt; they no longer overlap another concrete finish at the same
height. Colours vary gently between pours to show curing and replacement.
The surface stays at its original height and carries no collider.

Material finishing is authored in world metres. A paired tyre-wear route turns
into the hall from each approach. Local crack polylines, dirt collected near
construction joints and apron margins, localized asphalt oil patches and worn
service paint retain the original PBR grain. Gravel yards receive broad
compaction variation. No depth displacement changes the playable floor.

Twenty pours replace four original surfaces, adding 16 two-triangle native
instances. All pours share their material variants and are submitted through
the existing instanced surface batches. The finishing adds no texture sampler,
download, transparent layer, shadow-caster geometry or render target. It adds
six shader variants on Blacksite. One interpolated value noise uses four hash
evaluations per fragment; finer wear reuses the already sampled albedo. Crack
and oil distances are squared to avoid their square roots. This arithmetic
still has GPU cost: scene counts and software screenshots are not a physical
iPhone performance measurement.

This is a scoped forecourt/material improvement. It does not complete the
terrain, comprehensive decals, natural mud/terrain, map-wide wear, professional
environment art or AAA visual-quality checklist requirements.

The [same-camera before/after validation](../docs/validation-blacksite-ground.json)
records the three authored review poses and their images. Each scoped view adds
two draws and 32 submitted surface triangles, with identical shadow draws and
estimated texture memory. Six more shader program variants are prepared.
The existing all-map preservation, exact aperture, destroyed-parent and native
scene-budget tests pass. Reproduce images with `scripts/capture-ground.mjs`;
its `--baseline-ref` option replaces only the historical ground placement
module, leaving the current renderer and material assets fixed.
