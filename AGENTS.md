# DEADLINE: 1989 — project instructions

## Current scope

Bootstrap is complete. The user supplied the full master implementation goal on 2026-11-11, ending the bootstrap hold and authorizing application development, dependencies, original assets, testing, and GitHub publication. The user subsequently authorized a public repository and full-featured free GitHub Pages hosting. The repository is public; Pages is configured at `https://artyx71.github.io/deadline-1989/`, with deployment and browser-mode acceptance still pending. Current implementation and acceptance evidence are tracked in `docs/TASKS.md` and `docs/VERIFICATION.md`. The user subsequently requested Russian application text: interface, tutorial, dialogue, accessibility labels, and user-facing errors are Russian; keep the DEADLINE: 1989 identity and technical contract identifiers.

Use this directory as the project root; do not create a nested `deadline-1989/` checkout. The pnpm workspace contains `apps/web`, `apps/server`, `packages/shared`, and `packages/domain`. The native Fastify mode and the Pages browser mode share the same domain implementation.

## Product first

The product is fundamentally a To-Do List. Creating, completing, deleting, and persisting tasks across reloads are P0. Editing, filtering, and reopening are implemented supporting features. The game, tutorial, loading screens, and game failures must never prevent task management. Combat never completes real tasks; death never changes their completion status.

## Architecture and code quality

- React owns interfaces; Phaser owns game simulation; `@deadline/domain` owns task/reward/mission rules and SQLite schema. Fastify adapts the native API; a browser worker adapts Pages requests. SQLite owns persistent state in either mode. Use explicit typed contracts between them.
- Use strict TypeScript, validate external inputs, and avoid unnecessary `any`, dependencies, giant components, and giant game manager classes.
- Never swallow errors silently, duplicate business logic, or access SQLite from React components or Phaser. Browser database access is confined to the dedicated persistence worker/adapter. Handle loading and error states. Clean up event listeners, timers, scenes, and bridge subscriptions.
- Zustand holds transient client state; TanStack Query caches authoritative snapshots from the selected native/browser persistence adapter. Keep frame updates inside Phaser.
- The orchestrator owns shared contracts, dependency integration, architectural decisions, and final verification.

## Gameplay and persistence

- Deliver responsive top-down combat with one-hit death for MVP. Death returns to the apartment; real tasks remain unchanged.
- Completed real tasks earn ammunition and XP through definitions in `@deadline/domain`, shared by native and browser adapters. Melee is available without ammunition. Training must not require false task completion.
- SQLite is the source of truth. Native mode uses a server file; Pages uses SQL.js in a Web Worker and stores its SQLite bytes in IndexedDB under an origin-wide Web Lock. Browser mutations are confirmed only after durable IndexedDB completion. Issue each task reward at most once, including after reopening. Ordinary task deletion never rewards the player.
- Make task completion plus rewards atomic. Use transactions and durable idempotency for resource changes. Prevent negative ammunition and duplicate rewards. Reloads and restarts cannot restore spent ammunition.
- Pages profiles are local to that browser/device and do not synchronize with other devices or native profiles. Clearing site data removes the browser profile. Never silently switch a failed native connection to an empty browser profile.
- Starting a clean profile requires an explicit warning and consent before `POST /api/profile/reset` with `{confirmation: 'УДАЛИТЬ'}`. It clears tasks/resources/history while preserving settings, idempotency receipts, and monotonic revisions. The separate story/tutorial replay uses `/api/game/reset` and preserves real tasks, rewards, ammunition, and XP. Never erase data merely by opening the new-game choices.

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

| Agent              | Default ownership                                                                                                                            |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| game-engineer      | `apps/web/src/game/`                                                                                                                         |
| frontend-engineer  | `apps/web/src/components/`, `apps/web/src/features/`                                                                                         |
| backend-engineer   | `apps/server/`                                                                                                                               |
| pixel-art-director | `apps/web/public/assets/`, `docs/ART_BIBLE.md`, `docs/ASSET_CREDITS.md`                                                                      |
| narrative-designer | `apps/web/src/narrative/`, assigned narrative sections of `docs/GDD.md`                                                                      |
| qa-engineer        | `tests/`, `e2e/`, explicitly assigned test configuration                                                                                     |
| orchestrator       | `packages/shared/`, `packages/domain/`, persistence adapter integration, root configuration, dependency integration, architectural decisions |

Adapt paths through an explicit assignment. Whole-file ownership is preferred; serialize any shared document changes. Request a contract change from the orchestrator rather than changing another agent's files. Review every report and diff before integration, then run verification appropriate to the integrated change. An incomplete report is not success.

Every subagent reports these sections:

1. **Summary** — what was accomplished.
2. **Files** — created or modified paths.
3. **Verification** — commands/checks and actual results; identify anything untested.
4. **Risks** — known issues and uncertainties.
5. **Dependencies** — work needed from others, or none.
6. **Status** — `DONE`, `BLOCKED`, or `NEEDS REVIEW`.

`DONE` requires assigned acceptance criteria and verification to pass. Use `NEEDS REVIEW` for missing verification or unresolved design assumptions; use `BLOCKED` for a dependency preventing the assigned work. Never mark untested features verified.

## Tooling and publication

Use `pnpm format` and `pnpm format:check` through `scripts/workspace.mjs`; the colon in this checkout path makes ordinary PATH-based tool execution unreliable. Prettier ignores generated assets, evidence, dependencies, builds, and SQLite files. Keep functional and formatting commits reviewable. Pages build/test commands are `pnpm build:pages` and `pnpm test:pages`; their existence is not a passing check. GitHub Actions deploys the public repository from `feat/deadline-1989` without automatically merging into main. Report deployment success only after the workflow and live application have been verified; record evidence in `docs/VERIFICATION.md`.

## Reusable skills and execution order

Project skills: [asset-research](.agents/skills/asset-research/SKILL.md), [phaser-gameplay](.agents/skills/phaser-gameplay/SKILL.md), [pixel-art](.agents/skills/pixel-art/SKILL.md), [browser-qa](.agents/skills/browser-qa/SKILL.md). Use them when their descriptions match the task. Browser QA must disclose unavailable automation.

Future phases: architecture and asset research; apartment and movement; task terminal and SQLite; rewards and ammunition; combat and enemy AI; death and missions; tutorial and dialogue; loading, sound, and polish; final automated and browser QA. P0 remains the delivery gate throughout; build tests alongside features rather than postponing correctness until the final phase. See backlog dependencies for parallel work that preserves this priority.
