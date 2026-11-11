# DEADLINE: 1989 — Architectural decisions

Bootstrap records constraints and proposed implementation choices. **Accepted** means agreed direction, not implemented code. **Proposed** requires resolution before dependent implementation. Consult [architecture](ARCHITECTURE.md), [backlog](TASKS.md), and [AGENTS.md](../AGENTS.md).

## ADR-001 — Product independence and priority

**Context:** The game rewards real task completion, but the core product is a functional To-Do List.

**Options considered:** Require a running game to access tasks; expose the terminal independently of simulation.

**Decision:** React provides independent task management. Creation, completion, deletion, and reload persistence are P0 gates. Editing/reopening/filtering are planned terminal capabilities. Gameplay cannot complete tasks, and death cannot modify task status.

**Consequences:** Phaser loading/error/pause cannot block terminal access. Optional apartment exploration in the requested phase order stays bounded; it cannot delay the P0 gate. Verify task behavior with the game unavailable.

**Status:** Accepted.

## ADR-002 — System boundaries and shared contracts

**Context:** React, Phaser, and backend persistence have different lifecycles and authority.

**Options considered:** One global game manager/store; separate modules connected through explicit contracts.

**Decision:** React owns interfaces; Phaser owns simulation; Fastify owns business rules; SQLite owns durable state. Shared Zod schemas/DTOs and a typed React/Phaser bridge reside in `packages/shared/` under orchestrator ownership. TanStack Query owns server state, Zustand client UI state, and Phaser transient simulation.

**Consequences:** No frontend database access or per-frame React simulation updates. Shared code cannot import app internals. Scenes and the React host must remove subscriptions on teardown and respect UI focus.

**Status:** Accepted.

## ADR-003 — Atomic rewards and durable receipts

**Context:** Repeated completion, reopening, deletion, retries, and concurrency can accidentally mint resources.

**Options considered:** Infer rewards only from current task status; keep durable reward receipts with transactional task/resource changes.

**Decision:** Use SQLite transactions, unique task reward receipts, server-defined reward values, and persisted idempotency results. Completion and first reward are atomic. Reopening never resets reward history; deletion never rewards and preserves proof of previous issuance. Conditional debits prevent negative ammunition.

**Consequences:** Schema needs durable identity/history beyond mutable task state. Request payload conflicts must be detectable. Test rollback, duplicate/concurrent completion, reopen/recomplete, deletion, and concurrent spending at the API/database level.

**Status:** Accepted and implemented: durable receipts and idempotency records are retained; current contracts and verification are documented in ARCHITECTURE.md and VERIFICATION.md.

## ADR-004 — Authoritative ammunition consumption

**Context:** Rapid combat needs responsive shots; spent ammunition must survive refresh, death, retry, and server restart.

**Options considered:** Persist asynchronously after a local decrement; commit each shot before effective fire; durable reservation/batch allocation with recovery.

**Decision:** Proposed baseline is an idempotent committed debit before an effective shot. Reject asynchronous local spending as the persistence contract. Benchmark baseline latency before combat implementation. If insufficient, approve a reservation protocol that durably accounts for allocated/consumed rounds and ambiguous failure; no refund of potentially spent rounds without proof.

**Consequences:** Network latency may limit fire rate until a safe batching protocol is designed. Timeout recovery must reuse the operation ID or reconcile; reload never restores committed spend. Training resources must be explicitly isolated from persistent ammunition and rewards.

**Status:** Superseded by the master implementation goal and ADR-010 below.

## ADR-005 — Asset identity and provenance

**Context:** The desired neon crime atmosphere needs coherent visuals without copying protected game content.

**Options considered:** Mix readily available unrelated packs; select a compatible licensed set with original replacements; copy reference-game assets.

**Decision:** Use compatible licensed/original assets under [ART_BIBLE.md](ART_BIBLE.md). Record source, author, license, commercial use, modification, redistribution, and attribution evidence in [ASSET_CREDITS.md](ASSET_CREDITS.md). Hotline Miami references guide pacing/visual direction only. No downloads during bootstrap.

**Consequences:** Unverified licenses remain pending and block asset use. Missing or incompatible assets require original work or explicit art direction revision. Final palette/scale decisions may be tuned through screenshot review without inconsistent pixel density.

**Status:** Accepted; source research completed and one coherent original art/audio set selected. See ASSET_CREDITS.md.

## ADR-006 — Monorepo and implementation setup

**Context:** User requests React/TypeScript/Vite/Tailwind/Zustand/TanStack Query, Phaser 3/Arcade Physics/Tiled, and Node/Fastify/SQLite/Drizzle/Zod with Vitest/Playwright and pnpm workspaces.

**Options considered:** Nested duplicate project directory; use the existing workspace root with the requested three-package layout.

**Decision:** Existing root contains `apps/web`, `apps/server`, and `packages/shared`. Bootstrap adds instructions, documentation, configuration, an infrastructure validator, and empty application directories only. Defer manifests, dependency installation, lockfile, runtime pins, and application code to the master implementation goal.

**Consequences:** No runnable application or test suite exists after bootstrap. Inspection found pnpm unavailable and no initialized Git repository; recheck and resolve during future setup. Choose compatible verified versions at that time rather than inventing version pins now.

**Status:** Accepted.

## ADR-007 — Agent ownership and verification

**Context:** Six specialties need parallelism without conflicting writes or unverified integration.

**Options considered:** Unrestricted concurrent agents; orchestrator-led assignments with explicit ownership and acceptance.

**Decision:** Configure game, frontend, backend, pixel art, narrative, and QA roles with high reasoning where supported; limit concurrent subagents to four. Orchestrator owns integration/shared contracts, delegates narrow tasks, reviews reports, and verifies integrated changes. Require Summary/Files/Verification/Risks/Dependencies/Status reports.

**Consequences:** Shared-file edits serialize or transfer ownership explicitly. A configured role does not imply it has been live-discovered or its future feature verified. Tests accompany features; final QA adds regression coverage. Report unsupported tooling and unavailable browser evidence explicitly.

**Status:** Accepted; tool-level configuration validation is reported by bootstrap.

## ADR-008 — Deployment, identity, and recovery details

**Context:** Desktop-first browser scope does not establish hosting, authentication, multiple-user separation, offline operation, or whether missions resume after refresh.

**Options considered:** Local single-user service; authenticated hosted service; offline queue; mission abandon versus durable resume.

**Decision:** Keep these decisions open. Confirm deployment and identity before schema/API finalization; confirm mission refresh behavior and retry retention before resource/mission implementation. Offline mutations are excluded until an explicit durable queue design is approved.

**Consequences:** Do not invent an authentication system or imply a public deployment is secure. UI must report unavailable persistence honestly. All recovery options must preserve tasks/reward history and committed ammunition spend.

**Status:** Superseded by ADR-010: one local loopback profile, no offline mutation queue, interrupted attempts explicitly abandoned with durable settlement.

## ADR-009 — Isolated training ammunition

**Context:** FIRST CALL includes shooting practice, while users must never falsely complete real tasks to proceed.

**Options considered:** Require earned mission ammunition; skip shooting practice; provide isolated training ammunition.

**Decision:** Training uses clearly labeled nonpersistent ammunition that cannot enter the mission inventory, grant XP, issue rewards, or alter real tasks. Tutorial skip remains available.

**Consequences:** Game and backend engineers must review an explicit training boundary in the shared contract before implementation. The amount and presentation remain tuning choices. Exiting training restores the authoritative mission inventory without importing training rounds.

**Status:** Accepted and implemented; browser FIRST CALL completes using isolated temporary rounds without completing any real task.

## ADR-010 — Master implementation and durable mission allocation

**Context:** The master goal supplied on 2026-11-11 explicitly defines one local profile and selected mission ammunition with unused-round refunds.

**Options considered:** Debit inventory per shot; durable mission allocation with idempotent per-shot consumption; unsafe eventual client persistence.

**Decision:** Starting an attempt atomically reserves selected inventory rounds. Each shot commits one spent round before becoming effective. Finishing or abandoning refunds reserved minus spent exactly once. A refresh detects the active attempt and asks the player to settle its recorded unused rounds; it cannot restore spent rounds. Mission attempts, resource ledger and request receipts survive restart. Gameplay reset preserves tasks, reward history, ammunition and XP. Use one loopback-only local profile; hosted multi-user use requires authentication and isolation.

**Consequences:** Local network round-trip latency is part of firing; errors retain the same shot operation key. Finish waits for pending shots. Client game observations cannot mint resources. Branch is `feat/deadline-1989`; private GitHub synchronization is authorized without merging.

**Status:** Accepted and implemented; API rollback/concurrency/restart tests, browser interrupted-mission recovery, and actual combat death/victory settlement pass.

## ADR-011 — Tool execution in a path containing a colon

**Context:** The user workspace is `Project:Deadline`. A colon is a Unix PATH delimiter, so pnpm cannot add its node_modules/.bin directory to PATH reliably.

**Options considered:** Rename/move the workspace; rely on a symlink; call tools through explicit Node entry points.

**Decision:** Preserve the workspace and use `scripts/workspace.mjs` for root pnpm commands. It invokes the installed TypeScript, Vite, Vitest, ESLint and Playwright entry points directly. Use TypeScript 6.0.3, compatible with the installed typescript-eslint peer range, rather than incompatible TypeScript 7.

**Consequences:** Standard `pnpm dev`, `pnpm build`, `pnpm test`, and checks work without putting the colon-containing directory in PATH. `pnpm exec` should be replaced with documented scripts or direct Node entry points in this checkout.

**Status:** Accepted; shared build/lint and dependency installation verified.

## ADR-012 — Russian application language

**Context:** During final acceptance the user requested that the application be translated into Russian.

**Options considered:** Add a multilingual framework and language selector; deliver the requested Russian interface directly.

**Decision:** Use Russian for user-facing interface text, task labels, tutorial, original dialogue, accessible labels, validation, and runtime errors. Keep DEADLINE: 1989, keyboard key names, routes, persisted enum values, and technical identifiers stable. Use Russian date formatting. Browser tests prefer stable test IDs so wording does not determine behavior.

**Consequences:** No translation dependency or database migration is needed. Existing tasks and resource history stay intact. Original English diegetic room signs remain part of the 1989 setting; they are not interface instructions. Repeat layout and browser acceptance with Cyrillic text.

**Status:** Accepted; implementation and current verification recorded in VERIFICATION.md.
