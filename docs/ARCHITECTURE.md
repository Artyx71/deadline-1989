# DEADLINE: 1989 — Architecture

This document defines boundaries for future implementation. Bootstrap contains instructions and documentation only. Implementation starts after the master implementation goal is supplied. Read [AGENTS.md](../AGENTS.md) and [architecture rules](../.agents/rules/architecture.md) before changing these boundaries.

## Product gate

Task creation, completion, deletion, and persistence after reload are P0. Task management must work while Phaser is loading, paused, unavailable, or reporting an error. Combat cannot complete tasks; death cannot change task status. Optional gameplay work must not delay or regress that gate.

## Monorepo layout

| Path | Responsibility | Primary owner |
| --- | --- | --- |
| `apps/web/` | React client and embedded Phaser game | Frontend/game engineers by subtree |
| `apps/web/src/components/`, `apps/web/src/features/` | Reusable UI and product features | Frontend engineer |
| `apps/web/src/game/` | Scenes, simulation, input, physics, animation | Game engineer |
| `apps/web/src/narrative/` | Dialogue content and presentation integration | Narrative designer |
| `apps/web/public/assets/` | Reviewed, licensed game assets | Pixel art director |
| `apps/server/` | Fastify API, domain services, Drizzle schema and migrations | Backend engineer |
| `packages/shared/` | Transport schemas, DTOs, error codes, bridge contracts | Orchestrator |
| `tests/`, `e2e/` | Cross-system verification when implementation begins | QA engineer |
| `.agents/`, `.codex/`, `docs/` | Development instructions, agent configuration, design | Orchestrator; explicit document delegation |

The existing repository root is the project root; do not add a redundant `deadline-1989/` wrapper. The future package graph uses pnpm workspaces. No manifests, application scaffolds, dependencies, or lockfile are created by bootstrap. The inspected machine has no available pnpm command, the repository has no initialized Git metadata, and dependency versions remain unpinned until implementation setup. Recheck these conditions before relying on them.

## Runtime ownership and dependency direction

- React owns menus, task terminal, HUD, accessible forms, settings, loading/error surfaces, pause UI, and dialogue overlays.
- Phaser 3 owns scene transitions inside the game, movement, aiming, Arcade Physics, collision, AI, mission simulation, and sprite animation. React rendering must not drive per-frame simulation.
- Fastify owns task business rules, reward definitions, authoritative resource mutations, mission/tutorial progress, dialogue history, validation, and idempotency.
- SQLite is the source of truth for all durable state. Drizzle owns schema access and migrations. A browser cache is never a second authority.
- Zod validates external inputs at the server boundary. Shared schemas/types describe public contracts; server domain logic and database internals remain server-only.
- Both applications may import `packages/shared`; shared code must not import either application, React, Phaser, Fastify handlers, or SQLite drivers. Web and server must not import one another's source modules.

TanStack Query owns remote state and mutation lifecycles. Zustand owns client-only UI state and a narrow game/UI bridge snapshot. Do not duplicate remote task/resource stores in Zustand. Phaser retains transient simulation state. Persisted server snapshots replace client guesses after reconnect or reload.

## Phaser integration and scene lifecycle

Create the Phaser instance through one React host with explicit mount and teardown. Pass a typed bridge adapter to the game; never give scenes React component references, QueryClient access, or database adapters. Use commands for UI-to-game intent and events for game-to-UI observations. Contracts live in `packages/shared/` after orchestrator review.

Commands include pause/resume, apply an authoritative resource snapshot, and enter a permitted mission. Events include scene readiness, interaction requests, mission observations, and fatal game errors. Define payload schemas and request identifiers where correlation is needed. A scene event is an observation until an API transaction confirms a durable effect.

Each scene owns and disposes its subscriptions, timers, keyboard handlers, physics callbacks, pools, and transient objects on shutdown/destroy. Repeated scene entry must not multiply callbacks. React unmount destroys the host and detaches bridge subscriptions. Pause must stop simulation/input while keeping task UI operable.

When a form, dialogue, menu, or modal owns focus, disable gameplay input. Ignore movement/shooting keys while editing text; prevent browser defaults only inside the active game surface. Restore focus predictably after overlays close. Prefer coarse state events and throttled HUD snapshots; avoid events or React state changes on every physics step.

## API boundaries and shared contracts

The initial contract surface is a proposal, not an implemented API. Final routes and schema fields require an orchestrator decision before consumers implement them.

| Domain | Intended API operations | Authority and safeguards |
| --- | --- | --- |
| Tasks | List, create, edit, complete, reopen, delete | Validate fields; server timestamps and identifiers; completion transaction records reward history |
| Resources | Read balance; consume ammunition through an idempotent operation | Server definitions; conditional debit; never negative |
| Missions | Read progress; start, checkpoint if approved, finish/abandon session | Validate state transitions and distinguish observations from authoritative progression |
| Tutorial | Read/update progress; skip | Durable permitted transitions; no fabricated task completion |
| Dialogue | Read eligible history; record playback/ignore/cooldown events | Stable trigger IDs and persisted cooldown policy |

Use separate completion/reopen operations or an equally explicit validated command to prevent an incidental edit from issuing rewards. Completion accepts task identity and a retry token, never client-provided reward amounts. Define structured errors with a stable code, safe message, field details where useful, and a correlation ID; choose status codes consistently. Do not expose stack traces or SQL internals.

At bootstrap, identity/authentication and deployment topology are unresolved. Do not infer anonymous multi-user access, public hosting, or an authentication system. Settle the intended single-user/local versus authenticated deployment before persistent schemas and route authorization are finalized.

## Persistence model

Proposed tables/entities are tasks; durable reward receipts; resource balances/ledger; idempotency operations; mission sessions/progress; tutorial progress; and dialogue history. Final names and columns await schema implementation. Store reward history independently of task reopening and deletion. A task tombstone or durable receipt must preserve the identity required to prove that its reward was already issued.

Task completion and reward issuance run in one transaction. The transaction validates the current state, creates a unique reward receipt for the task, updates task status, credits server-defined ammunition/XP only when the receipt is newly created, and stores the idempotent response. Uniqueness constraints and conditional writes enforce at-most-once issuance under concurrent requests. Reopening and subsequent completion retain the original receipt; deleting never rewards or removes proof of a reward. Deleting then creating a distinct task creates a distinct identity; any product-level abuse prevention is a later explicit decision.

Resource changes use transactions and a durable ledger or equivalent auditable receipt. A conditional debit succeeds only if the committed balance covers the cost. Repeating a request returns the original result without applying a second change. Reusing an idempotency key with a different payload returns a conflict. Failed operations must not record a false success. Keep retry records long enough for the promised retry behavior; define retention before implementation.

### Ammunition synchronization proposal

The conservative proposed baseline is a committed ammunition debit before a shot becomes effective in gameplay. A timeout has an unknown outcome: retry with the same operation ID or reconcile before firing. Reloading reads committed balances and cannot restore spent ammunition. Death, mission restart, and tutorial restart cannot roll back a committed debit.

This baseline may add unacceptable latency to rapid combat. Before implementing combat, benchmark it and resolve the [resource synchronization decision](DECISIONS.md#adr-004--authoritative-ammunition-consumption). A reservation/batch protocol is an alternative only with explicit durable allocation, per-session identities, consumed-versus-unconsumed accounting, crash/reconnect recovery, and no automatic refund of possibly spent rounds. An in-memory decrement followed by eventual persistence is not sufficient.

## State synchronization and failure behavior

After a successful mutation, apply the returned authoritative snapshot and invalidate affected queries. Optimistic UI may improve non-resource presentation only when rollback and stale-response handling are defined; never predict committed rewards or spendable ammunition. Use revisions or a documented equivalent to prevent delayed responses overwriting newer state.

On refresh or server restart, load tasks/resources/progress from SQLite through the API before enabling actions that depend on them. Loading a combat scene from scratch cannot restore an earlier balance. Define whether refresh abandons or resumes a mission before implementing mission persistence.

Show actionable loading, validation, connectivity, and server error states. Keep a failed form's input available. Retrying must preserve the original mutation identity. An offline client must not claim a task is durably saved; offline task queues require a separate approved design. Losing the game must not remove access to task management; losing the API must produce a clear terminal error with safe retry.

## Verification and integration

Use Vitest for domain and contract logic, API integration tests against isolated temporary SQLite databases, and Playwright for real browser workflows. Reward concurrency, transaction rollback, server restart, and ambiguous network outcomes need integration evidence. Phaser smoke checks must verify collisions, input focus, scene cleanup, pause, and death without task changes. Record browser availability and never present an unavailable check as passed.

The orchestrator reviews shared contracts and dependency changes, assigns one writer per file, integrates changes, and runs affected checks. Verification evolves with each feature; the final QA phase adds full regression evidence. See [testing rules](../.agents/rules/testing.md) and [backlog](TASKS.md).
