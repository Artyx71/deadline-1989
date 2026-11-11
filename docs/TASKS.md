# DEADLINE: 1989 — Implementation backlog

## Active master implementation — 2026-11-11

Master specification: user attachment `pasted-text-1.txt`, sections 0–35; two screenshot references reviewed. Bootstrap hold has ended. One local profile, private GitHub repository, feature branch; no automatic merge. Status vocabulary: BACKLOG / READY / IN_PROGRESS / IN_REVIEW / DONE / BLOCKED. Each milestone passes its relevant tests, typecheck, lint, build, review, commit, and verified push before DONE.

| ID | Description / priority | Dependencies | Owner | Expected files | Acceptance criteria | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| M1-01 | Workspace and explicit contracts / P0 | Bootstrap | Orchestrator | Root manifests, packages/shared | pnpm workspace; strict TS; typed task/resource/game contracts | Install, shared build, lint, typecheck | DONE |
| M1-02 | Repository synchronization / P0 | M1-01 | Orchestrator | .git, .gitignore | Private Artyx71/deadline-1989; feat/deadline-1989; incremental history, no force pushes | Git status/remotes; authenticated repo; ls-remote hash | DONE |
| M1-ART | Reference analysis and rights research / P1 | Bootstrap | Pixel art director | ART_BIBLE, ASSET_CREDITS | Both refs mapped to palette, density, proportions; concrete pack/music rights evidence or original replacements | Source/license review; art manifest | DONE |
| M2-DB | Durable SQLite schema/migrations / P0 | M1-01 | Backend | apps/server/src/db, migrations | Required entities, preserved data, real Drizzle integration | Fresh/upgrade migration and restart tests | DONE |
| M2-API | Task CRUD, validation, errors / P0 | M2-DB | Backend | apps/server/src | Create/edit/complete/reopen/delete; descriptions/difficulty/due dates; no reward leaks | Real SQLite API tests, invalid/concurrent calls | DONE |
| M2-UI | CRT contract terminal / P0 | M1-01, M2-API | Frontend | web/src/features, components, styles | All task flows, filters, stats, rewards; keyboard/focus; pending/error; independent of game | Typecheck, browser CRUD/reload/offline/screenshots | DONE |
| M3-ART | Finished apartment art / P1 | M1-ART | Pixel art director | web/public/assets, generate-art.py | Coherent floors/walls, furniture, original character, computer/phone, lighting | PNG review then actual browser before/after screenshots | DONE |
| M3-GAME | Playable apartment / P1 | M3-ART, M1-01 | Game engineer/orchestrator | web/src/game | WASD normalized220px/s, collisions, smooth camera, all six interactions, E/Tab | Movement/collision/input browser checks | DONE |
| M4-01 | Atomic rewards / P0 | M2-API | Backend | server reward services/tests | Easy3/50 normal6/100 hard12/200; once-per-task forever; atomic rollback | Duplicate/concurrent/reopen/delete/failure tests | DONE |
| M4-02 | Inventory/loadout HUD / P2 | M4-01, M3-GAME | Frontend/orchestrator | web/src/components, App | Server ammo/XP, choose carry amount, zero-ammo melee | Browser and API balances | DONE |
| M5-01 | Player weapons and motion / P2 | Apartment visual gate, M4-02 | Game engineer | web/src/game | Shoot/reload/melee/dash, specified timing, pooled swept projectile collision | Logic tests and real control smoke | DONE |
| M5-02 | AI and polished mission / P2 | M5-01 | Game engineer/art | game, combat art/maps | Four grunts/two gunners, seven FSM states, wall occlusion, obstacle navigation, readable attacks | Gameplay tests and visual screenshot review | DONE |
| M5-03 | Death/victory lifecycle / P2 | M5-02 | Game engineer/frontend | game, outcome UI | One hit; cinematic skippable outcomes; statistics; apartment return/reset | Real browser outcomes; tasks unchanged | DONE |
| M6-01 | Durable mission reservation / P0 | M4-01 | Backend | mission services/migrations/tests | Reserve selected ammo; idempotent shot/settlement; refund only unspent; save victory | Concurrent/start/shot/finish/restart tests | DONE |
| M6-02 | Refresh/network reconciliation / P0 | M6-01, M5-03 | Orchestrator/QA | API adapter, App, tests | Reconcile active attempt after refresh, no restored spend; ambiguous retry safe | Interrupted combat and network browser tests | DONE |
| M7-01 | Original dialogue and calls / P3 | M6-01 | Narrative designer | web/src/narrative, server dialogue | Original recurring caller; all contextual triggers/priority/cooldowns/history | Trigger tests, optional answer/ignore browser flow | DONE |
| M7-02 | FIRST CALL tutorial / P3 | M7-01, M5-01 | Narrative/game | narrative, App, tutorial API | Playable14-step flow, temporary training ammo, no false completion, skip/replay/persist | Full tutorial/skip/reload checks | DONE |
| M8-01 | Startup and main menu / P4 | M3-ART | Frontend/orchestrator | components, App | VHS/logo/glitch; real loader; keyboard+mouse menu; game reset preserves tasks | Browser startup/menu/new-game persistence | DONE |
| M8-02 | Cinematic UI / P4 | M5-03 | Frontend | components, styles | Dialogue portraits/typewriter, death/victory stats, pause/loading/error | Screenshots and keyboard/focus checks | DONE |
| M9-01 | Original dynamic soundtrack / P4 | M8-01 | Orchestrator | web/src/audio, assets/audio, credits | Seven music states, crossfade/duck/death/pause, real original audible files | Audio generation validity and browser AudioContext playback | DONE |
| M9-02 | SFX/settings / P4 | M9-01, M2-DB | Orchestrator/frontend | audio, settings | All12 requested SFX, persistent volume/mute/streamer/reduced effects | Settings restart and browser sound events | DONE |
| M9-03 | Final visual/animation gate / P1 | M5-02, M8-02 | Pixel art director | art, game, styles | Required player/enemy/environment actions, consistent scale, neon/CRT effects, no major ref mismatch | Actual before/after screenshots for each major scene and director review | DONE |
| M10-01 | Automated regression / P0 | M2–M9 | QA | tests, e2e | All requested task/reward/gameplay/persistence/narrative scenarios evidenced | Vitest, Playwright, typecheck, lint, production build | DONE |
| M10-02 | Release documentation/publication / P0 | M10-01 | Orchestrator | README, docs, GitHub | Complete install/run/recovery/license/local-profile limitations; incremental commits pushed | Fresh production run, commit/remote hashes, full requirement audit | DONE |

### User acceptance revisions

| ID | Description / priority | Dependencies | Owner | Expected files | Acceptance criteria | Verification | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RU-01 | Russian application text / P1 | Integrated application | Frontend/backend/narrative/orchestrator | Web interface, dialogue, hints, API errors | Cyrillic interface, task labels and dates, original Russian caller, validation, all interaction prompts; persisted identifiers unchanged | 43 tests, browser suite, actual screenshots and Russian exit prompt | DONE |
| UX-01 | Stable terminal geometry / P1 | RU-01 | Orchestrator/QA | terminal.css, E2E | Dialog position and size unchanged between filters, editing and long descriptions; columns scroll internally | Bounding boxes within 1 px, internal scroll assertion, screenshot | DONE |
| ART-02 | Dark, cluttered apartment / P1 | Apartment visual checkpoint | Pixel art director | Art generator, apartment artwork/JSON/Tiled | Fewer duplicate furnishings; cartons, wires, papers, records, stains; all six interactions reachable | Source geometry, actual browser screenshot, collision/interaction regression | DONE |

The original bootstrap backlog below remains design context. Active progress is tracked in the master table above and milestone evidence appended below it.

The items below are the historical bootstrap backlog. The master implementation goal has arrived; their current implementation status is consolidated in the active tables above. Acceptance criteria define future evidence, not completed verification. Product design is in [GDD.md](GDD.md); boundaries are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Scheduling and priority gate

The requested implementation sequence is retained as planning guidance:

1. Architecture and asset research.
2. Playable apartment and movement.
3. Functional task terminal and SQLite.
4. Task rewards and ammunition.
5. Combat and enemy AI.
6. Death and mission lifecycle.
7. Interactive tutorial and dialogue system.
8. Loading screens, sound and visual polish.
9. Automated testing and browser QA.

P0 task correctness and persistence remain the release and integration gate. Phase 2 is bounded exploration after the future goal authorizes implementation; it cannot postpone, block, or introduce a dependency into P0. Build the terminal independently of Phaser. Feature-specific tests accompany every phase; phase 9 is final regression, not the first testing pass. No assets are downloaded during bootstrap.

Before delegating an item, the orchestrator records exact file ownership, dependencies, acceptance criteria, and required verification. Maximum concurrent subagents: four; never assign the same file to parallel writers. Shared contracts and integration remain orchestrator-owned.

## P0 — Task CRUD and persistence

| ID | Work / owner | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| P0-01 | Confirm runtime, package versions, deployment identity, and workspace setup / orchestrator | Future master goal | Verify Node/pnpm availability; choose compatible pinned versions; establish workspace and strict TypeScript checks without unnecessary dependencies; record deployment decision. |
| P0-02 | Define task contracts and error conventions / orchestrator | P0-01 | Shared schemas define create/edit/complete/reopen/delete/list, invalid inputs, retry identity, and errors; frontend/backend review agrees; no server internals leak. |
| P0-03 | SQLite schema and migrations / backend | P0-02 | Fresh database and migration upgrade tested; durable task IDs/status/history; future reward receipt history can survive reopen/delete; isolated test databases supported. |
| P0-04 | Task API and domain operations / backend | P0-03 | Create, edit, list, complete, reopen, delete succeed with validation; missing/conflicting requests yield stable errors; completion contract supports later atomic rewards; restart preserves tasks. |
| P0-05 | Independent task terminal / frontend | P0-02, P0-04 | Keyboard-accessible task creation/completion/deletion; edit/reopen/filter support; loading/errors/focus work; terminal usable with Phaser absent or failed; no false saved state on API failure. |
| P0-06 | P0 persistence gate / QA + orchestrator | P0-04, P0-05 | Browser create/edit/complete/reopen/delete and refresh verified; server restart preserves state; invalid/network failure scenarios verified; duplicate completion cannot create duplicate effects; evidence records commands/results. |

## P1 — Apartment and interactions

| ID | Work / owner | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| P1-01 | Asset comparison and license review / art director | P0-01; no download until future goal | Compare compatible sources, download availability, license/commercial/modification/redistribution/attribution terms; record pending facts and missing assets before selecting. |
| P1-02 | Phaser host and typed bridge / game + frontend, separate files | P0-02; bridge contract approved | Single mount/teardown; scene errors leave terminal available; pause and UI focus disable game input; repeated entry does not duplicate listeners. |
| P1-03 | Apartment movement and collisions / game | P1-02; approved art specification | Responsive normalized movement, camera, walls, interaction reach; no through-wall movement; focused text fields cannot move/fire; smoke evidence captured. |
| P1-04 | Phone/computer interaction and return path / game + frontend | P1-03, P0-06 | Computer opens working terminal; interaction prompts and keyboard support; leaving/reentering preserves tasks; phone can be ignored; scene lifecycle checks pass. |

## P2 — Rewards and combat

| ID | Work / owner | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| P2-01 | Resolve reward and ammunition contracts / orchestrator | P0-06, ADR-004 reviewed | Server reward values and transaction boundaries specified; agree ammunition latency/recovery policy; missions/refresh policy documented; no training resource creates durable free ammo. |
| P2-02 | Atomic completion rewards / backend | P2-01 | Task completion and server-defined ammo/XP credit atomic; unique receipt survives reopen/delete; concurrent and duplicate requests reward once; rollback test leaves neither partial effect. |
| P2-03 | Persistent resource consumption / backend | P2-01, P2-02 | Conditional debit prevents negative balances; idempotent retry/conflict behavior; timeout, concurrent spend, reload, and server restart cannot restore spent ammo. |
| P2-04 | Player combat and animation integration / game | P1-03, P2-03 | Mouse aim, shooting, reload, melee without ammo, dash under approved design; projectile/wall collision accurate; shot effects follow resource contract; object lifecycle/pooling assessed. |
| P2-05 | Enemy finite state machines / game | P2-04 | Idle/patrol/chase/attack/death states; solid obstacles block vision; valid paths/collision prevent wall traversal; reproducible behavior tested. |
| P2-06 | Missions, death, and resource HUD / game + frontend + backend, scoped files | P2-02–P2-05 | One-hit MVP death returns to apartment; mission start/victory/retry states defined; tasks/reward history unchanged by death; HUD reconciles authoritative resources; refresh policy verified. |

## P3 — Tutorial and narrative

| ID | Work / owner | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| P3-01 | Original narrative and dialogue schema / narrative + orchestrator | P1-04 | Original caller/story; stable dialogue/trigger IDs, priority/cooldown/interrupt rules; portrait and sound requirements; no copied characters/dialogue. |
| P3-02 | Persistent tutorial and dialogue history / backend | P3-01, P2-06 | Progress and skip survive reload/server restart; cooldowns and seen history stable; repeated event requests safe; task completion never fabricated. |
| P3-03 | FIRST CALL tutorial and presentation / narrative + frontend + game, scoped files | P3-02 | Wake, ringing, movement, answer, contracts, computer, real task creation, reward explanation, training, second call, unlock implemented in agreed sequence; skip works; training uses an isolated resource policy; no false real-task completion required. |
| P3-04 | Contextual calls / narrative | P3-03 | First/three consecutive deaths, death without kills/with empty magazine/near victory, victory without firing, task streak, first victory evaluated; player can ignore calls; priority/cooldowns prevent repetition. |

## P4 — Cinematics and visual polish

| ID | Work / owner | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| P4-01 | Cohesive original asset set / art director | P1-01, approved scope | ART_BIBLE specifications followed; selected assets have verified registry entries; all required player/enemy/environment/effect animations share pixel scale; missing assets resolved with compatible originals. |
| P4-02 | Terminal, HUD, menu, loading/error/pause polish / frontend | P0-06, P2-06, P4-01 | Coherent retro UI; keyboard/focus/contrast checked; loading does not hide indefinite failure; task access retained; desktop resizing and reduced-motion needs considered. |
| P4-03 | Lighting, effects, transitions and audio / game + art, scoped files | P4-01, P3-03 | Neon/CRT/VHS treatment remains readable; hit stop/camera shake preserve input/pause correctness; audio obeys settings/browser unlock; no unlicensed media; screenshot and performance review recorded. |

## P5 — Final QA

| ID | Work / owner | Dependencies | Acceptance criteria |
| --- | --- | --- | --- |
| P5-01 | Persistence and API regression / QA | P0-06, P2-06, P3-04 | Duplicate requests, reopen/delete, transaction rollback, concurrent debit, network interruption, reload in combat/tutorial, and server restart tested with isolated durable DB evidence. |
| P5-02 | Gameplay and narrative browser regression / QA | P4-02, P4-03 | Movement/walls/aim/shoot/reload/melee/AI/death/apartment/victory, first call/tutorial skip/completion/contextual cooldowns verified; console errors and failures reproduced; screenshots where available. |
| P5-03 | Integration acceptance / orchestrator | P5-01, P5-02 | Type/lint/build/affected test gates pass as configured; visual consistency reviewed by art director; no P0 failures; known risks/untested paths reported; final acceptance traceable to actual evidence. |

## Completion reporting

Each assignment returns **Summary**, **Files**, **Verification** (commands and results), **Risks**, **Dependencies**, and **Status** (`DONE`, `BLOCKED`, or `NEEDS REVIEW`). Missing evidence is not a pass. If browser tooling is unavailable, mark browser scenarios unverified and report the limitation; do not close the applicable acceptance gate.
