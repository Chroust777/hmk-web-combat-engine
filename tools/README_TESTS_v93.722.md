# Test bundle for v93.722

Production patch applies **only** on top of v93.721. Run tests with Node 22 and available TypeScript module (or TypeScript at the recorded global Node path), Python 3 with Playwright, and headless Chromium at `/usr/bin/chromium`.

- `tests/test_global_shock_93722.cjs`: 56 primary Extended Shock / Coma + parallel Cold Water assertions.
- `tests/test_combat_write_boundary_93722.cjs`: 127 Combat write-boundary assertions and 24 permutations.
- `tests/test_parallel_browser_93722.py`: full 14-step-generated browser actor, actual new Shock Reroll, saved source and reload. Uses injected test-only helper in browser memory; nothing injected is included in production bundle.
- `tests/previous/*.cjs`: the six previous suites; pass the **exact extracted source directory as the first argument** when executing them, e.g. `node tests/previous/test_fear_parallel_93720.cjs /path/to/working/production/root`.
- `logs/browser93722.log`: actual Chromium execution output.
- `audit/AUDIT_v93.722.md`: detailed rules and limitations.

Both legacy v93.721 Cold scripts include an assertion that a strong concurrent Cold Shock *must be blocked*. Their expected outcome is superseded by the new tests, not a newly introduced failure of the rules.
