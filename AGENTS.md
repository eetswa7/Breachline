# Verification

The user requires only the existing 74 core tests to run. This overrides historical release validation lists.

- For runtime changes, run `npm run verify` once on the final source state: exactly the 74 tests in `npm test`, plus the existing packaging/offline check.
- Do not run additional test files, retired tests, full suites, bot soaks, browser checks, shader checks, asset audits or profiles. Do not restore extra suites or increase the test count without an explicit new user request.
- Retired tests are non-executable reference text under tests/retired. Do not execute, rename or import them as tests.
- Documentation-only changes need diff/link review. Test infrastructure changes need the active command exercised.
- Do not repeat passing checks for the same source state or regenerate historical release evidence. Report what ran and its limits honestly.
