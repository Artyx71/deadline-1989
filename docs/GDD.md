# DEADLINE: 1989 — Game Design Document

Status: bootstrap design baseline. The product requirements below are agreed; details explicitly marked **proposed** need review during future implementation. No gameplay, backend, UI, assets, or dependency installation is authorized by this document. Wait for the master implementation goal.

## Product concept and priorities

DEADLINE: 1989 is a desktop-first browser To-Do List integrated with an original pixel-art, top-down crime thriller set in a late-1980s atmosphere. Completing real tasks earns ammunition and experience; the player spends ammunition during missions.

Task creation, completion, deletion, and persistence across page reload are P0. A user must be able to manage tasks while the game is unavailable, loading, paused, or skipped. Combat never completes real tasks. Death never changes a real task's completion state. A functional To-Do List is the first acceptance gate for any integrated release.

Hotline Miami and Hotline Miami 2 are references for pace, silhouette clarity, and atmosphere only. All story, characters, dialogue, maps, art, music, and code must be original or separately licensed.

## Core gameplay loop

1. Open the task terminal or its independently accessible interface.
2. Create and manage real tasks; complete a task only when its real work is done.
3. The server atomically records completion and issues its one eligible reward.
4. Review ammunition and experience confirmed by the server.
5. Explore the apartment, answer optional calls, and enter an unlocked mission.
6. Fight using persistent ammunition and ammunition-free melee.
7. Return to the apartment after death or mission completion; real task status remains intact.

Gameplay is optional. No mission, phone call, animation, or tutorial step may block task management.

## Apartment hub

The apartment contains a wake-up location, telephone, computer terminal, mission entry interaction, and training access. It is the player's return point after death. Interactions need clear prompts and accessible UI equivalents where relevant.

The player may answer or ignore ringing calls. The apartment must remain navigable while optional calls are pending. **Proposed:** use an original cramped, rain-lit apartment above a closed print shop as the visual setting; floor plan and environmental storytelling remain open.

## Task terminal

The computer presents the task interface using coherent retro terminal styling. The same task operations must remain reachable independently of Phaser and the in-world computer interaction.

Required P0 behavior: create, complete, delete, and reload with state intact. Editing, filtering, and reopening are planned supporting operations. Display pending operations, server errors, and retry actions. Confirmed task state comes from the API and SQLite; cached client state must reconcile after refresh or interruption.

Deleting a task never grants a reward. Reopening a task does not erase its reward history. Completing a reopened task cannot issue a second reward. A UI animation must not report completion or resources as confirmed before the server accepts the operation.

## Reward system and persistent resources

The backend defines reward amounts. Clients cannot choose or multiply rewards. Task completion and initial reward issuance are one transaction, with durable history and duplicate-request protection. SQLite is authoritative for ammunition, XP, tasks, and progress.

Ammunition cannot become negative. Spent ammunition cannot return through page refresh, reconnect, death, or server restart. Resource-changing actions must use server-authorized, retry-safe operations. The exact combat authorization and synchronization protocol is an implementation decision requiring architecture review before weapons are built.

**Open design decisions:** reward quantities, task eligibility rules, ammunition types, XP thresholds, and progression unlocks. XP must not introduce a paid or gameplay-only gate to task CRUD. Mission victory does not complete tasks or grant task-completion rewards.

## Combat and controls

MVP combat is fast, readable, top-down action with responsive movement, normalized diagonals, mouse aiming, wall collisions, projectile collisions, reloading, melee, and one-hit player death. Melee remains usable at zero ammunition. Solid obstacles block enemy vision.

Keyboard mappings, dash availability, weapon counts, magazine sizes, and combat tuning remain **proposed/open**. Provide discoverable controls and avoid gameplay shortcuts firing while a task input or dialogue control has focus. React owns UI; Phaser owns frame-by-frame simulation.

Weapons, enemy bodies, telegraphs, and important interactions must retain readable silhouettes under neon lighting and effects. Camera shake, hit stop, flashes, and CRT treatments need reduced-effect settings.

## Enemies

Enemy finite state machines cover idle, patrol, detection/chase, attack, and death. Occlusion-aware line of sight and physical collision prevent attacks through solid walls. State transitions must be inspectable and testable outside rendering where practical.

**Proposed MVP scope:** one readable enemy archetype before adding variants. Enemy counts, equipment, perception distances, patrol routes, and alert sharing remain open. No enemy or kill event may alter real task completion.

## Death and return

One hit kills the player in the MVP. Death stops active combat, cleans up scene-owned work, and returns the player to waking in the apartment. Consumed ammunition stays consumed; real tasks and reward history stay intact.

An optional contextual call may be queued. Death does not force repeated dialogue. Reload during combat must reconcile persistent resources and return to a documented recovery state. **Proposed:** interrupted combat returns to the apartment rather than attempting an exact simulation resume; confirm this during architecture planning.

## Tutorial: FIRST CALL

The tutorial sequence is:

1. Player wakes up in the apartment.
2. The telephone rings.
3. The player learns movement.
4. The player approaches the telephone.
5. The player answers the mysterious caller.
6. The caller introduces contracts.
7. The player approaches the computer.
8. The player creates a real task.
9. The player learns how task rewards work.
10. The player enters the training area.
11. The player practices shooting and melee.
12. A second telephone call occurs.
13. The first mission unlocks.

The tutorial is skippable and its progress persists. Skipping must provide a usable route to the first mission and task interface without requiring false task completion. Creating a real task is part of the guided route; the user can skip that route. Reward explanations must explicitly say that combat does not complete tasks.

Training must not require the user to falsely complete real work. **Bootstrap design decision:** use a clearly labeled training-only ammunition supply isolated from the persistent inventory, unusable in missions and unable to issue XP or rewards. The isolation rule is accepted in ADR-009; its shared contract and backend integration still require review before implementation.

## Phone calls and dialogue

The caller is mysterious, economical, and original. **Proposed narrative premise:** anonymous instructions on the telephone connect mundane obligations with a fictional network of nocturnal contracts. The user's real task text is private productivity data and must not be incorporated into generated dialogue or external services without a separate product decision.

Dialogue presentation includes original or licensed pixel-art portraits, speaker names, typewriter text, optional text sounds, Enter/click progression, skipping, and background dimming. Preserve keyboard focus, support immediate text reveal, and respect reduced motion and audio settings. Task management remains reachable.

Contextual call candidates include first death, three consecutive deaths, death without kills, death with an empty magazine, death near mission completion, victory without firing, multiple tasks completed, and first mission victory.

Use event identifiers, priorities, durable seen-state, and cooldowns. One event may qualify for multiple calls; queue a chosen eligible call once and avoid interrupting a higher priority conversation. **Proposed priority:** tutorial-critical calls, first-occurrence milestones, then repeatable commentary. Thresholds for “near completion,” “multiple tasks,” cooldowns, expiry, and streak resets remain open. Answering or ignoring a call must never modify task completion or invent rewards.

## Loading screens and transitions

Loading screens provide clear progress or status, a useful error/retry path, and a consistent retro identity. Prepare original transition art and tips only after asset approval. Do not conceal stalled API calls under an indefinite cinematic.

Task UI must work without waiting for game asset loads. Scene transitions must release old input handlers, timers, and event subscriptions. Glitch transitions and dimming need motion/flash controls.

## Mission progression

Missions have explicit locked, available, loading, active, succeeded, failed, and interrupted/recovery states. Persistent unlocks and completion belong to the backend; moment-to-moment combat belongs to Phaser. First mission availability follows tutorial completion or skip.

Mission results are separate from real tasks. The amount of persistent mission history, replay behavior, unlock conditions beyond the first mission, and any non-task rewards remain open. Keep the initial mission set small enough to verify collisions, resource spending, death, and return before expansion.

## MVP boundaries and future sequence

MVP product scope is task CRUD and persistence, followed by a coherent apartment, task rewards, ammunition persistence, a small combat loop, death/return, a skippable FIRST CALL tutorial, contextual dialogue, and consistent original visual treatment. Advanced weapon variety, larger campaigns, elaborate cinematics, complex enemy coordination, and extensive effects are optional expansions.

Future planning sequence from the brief: architecture and asset research; apartment/movement; task terminal/SQLite; rewards/ammunition; combat/AI; death/mission lifecycle; tutorial/dialogue; loading/audio/polish; final automated and browser QA. This is planning guidance, not authority to implement now. P0 task CRUD takes precedence whenever this sequence could block standalone task access. Tests accompany each future change; the final QA phase consolidates evidence and regressions.

## Related documents

- [Architecture](ARCHITECTURE.md) defines contracts and persistence responsibilities.
- [Art bible](ART_BIBLE.md) defines visual standards and review gates.
- [Asset registry](ASSET_CREDITS.md) records provenance and rights evidence.
- [Backlog](TASKS.md) records dependencies and acceptance criteria.
- [Decisions](DECISIONS.md) records accepted and pending design choices.
