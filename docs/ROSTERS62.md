# Release 62: large-map 20 vs 20

Crossfire District (120 m) and Blacksite (116 m) now create 40 combatants in
every team mode: the player and 19 allied bots against 20 enemy bots. Smaller
maps retain 4 vs 4 and Gun Game retains its eight-player free-for-all roster.
The authored home starts remain available; the existing connected spawn-pocket
director separates the additional players and selects safe respawns.

Validation on 13 October 2026:

- All 36 focused roster, attachment, Frontline, objective-mode and spawn tests
  passed, including all eight team modes on both large maps.
- The 78-module, asset-reference and offline-shell check passed.
- [Native crowd budget fixtures](validation-release62-operator-crowd.json) use
  the actual 40-player roster and passed all twelve scenarios. These are scene
  counts, not physical iPhone performance measurements.
- CTF bots reached and stole both flags in full 40-player simulations. Crossfire
  seed 9281 ended in a valid 0–0 draw with 30 steals, 30 drops, 16 returns and
  615 kills. The capture regression uses seed 781 (0–2, 44 steals); Blacksite's
  existing seed 9281 finished 0–3. Isolated capture and flag-recovery fixtures
  remain intact. A capture in every crowded match is not guaranteed.

This checkpoint changes rosters, not map geometry or gameplay damage. The art
overhaul and actual iPhone 16 Pro measurements remain open in the checklist.
