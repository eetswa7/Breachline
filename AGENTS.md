# Verification

Keep routine validation proportional to the change. See docs/TESTING.md for the audit and commands.

- For runtime changes, run `npm run verify` once on the final source state. This is the small core regression suite plus packaging/offline validation.
- Also run the existing test files for the subsystem changed: `node --test tests/<name>.test.mjs`. Do not rerun core files already covered by verify.
- Documentation-only changes need a diff/link review, not runtime tests. Test infrastructure changes need the affected commands exercised.
- Do not run `test:all`, `test:full`, bot match soaks, all-map/weapon browser matrices, shader compilation, Blender rebuilds, asset hashes or profiles on every push. Use the relevant specialist check only when the change can affect it.
- Use bot soaks for bot/navigation/spawn/map/mode changes when focused tests cannot establish match-level behavior. Use native browser/shader checks for affected rendering paths; Node fixtures cannot prove visual correctness.
- Do not repeat passing checks for the same source state or regenerate historical release evidence for unrelated edits. Report what ran and any remaining limits honestly.
