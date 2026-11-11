# DEADLINE: 1989 — Game Design Document

This document describes the implemented product and its design constraints. It is not a claim that every quality gate has passed. Current test results, browser evidence, and remaining checks belong in [VERIFICATION.md](VERIFICATION.md).

## Product concept and priorities

DEADLINE: 1989 is a desktop-first browser To-Do List integrated with an original pixel-art, top-down crime thriller. Real task completion earns ammunition and experience for fictional night missions.

Creating, completing, deleting, and persisting tasks after reload are P0. The terminal remains available from the React shell during game loading, pause, or renderer failure. Combat never completes a real task, and death never changes task status. Gameplay, tutorial instructions, and phone calls cannot require false task completion.

Hotline Miami and Hotline Miami 2 are references for pacing, silhouettes, and atmosphere. Characters, dialogue, maps, artwork, and audio have an original project identity; provenance is recorded in [ASSET_CREDITS.md](ASSET_CREDITS.md). The supplied screenshot references and their interpretation are recorded in [ART_BIBLE.md](ART_BIBLE.md).

## Core loop

1. Open the task terminal from the computer, Tab, or the shell terminal button.
2. Create and manage real tasks; mark a task complete only after doing its real work.
3. Receive the server-confirmed once-only ammunition and XP reward.
4. Explore the safe apartment, answer or ignore calls, and choose a mission loadout.
5. Fight with carried ammunition, reloading, dash, and ammunition-free melee.
6. Return to the apartment after death or victory with unused ammunition refunded. Real tasks and XP remain intact.

## Apartment hub

The original apartment contains a bedroom/wake location, living area, kitchen, computer, telephone, television, weapon cabinet, exit, and training access. It has no combat enemies. Furniture and walls use physical collision; nearby objects show E interaction prompts.

The computer opens the task terminal. The telephone offers eligible narrative calls and dispatch when the first mission is unlocked and no call is pending. The cabinet opens loadout/inventory. The television opens a muted external promotional broadcast. Source-host restrictions show a truthful no-signal message; closing the overlay resumes play. No third-party recording is bundled. The exit opens mission dispatch. Training uses a separate industrial range, reached through the highlighted lower-right door or the tutorial action, and temporary ammunition. The apartment remains a safe studio with a desk-mounted computer, table-supported phone, and doors fitted to wall openings. A persistent paper task brief offers direct task creation; a night-contract card and exit beacon explain how to leave for combat.

The world uses a 768×480 logical canvas, 16px base tiles, and 32px character frames with nearest-neighbor pixel rendering. Camera follow, environmental animation, restrained neon lighting, and original room detail establish the visual language. Quality findings and screenshot comparisons remain in the verification/art documents.

## Task terminal

The React CRT terminal supports create, edit, complete, reopen, delete, descriptions, difficulty, optional deadlines, active/completed/all filters, completion statistics, and reward receipts. It is reachable independently of Phaser. Opening it during play pauses simulation.

Task records contain identity, title, description, difficulty, status, deadline, creation/update/completion timestamps, and reward-history display. Loading, pending commits, validation, connectivity failures, and reconnect actions are visible. A failed save does not imply persistence succeeded.

Deleting never issues a reward or removes a previously earned receipt. Reopening retains reward history. Recompletion cannot pay again. Completion effects follow a committed API response.

## Reward system

| Difficulty | Ammunition | XP |
| --- | ---: | ---: |
| Easy | 3 | 50 |
| Normal | 6 | 100 |
| Hard | 12 | 200 |

The backend owns these definitions and exposes them for display through `/api/rules`. A new local profile starts with zero ammunition and zero XP. Completion, a unique reward claim, resource credits, and the retry receipt commit atomically. The client cannot supply reward amounts.

XP is accumulated progress, with no XP threshold restricting task management. Mission combat grants no task-completion rewards. Training grants no persistent ammunition or XP.

## Combat and controls

| Input | Action |
| --- | --- |
| WASD | Move, with normalized diagonals |
| Mouse | Aim |
| Left click | Attack; pistol when loaded, melee fallback when empty |
| F / right click | Melee |
| E | Interact |
| R | Reload |
| Shift | Dash |
| Tab | Task terminal |
| Escape | Pause / close an overlay |

| Parameter | Current value |
| --- | ---: |
| Player health | 1 HP |
| Movement | 220 px/s |
| Dash | 400 px/s for 150 ms |
| Dash cooldown | 850 ms |
| Pistol magazine | 6 rounds |
| Fire interval | 250 ms |
| Reload | 900 ms |
| Melee cooldown | 400 ms |
| Melee reach | 44 px |
| Bullet speed | 760 px/s |

Phaser owns aiming, physics, obstacles, projectile collision, hit stop, and animation. React owns focus and overlays. Menus, forms, dialogue, browser blur, and pause suppress gameplay input. Reduced motion reduces visual effects; CRT treatment and audio have persisted settings.

## Enemies and mission

The single mission has backend ID `first-shift` and the player-facing dispatch presentation THE NIGHT SHIFT / FIRST SHIFT. It contains four Grunts with 1 HP and two Gunners with 2 HP, arranged across a multiroom office with doors, cover, and obstacles.

Enemy state machines use IDLE, PATROL, ALERT, CHASE, ATTACK, SEARCH, and DEAD. Grunts pursue and attack nearby; Gunners use ranged attacks and distance control. Solid obstacles block sight and projectiles. Pathfinding routes around obstacles. These are implementation behaviors whose current verification is recorded separately.

Defeating all six enemies clears the floor. The server records completion count and best time. Death resets the encounter. Missions can be replayed; there is no additional campaign or combat-generated resource reward in this scope.

## Ammunition and durable mission attempts

Before deployment, choose how many rounds to carry, including zero for melee-only play. The backend subtracts that allocation from inventory and creates one durable active attempt. It rejects a second active attempt and insufficient inventory.

Every live mission shot commits one unit of that attempt's reserved ammunition before becoming effective. Retries reuse their request identity. Reloading transfers rounds inside the carried loadout; it cannot create ammunition.

On death, victory, or explicit abandonment, the server settles once and returns only `reserved − spent`. Spent rounds stay spent. Death changes gameplay death statistics, while tasks, receipts, and XP remain intact. Victory saves mission progression without awarding resources.

Refresh or server restart preserves an active attempt and its spent counter. The browser shows recovery and requires explicit abandonment before returning unused rounds and entering the apartment. Reading state alone never refunds a reservation. Exact combat simulation is not resumed after refresh.

## Death and victory presentation

One successful enemy hit kills the player. Death has hit stop, a red flash, animation, an audio interruption, and a YOU ARE DEAD result. Victory presents FLOOR CLEARED. Results include time, eliminations, shots/accuracy, ammunition spent, and melee kills where applicable.

Settlement confirms the durable resource result before return. A failed settlement offers retry and task access. Returning wakes the player in the apartment; contextual calls are optional. Result presentation and transitions are skippable without changing settlement rules.

## FIRST CALL tutorial

The physical sequence is:

1. Wake in the apartment while the telephone rings.
2. The first call automatically opens as an original cinematic introduction, explicitly explaining the real To-Do List.
3. Learn movement and optional telephone interactions; learn the contract system.
4. Approach/open the computer.
5. Create a real task without falsely completing it.
6. Read the once-only reward explanation.
7. Enter training with temporary practice ammunition.
8. Aim, shoot, reload, and practice melee in order.
9. Return to the apartment for the second call.
10. Complete that call and unlock the first mission.

The persisted tutorial cursor is `wake → movement → first-call → computer → create-task → rewards → training → aim → shoot → reload → melee → second-call → complete`. Physical actions and narrative beats share cursors where appropriate. Out-of-order events do not advance the reducer.

Training provides 36 temporary rounds with no persistent resource debit or credit. Skipping persists completion/skip and unlocks the first mission. New Game defaults to a clean profile: after an explicit warning and consent checkbox, it deletes all tasks, receipts, ammunition, XP and progression while retaining settings. A separate Repeat Story choice preserves tasks and earned resources. An active mission must be settled before either reset.

## Caller and dialogue

NO. 9 is an unidentified recurring caller in an original late-1980s crime-noir story. Fixed original lines connect the fictional night shift with the user's real obligations. Dialogue does not ingest private task text or send it to an external generation service.

Presentation uses original pixel portraits, speaker names, typewriter text, text sound, background dimming, Enter/click reveal and progression, and an ignore option. Reduced motion reveals text immediately. Answered and ignored calls both leave durable history; neither changes task completion.

Tutorial calls take priority. Contextual candidates are ordered: first death; three consecutive deaths; death with at least five kills; empty-magazine death; death without kills; victory without firing; first victory; at least three reward claims. Each ID is offered once until a gameplay reset. A global 60-second interval between contextual acknowledgements suppresses repetitive calls; tutorial calls bypass that contextual cooldown. Victory resets the consecutive-death count. Ringing remains optional and does not interrupt task management.

## Startup, menus, audio, and settings

Startup uses black/VHS/logo/glitch phases and real Phaser loading progress. The cinematic can be skipped after renderer readiness or a reported renderer failure. The shell terminal stays available during initialization. The animated main menu offers START GAME, CONTINUE, SETTINGS, and CREDITS with mouse and keyboard navigation.

Original generated WAV music and effects are loaded through a Web Audio graph after a browser gesture. Music states are MAIN_MENU, APARTMENT, TASK_TERMINAL, PHONE_DIALOGUE, COMBAT, PLAYER_DEATH, and MISSION_CLEARED. The graph owns transitions, crossfades, dialogue ducking, pause handling, and source cleanup. Music and SFX provenance belongs in the asset registry; file existence is not a listening-quality claim.

Master/music/SFX volume, mute, Streamer Mode, reduced motion, and CRT scanlines persist on the backend. Streamer Mode requires suitable streaming rights; uncertain tracks must be disabled. Required effects include movement, weapons, impacts, telephone, computer/menu interactions, task completion, death, victory, and ambience.

## Current scope and evidence

The implemented scope is one local profile (native Fastify/SQLite or browser-local SQLite on free GitHub Pages, without device synchronization), independent task management, one apartment, isolated training, one six-enemy mission, durable resources/progression, original caller/tutorial, menus/cinematics/audio, and coherent original pixel assets. Additional campaigns, weapons, XP unlock trees, authentication, and public multi-user hosting are future product work.

See [ARCHITECTURE.md](ARCHITECTURE.md) for contracts and persistence, [TASKS.md](TASKS.md) for milestone status, [DECISIONS.md](DECISIONS.md) for decisions, and [VERIFICATION.md](VERIFICATION.md) for actual passes, failures, evidence, and remaining gates.
