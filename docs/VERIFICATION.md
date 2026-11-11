# Verification — DEADLINE: 1989

Acceptance run: 2026-11-11. Scope: the complete FINAL MASTER IMPLEMENTATION PROMPT (sections 0–35), two supplied visual references, and subsequent requests for Russian text, a dark cluttered apartment, and a stable terminal window.

## Original acceptance checks (before the follow-up changes)

| Check                                   | Actual result                                                                                                                                                               |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                             | PASS — 43 tests in four files: 16 real SQLite API cases, 20 gameplay cases, seven narrative cases                                                                           |
| `pnpm typecheck`                        | PASS — shared, server and browser strict TypeScript                                                                                                                         |
| `pnpm lint`                             | PASS                                                                                                                                                                        |
| `pnpm build`                            | PASS — Fastify and Vite production artifacts                                                                                                                                |
| `pnpm test:e2e`                         | PASS — seven Chromium scenarios, 47.0 seconds                                                                                                                               |
| `node scripts/production-smoke.mjs`     | PASS — compiled static client, API errors, real process stop/restart, task/reward/settings/tutorial persistence, durable shot replay and unused-round recovery              |
| `python3 scripts/validate_bootstrap.py` | PASS — seven TOMLs, six unique agent definitions, four skills, instructions, links and directories                                                                          |
| Input-only combat smoke                 | PASS — all six enemies defeated, actual enemy-caused death, pause, return, repeated scene entry and refresh persistence                                                     |
| Visual review                           | PASS — actual screenshots inspected by root and Pixel Art Director; corrected apartment, character silhouette, terminal clipping, combat density and final Cyrillic layouts |

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

| Area                 | Actual inspected output / correction                                                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu                 | [Russian menu](evidence/menu-russian.png): original skyline/logo, readable Cyrillic keyboard/mouse options                                                                                   |
| Apartment            | [Initial](evidence/apartment-initial.png) → [silhouette/scale correction](evidence/apartment-revised.png) → [requested dark cluttered arrangement](evidence/apartment-cluttered-russian.png) |
| Terminal             | [Initial clipped layout](evidence/terminal-initial.png) → [width correction](evidence/terminal-revised.png) → [stable Russian long-description layout](evidence/terminal-stable-russian.png) |
| Combat               | [Initial sparse scene](evidence/combat-initial.png) → [revised printworks](evidence/combat-revised.png), actual six-actor mission                                                            |
| Training             | [Practice](evidence/training-practice.png), temporary ammunition label and original matching sprites                                                                                         |
| Calls                | [Russian first call](evidence/first-call-dialogue.png), original portrait, progressive text and keyboard controls                                                                            |
| Outcomes             | [Actual victory](evidence/victory-initial.png), [actual death](evidence/death-initial.png), Cyrillic statistics and return controls                                                          |
| Settings/recovery    | [Settings](evidence/settings-accessibility.png), [interrupted mission](evidence/mission-refresh-recovery.png)                                                                                |
| Product independence | [Working terminal with game unavailable](evidence/terminal-game-unavailable.png)                                                                                                             |

Earlier images such as the offline initial menu and interaction-before-fix captures document found defects; they are not passing acceptance evidence. The Pixel Art Director accepted the final cluttered apartment, revised combat and Russian layouts. All six interaction positions are preserved and collision-aware reachable.

Original action sheets contain idle/walk/run/aim/shoot/reload/melee/hit/death/wake frames at one scale. Runtime uses the relevant player/enemy actions, gunner hit reactions, grunt melee, animated phones/screens/TV/neon, proximity doors, original muzzle/smoke strips, impacts/casings/particles, camera shake and 35 ms hit stop. Death starts with a hit reaction, then death animation. Scene shutdown removes timers, keys, subscriptions, pools and transient effects. Source and actual action flows were reviewed; screenshots alone do not prove every individual animation frame.

## Audio and asset provenance

Seven real original music WAVs and 12 effects are shipped; PCM16 mono 22050 Hz, deterministic generation, nonzero RMS and no clipping in signal checks. The graph implements crossfade, dialogue/pause ducking, immediate death fade, duplicate-loop prevention and gesture unlock; browser state/settings checks pass. No human listening or professional mastering assessment is claimed. All shipped music is original synthesis, including in streamer mode.

Specific third-party candidates were researched in [ASSET_CREDITS](ASSET_CREDITS.md). None was adopted; uncertain third-party licenses remain marked pending and do not authorize use. Source generators and manifests are included. See [ART_BIBLE](ART_BIBLE.md) for reference mapping and visual review.

## Publication and practical limits

Originally private, now public repository: `Artyx71/deadline-1989`; branch `feat/deadline-1989`. Conventional milestone commits include foundation `576e52d`, API `cd6e2f7`, initial UI `18910b1`, production/Russian API `36847d4`, original art `d2b3192`, audio `e7bde38`, game `e4a2aab`, narrative `5a5395d`, integration `a4b9023`, stable terminal `76189ac`, and regression evidence `ccad064`. Milestone pushes are verified with `git ls-remote`; no force push or automatic merge is used. Final documentation is published after this report.

This is one local profile on loopback. Public multi-user hosting requires authentication/profile isolation. Offline mutations are not claimed. Browser acceptance is desktop Chromium; other browsers, touch devices and long-duration stress sessions are not certified. Original programmatic art and synthesized music are coherent MVP production assets, without claiming the illustrative detail or mastered recordings of the references. Bootstrap's historical custom-agent loader limitations remain recorded in BOOTSTRAP.md; actual development used the available delegation tools with explicit role instructions and file ownership.

## Follow-up acceptance — studio and free Pages edition

2026-11-11, Chromium 152, Linux, isolated temporary native databases and fresh browser contexts. These results supersede the original counts for the current changes.

| Check                            | Actual result                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test`                      | PASS — 55 tests: 21 native SQLite API, 20 gameplay, seven narrative, seven SQL.js persistence tests                                       |
| `pnpm typecheck`, `pnpm lint`    | PASS                                                                                                                                      |
| `pnpm build`, `pnpm build:pages` | PASS — separate native and static bundles, bundled Worker/WASM and `/deadline-1989/` asset base                                           |
| `pnpm test:e2e`                  | PASS — 10 native Chromium scenarios, 1.6 minutes, including confirmed clean New Game and story-only preservation                          |
| `pnpm test:pages`                | PASS — three production-static Chromium scenarios, 14.2 seconds after formatting/localization, with no Fastify server                     |
| Studio input smoke               | PASS — actual E interactions at computer, phone, TV, cabinet, training door and exit; separate training return; tasks/resources preserved |
| Studio sound signal              | PASS — actual gunshot/melee/reload/impact source starts and effect-bus RMS peak 0.560142, no audio error                                  |
| Art review                       | PASS for the captured studio and separate training; minor paper-note overlap with exit caption, central prompt readable                   |

Static-browser scenarios prove UI create/edit/complete/reopen/delete/reload, once-only rewards, concurrent tabs and duplicate request keys, confirmed clean reset observed across tabs and reload, real Phaser asset loading, separate training, dispatch, actual committed gunshot and sound signal, refresh recovery with spent ammunition retained. They use the shipped Worker protocol and normal validated routes, without resource edits or hidden test endpoints. IndexedDB writes complete before successful mutation responses. Adapter tests additionally force failed writes and rollback before safe retry.

`node scripts/production-smoke.mjs` also passed on the compiled native edition after domain extraction: actual process restart, task/reward/settings/tutorial persistence, durable shot replay and unused-round recovery. Bootstrap metadata/link validation passed after formatting; skill frontmatter retains its JSON-compatible double quotes through a dedicated Prettier override.

Current captured evidence: [studio objects](evidence/studio-objects-verified.png), [separate training](evidence/studio-separate-training.png), [input report](evidence/studio-smoke.json), [TV restriction fallback](evidence/studio-television-network.png). Input-only checks do not establish human listening quality.

### CI regression correction

The first hosted Chromium run passed eight of ten native scenarios and exposed two unstable checks: a final-dialogue acknowledgement race and a TV approach accepted too close to furniture. Trace inspection also found a real dialogue rendering defect: the previous line's character count briefly revealed the new line before its effect reset. The component now resets characters atomically with advancing the line. Browser helpers wait for actual reveal/progress/closure, and navigation uses clear corridors and waypoints whose accepted regions stay clear of furniture and within interaction radii. A subsequent hosted run showed that forcing a sub-frame stop at a TV corner could oscillate under remote input latency; the final approach uses the object collision edge and a broad valid interaction region. The affected native scenarios passed separately; all three static scenarios passed again. No timeout increases, blind retries, actor teleportation or bypassed gates were used. The final hosted run passed all ten native and all three static-browser scenarios, as recorded below.

### External TV limitation

The official YouTube trailer returned error 150 and an explicit age restriction; its video stayed paused at time zero, muted, volume zero. A public creator Vimeo alternative also returned a connection-security restriction. No successful external playback is claimed. The real fallback, close, resumed game input and temporary game-audio silence are verified. No restricted media was downloaded or bundled.

### Pages publication

Repository visibility is PUBLIC and Pages uses GitHub Actions. The browser edition stores one profile in SQLite/WASM inside an origin-wide Worker lock and IndexedDB; it does not synchronize devices or share the native profile. Removing browser site data removes this profile. Live deployment verification is **PASS**. [Workflow 43074420801](https://github.com/Artyx71/deadline-1989/actions/runs/43074420801) deployed commit `7b1e2748b12d44d91b63c33cdf503feeb5152caf` successfully after 55 logic/adapter tests, formatting, strict types, lint, both builds, 10 native browser cases (2.3 minutes), and three static browser cases (20.3 seconds).

The public [Pages site](https://artyx71.github.io/deadline-1989/) returned HTTP 200. `PAGES_BASE_URL=https://artyx71.github.io/deadline-1989/ pnpm test:pages` then passed **3/3 in 19.5 seconds** in fresh isolated Chromium contexts, against the actual deployed assets/Worker/WASM. This verifies UI CRUD/rewards/reload, cross-tab serialization/confirmed reset, and real training/dispatch/shot/sound/refresh settlement. No Fastify server was used for these public checks. [Public training capture](evidence/pages-live-training.png) and [machine-readable publication report](evidence/pages-live-verification.json).
