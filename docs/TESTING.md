# Verification policy

Only **74 tests** are active. `npm test` explicitly lists these six files:

- gameplay.test.mjs
- input-save.test.mjs
- controller.test.mjs
- mobile-lifecycle.test.mjs
- identity-cache.test.mjs
- final-polish.test.mjs

`npm run verify` runs those 74 tests and the existing packaging/offline check.
CI runs the same command for pushes, pull requests and manual workflow dispatch.
Documentation/report-only changes do not trigger CI.

The former test:all, test:full and test:soak commands and the full-suite CI job
have been removed. The other 345 tests are retired as `.mjs.txt` reference files
under tests/retired, outside Node test discovery. They contain useful historical
coverage, so they are preserved as text rather than described as useless.
They must not be executed, imported or restored without a new explicit user request.
Two genuinely duplicate tests were deleted in the original audit.

Browser/shader checks, bot simulations, asset audits and profiles must not run
as additional validation unless explicitly requested by the user. Historical
release documents describe past work, not current testing requirements.

The active suite covers core gameplay, touch/controller input, saves, application
lifecycle and offline updates. It does not establish correctness of every mode,
map, shader, audio path or native asset. Report that coverage limit honestly.
Run the active checks once on the final source state; repeat only after relevant
changes or failures. Documentation-only changes need diff/link review.
