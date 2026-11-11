# DEADLINE: 1989 — project instructions

## Current scope

Bootstrap is complete only when instructions, agent definitions, skills, and documentation are validated. Wait for the user's master implementation goal before creating application code, dependencies, React components, Phaser scenes, backend code, or downloading assets. This bootstrap hold ends when the user supplies that implementation goal; it is not a permanent ban on development.

Use this directory as the project root; do not create a nested `deadline-1989/` checkout. The intended layout is `apps/web`, `apps/server`, and `packages/shared`, using pnpm workspaces when implementation starts.

## Product first

The product is fundamentally a To-Do List. Creating, completing, deleting, and persisting tasks across reloads are P0. Editing, filtering, and reopening are planned supporting features. The game, tutorial, loading screens, and game failures must never prevent task management. Combat never completes real tasks; death never changes their completion status.

## Architecture and code quality

- React owns interfaces; Phaser owns game simulation; Fastify owns business logic; SQLite owns persistent state. Use explicit typed contracts between them.
- Use strict TypeScript, validate external inputs, and avoid unnecessary `any`, dependencies, giant components, and giant game manager classes.
- Never swallow errors silently, duplicate business logic, or access the database from the frontend. Handle loading and error states. Clean up event listeners, timers, scenes, and bridge subscriptions.
- Zustand holds transient client state; TanStack Query handles server state. Keep frame updates inside Phaser.
- The orchestrator owns shared contracts, dependency integration, architectural decisions, and final verification.

## Gameplay and persistence

- Deliver responsive top-down combat with one-hit death for MVP. Death returns to the apartment; real tasks remain unchanged.
- Completed real tasks earn ammunition and XP through server-defined rewards. Melee is available without ammunition. Training must not require false task completion.
- SQLite is the source of truth. Issue each task reward at most once, including after reopening. Deleting tasks never rewards the player.
- Make task completion plus rewards atomic. Use transactions and durable idempotency for resource changes. Prevent negative ammunition and duplicate rewards. Reloads and restarts cannot restore spent ammunition.

## Art direction and quality

Use original pixel art or properly licensed assets with documented rights. Keep tile dimensions, sprite proportions, palette, and pixel density consistent. Aim for a neon late-1980s crime atmosphere. Hotline Miami and Hotline Miami 2 are pacing and visual references only; never copy their code, sprites, maps, characters, portraits, dialogue, or soundtrack.

A working but visually generic prototype is not the final quality target. A beautiful game with broken task persistence is unacceptable. Product correctness and game quality both matter. Pixel Art Director review has high priority during visual development, while P0 correctness remains the release gate.

## Read relevant project rules

These Markdown files are instructions referenced by this file, not a claim that Codex automatically loads `.agents/rules/`:

- [Architecture](.agents/rules/architecture.md): module boundaries, contracts, bridge, and lifecycle.
- [Gameplay](.agents/rules/gameplay.md): movement, collision, combat, AI, and mission transitions.
- [Frontend](.agents/rules/frontend.md): component structure, state, accessibility, and keyboard input.
- [Backend](.agents/rules/backend.md): transactions, idempotency, validation, and migrations.
- [Art direction](.agents/rules/art-direction.md): palette, dimensions, animation, lighting, and licensing.
- [Testing](.agents/rules/testing.md): coverage, browser checks, regressions, and evidence.

Read the relevant rules before modifying that area. Read [GDD](docs/GDD.md), [architecture](docs/ARCHITECTURE.md), and applicable decisions in [DECISIONS](docs/DECISIONS.md) before design changes. Visual work also reads [ART_BIBLE](docs/ART_BIBLE.md) and updates [ASSET_CREDITS](docs/ASSET_CREDITS.md). Track implementation in [TASKS](docs/TASKS.md). Read [bootstrap validation](docs/BOOTSTRAP.md) for environment capabilities and limitations.

## Collaboration protocol

The main agent owns integration. Before delegation, give a narrow task, dependencies, exclusive file ownership, acceptance criteria, and verification requirements. Run independent assignments in parallel only; never edit the same files concurrently. Cap active subagents at four, or fewer when the host allows fewer total agents. Subagents must not spawn further agents without an explicit allocation from the orchestrator. Ownership is a coordination rule, not a filesystem sandbox.

| Agent | Default ownership |
| --- | --- |
| game-engineer | `apps/web/src/game/` |
| frontend-engineer | `apps/web/src/components/`, `apps/web/src/features/` |
| backend-engineer | `apps/server/` |
| pixel-art-director | `apps/web/public/assets/`, `docs/ART_BIBLE.md`, `docs/ASSET_CREDITS.md` |
| narrative-designer | `apps/web/src/narrative/`, assigned narrative sections of `docs/GDD.md` |
| qa-engineer | `tests/`, `e2e/`, explicitly assigned test configuration |
| orchestrator | `packages/shared/`, root configuration, dependency integration, architectural decisions |

Adapt paths through an explicit assignment. Whole-file ownership is preferred; serialize any shared document changes. Request a contract change from the orchestrator rather than changing another agent's files. Review every report and diff before integration, then run verification appropriate to the integrated change. An incomplete report is not success.

Every subagent reports these sections:

1. **Summary** — what was accomplished.
2. **Files** — created or modified paths.
3. **Verification** — commands/checks and actual results; identify anything untested.
4. **Risks** — known issues and uncertainties.
5. **Dependencies** — work needed from others, or none.
6. **Status** — `DONE`, `BLOCKED`, or `NEEDS REVIEW`.

`DONE` requires assigned acceptance criteria and verification to pass. Use `NEEDS REVIEW` for missing verification or unresolved design assumptions; use `BLOCKED` for a dependency preventing the assigned work. Never mark untested features verified.

## Reusable skills and execution order

Project skills: [asset-research](.agents/skills/asset-research/SKILL.md), [phaser-gameplay](.agents/skills/phaser-gameplay/SKILL.md), [pixel-art](.agents/skills/pixel-art/SKILL.md), [browser-qa](.agents/skills/browser-qa/SKILL.md). Use them when their descriptions match the task. Browser QA must disclose unavailable automation.

Future phases: architecture and asset research; apartment and movement; task terminal and SQLite; rewards and ammunition; combat and enemy AI; death and missions; tutorial and dialogue; loading, sound, and polish; final automated and browser QA. P0 remains the delivery gate throughout; build tests alongside features rather than postponing correctness until the final phase. See backlog dependencies for parallel work that preserves this priority.
