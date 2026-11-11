# Verification — DEADLINE: 1989

Acceptance run: 2026-11-11. Scope: the complete FINAL MASTER IMPLEMENTATION PROMPT (sections 0–35), two supplied visual references, and subsequent requests for Russian text, a dark cluttered apartment, and a stable terminal window.

## Final checks

| Check | Actual result |
| --- | --- |
| `pnpm test` | PASS — 43 tests in four files: 16 real SQLite API cases, 20 gameplay cases, seven narrative cases |
| `pnpm typecheck` | PASS — shared, server and browser strict TypeScript |
| `pnpm lint` | PASS |
| `pnpm build` | PASS — Fastify and Vite production artifacts |
| `pnpm test:e2e` | PASS — seven Chromium scenarios, 47.0 seconds |
| `node scripts/production-smoke.mjs` | PASS — compiled static client, API errors, real process stop/restart, task/reward/settings/tutorial persistence, durable shot replay and unused-round recovery |
| `python3 scripts/validate_bootstrap.py` | PASS — seven TOMLs, six unique agent definitions, four skills, instructions, links and directories |
| Input-only combat smoke | PASS — all six enemies defeated, actual enemy-caused death, pause, return, repeated scene entry and refresh persistence |
| Visual review | PASS — actual screenshots inspected by root and Pixel Art Director; corrected apartment, character silhouette, terminal clipping, combat density and final Cyrillic layouts |

Environment: Node 26.7.0, pnpm 12.18.0, Chromium 152.0.7977.82; Linux desktop. Playwright viewport 1440×1000; final apartment/menu also captured at 1536×960. Tests use temporary profiles and never open the normal user's SQLite database.

## Browser coverage

1. Create, edit, difficulty/description/deadline, complete, filter, reopen, delete, reward once and refresh.
2. Terminal bounds stay within one pixel across filters, long task details, creation and editing; long content scrolls inside the inspector.
3. Renderer import failure leaves tasks usable; losing a response after a committed create and retrying produces one task.
4. Apartment movement/furniture collision; pause freezes movement; task text/focus does not move the player.
5. Entire FIRST CALL: movement, original first call, honest task creation, refresh, isolated training, aim, fire, reload, melee, second call and mission unlock.
6. Real AudioContext unlock/state changes, music transition, mute/reduced motion/volume preferences and reload persistence.
7. Real mission reservation, shot, terminal pause, refresh and explicit recovery; only unused rounds return. The exit interaction is asserted in Russian.

API tests additionally cover invalid input, duplicate/conflicting/concurrent requests, unique claims surviving reopen/delete, transaction failpoints and rollback, overspend, settlement retries, restart, optional dialogue priorities/history/cooldowns and reset preserving real data.

## Actual combat evidence

[Machine-readable report](evidence/combat-smoke.json) comes from keyboard/mouse input, read-only canvas diagnostics and normal task API fixture creation. No actor teleportation, physics alteration, fake kills, fabricated victory or direct database resource edits were used.

- Victory: 6 kills, 11 shots, 8 hits, 29.670 seconds; completion counter increased exactly once.
- A second zero-ammunition mission ended from a real enemy hit. Death count increased; tasks and XP were unchanged.
- Inventory decreased exactly by committed shots; unused rounds returned; a reload did not restore spent ammunition.
- Pause preserved both player and enemy positions. Re-entering the apartment restored working movement; one canvas remained.
- No JavaScript console/page errors and no failed HTTP requests in the final frozen run.
- Representative late-combat average frame interval: 17.45 ms over 1404 frames; largest recorded interval in that segment: 41.66 ms. This approaches 60 FPS in this headless workload; it is not a universal performance guarantee.
- Read-only heap snapshots were 64,776,445 bytes initially and 66,544,791 bytes after the repeated transitions and reload. Source cleanup and repeated behavior were reviewed; this is a bounded smoke observation, not a long-duration heap-leak certification.

The standalone combat script expects the separate visual test instance on port 5175, an unlocked tutorial and synthetic tasks. Do not point it at a real user profile.

## Visual acceptance and corrections

| Area | Actual inspected output / correction |
| --- | --- |
| Menu | [Russian menu](evidence/menu-russian.png): original skyline/logo, readable Cyrillic keyboard/mouse options |
| Apartment | [Initial](evidence/apartment-initial.png) → [silhouette/scale correction](evidence/apartment-revised.png) → [requested dark cluttered arrangement](evidence/apartment-cluttered-russian.png) |
| Terminal | [Initial clipped layout](evidence/terminal-initial.png) → [width correction](evidence/terminal-revised.png) → [stable Russian long-description layout](evidence/terminal-stable-russian.png) |
| Combat | [Initial sparse scene](evidence/combat-initial.png) → [revised printworks](evidence/combat-revised.png), actual six-actor mission |
| Training | [Practice](evidence/training-practice.png), temporary ammunition label and original matching sprites |
| Calls | [Russian first call](evidence/first-call-dialogue.png), original portrait, progressive text and keyboard controls |
| Outcomes | [Actual victory](evidence/victory-initial.png), [actual death](evidence/death-initial.png), Cyrillic statistics and return controls |
| Settings/recovery | [Settings](evidence/settings-accessibility.png), [interrupted mission](evidence/mission-refresh-recovery.png) |
| Product independence | [Working terminal with game unavailable](evidence/terminal-game-unavailable.png) |

Earlier images such as the offline initial menu and interaction-before-fix captures document found defects; they are not passing acceptance evidence. The Pixel Art Director accepted the final cluttered apartment, revised combat and Russian layouts. All six interaction positions are preserved and collision-aware reachable.

Original action sheets contain idle/walk/run/aim/shoot/reload/melee/hit/death/wake frames at one scale. Runtime uses the relevant player/enemy actions, gunner hit reactions, grunt melee, animated phones/screens/TV/neon, proximity doors, original muzzle/smoke strips, impacts/casings/particles, camera shake and 35 ms hit stop. Death starts with a hit reaction, then death animation. Scene shutdown removes timers, keys, subscriptions, pools and transient effects. Source and actual action flows were reviewed; screenshots alone do not prove every individual animation frame.

## Audio and asset provenance

Seven real original music WAVs and 12 effects are shipped; PCM16 mono 22050 Hz, deterministic generation, nonzero RMS and no clipping in signal checks. The graph implements crossfade, dialogue/pause ducking, immediate death fade, duplicate-loop prevention and gesture unlock; browser state/settings checks pass. No human listening or professional mastering assessment is claimed. All shipped music is original synthesis, including in streamer mode.

Specific third-party candidates were researched in [ASSET_CREDITS](ASSET_CREDITS.md). None was adopted; uncertain third-party licenses remain marked pending and do not authorize use. Source generators and manifests are included. See [ART_BIBLE](ART_BIBLE.md) for reference mapping and visual review.

## Publication and practical limits

Private repository: `Artyx71/deadline-1989`; branch `feat/deadline-1989`. Conventional milestone commits include foundation `576e52d`, API `cd6e2f7`, initial UI `18910b1`, production/Russian API `36847d4`, original art `d2b3192`, audio `e7bde38`, game `e4a2aab`, narrative `5a5395d`, integration `a4b9023`, stable terminal `76189ac`, and regression evidence `ccad064`. Milestone pushes are verified with `git ls-remote`; no force push or automatic merge is used. Final documentation is published after this report.

This is one local profile on loopback. Public multi-user hosting requires authentication/profile isolation. Offline mutations are not claimed. Browser acceptance is desktop Chromium; other browsers, touch devices and long-duration stress sessions are not certified. Original programmatic art and synthesized music are coherent MVP production assets, without claiming the illustrative detail or mastered recordings of the references. Bootstrap's historical custom-agent loader limitations remain recorded in BOOTSTRAP.md; actual development used the available delegation tools with explicit role instructions and file ownership.
