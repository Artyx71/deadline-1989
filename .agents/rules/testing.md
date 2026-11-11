# Testing rules

- Add meaningful tests alongside authorized implementation. Vitest covers pure logic and API integration with isolated real SQLite; Playwright covers the actual running web/server boundary. Final QA repeats critical regressions after integration.
- P0 gate: create, complete, delete, reload and server restart retain correct tasks. Supporting task coverage includes edit, filter, reopen, duplicate requests, failures, and game unavailable while task UI works.
- Prove each reward invariant through real transactions: once-only issuance, no delete rewards, retained history on reopen, unchanged tasks after death, nonnegative ammo, duplicate/concurrent completion safety, no ammo restoration on reload, and atomic rollback.
- Exercise network loss before/after commit, retry with the same key, conflicting key reuse, concurrent overspend, refresh during combat/tutorial, and crash/restart. Check committed data and API responses rather than only mocked callbacks.
- Gameplay checks include diagonal speed, aiming, wall/projectile collision, reload/melee, enemy FSM and blocked sight, pause/input ownership, death/apartment, mission outcome, and repeated scene cleanup. Test relevant edge cases at representative frame rates.
- Narrative checks include FIRST CALL order, real task creation without false completion, skip, reload/re-entry, first call, contextual death calls, priority, ignore/answer, and persisted cooldowns.
- Browser evidence identifies command, application revision/state, browser/runtime, viewport, steps, expected/actual result, console/network failures, and screenshot/trace paths where available. A screenshot alone does not verify interactions.
- Label results PASS, FAIL, BLOCKED, or NOT RUN. Missing tooling/servers means BLOCKED or NOT RUN, never PASS. A browser package or feature flag is not proof of a successful browser launch.
- Use temporary databases and deterministic fixtures/seeds/clocks. Do not hit production state. Coordinate test-file ownership and keep evidence free of credentials or private real tasks.
- Record performance observations with scene/entity counts, browser, machine context, and measurements. Set budgets using observed workloads; do not invent a passing FPS claim.
- After integration, run checks required by the change and inspect the diff. Expand testing only for a concrete unresolved risk. During bootstrap validate infrastructure only; application tests wait for implementation.
