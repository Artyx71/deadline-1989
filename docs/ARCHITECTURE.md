# DEADLINE: 1989 — Architecture

This document describes the implemented system. It does not certify completion or test coverage; consult [VERIFICATION.md](VERIFICATION.md) for current evidence. Project ownership rules remain in [AGENTS.md](../AGENTS.md) and [architecture rules](../.agents/rules/architecture.md).

## Product gate

Task creation, completion, deletion, and reload persistence are P0. React exposes task management while Phaser loads, pauses, or fails. Combat never completes tasks; death never changes task status. Resource integrity takes priority over optional simulation or visual features.

## Workspace and tooling

| Path | Responsibility |
| --- | --- |
| `apps/web/src/components/`, `features/` | React shell, task terminal, forms, menus, HUD, dialogue, settings |
| `apps/web/src/game/` | Phaser scene, input, Arcade Physics, weapons, enemies, paths, simulation |
| `apps/web/src/narrative/` | Original dialogue and pure tutorial progression |
| `apps/web/src/audio/` | Web Audio graph and state-driven playback |
| `apps/web/public/assets/` | Original/registered images, Tiled-compatible map data, audio |
| `apps/server/src/` | Fastify routes, domain services, Drizzle schema, SQLite connection |
| `apps/server/migrations/` | Versioned SQL migrations |
| `apps/server/tests/` | Real SQLite API integration tests |
| `packages/shared/src/` | Zod transport schemas, DTOs, game/UI bridge contracts |
| `e2e/`, `playwright.config.ts` | Browser scenarios and isolated server startup |
| `.agents/`, `.codex/`, `docs/` | Agent infrastructure, project rules, design, evidence |

This existing directory is the monorepo root. pnpm is installed; `package.json` pins pnpm 12.18.0 and Node >=24, with dependency versions recorded in manifests and the lockfile. React/TypeScript/Vite/Tailwind/Zustand/TanStack Query serve the client; Phaser 3 uses Arcade Physics and Tiled-compatible exports; Fastify/better-sqlite3/Drizzle/Zod serve persistence. Vitest and Playwright provide verification.

The checkout name contains `:`. `scripts/workspace.mjs` resolves tool entry points directly with Node, avoiding PATH/`pnpm exec` problems caused by that character. Root commands `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm test:e2e` call this runner; `node scripts/workspace.mjs <mode>` is the equivalent direct invocation. `pnpm start` runs the built server.

## Runtime ownership and dependency direction

React owns interfaces, accessibility, focus, loading/error presentation, and the application session. Phaser owns frame-level movement, aiming, collision, AI, projectiles, animation, and camera. Fastify owns validated business operations, rewards, inventory, progression, and retry safety. SQLite is the durable source of truth.

Both applications depend on `@deadline/shared`; shared contracts do not import either application or framework internals. Web never imports server/database code. The server validates external input with Zod. The API adapter validates returned snapshots rather than relying on TypeScript alone.

TanStack Query caches server snapshots and mutation results. Zustand holds transient screen/overlay/HUD state. Phaser retains transient simulation. No React state update drives each game frame. Reward amounts come from server definitions; `/api/rules` provides UI display values.

## Local profile and serving

The MVP uses one local profile without authentication. Fastify defaults to `127.0.0.1:3001`; `HOST`, `PORT`, and `DATABASE_PATH` configure startup. The default database path is `data/deadline.sqlite`, relative to the server working directory. Development Vite defaults to port 5173 and proxies `/api` to the backend; `VITE_PORT` and `VITE_API_TARGET` support isolated test ports.

The built server serves `apps/web/dist` when present and uses a single SPA fallback for non-API paths. API misses retain structured 404 errors. Public multi-user deployment requires authentication, profile isolation, authorization, and deployment hardening; changing the listen address does not provide those features.

## React/Phaser integration and lifecycle

`App` dynamically creates one Phaser host through `createGame`; `useSession` owns the typed `GamePort` and controller. The shared bridge exposes pause, scene entry, effects/phone state, and destruction; game events report loading, readiness, interactions, HUD, outcomes, tutorial actions, sounds, prompts, and errors. `spendShot()` requests committed authorization through the API.

Scenes receive bridge contracts, not React components, QueryClient, or database adapters. Only coarse events cross into React; HUD observations are throttled/deduplicated. Scene readiness has a version so overlay/focus pause state is reapplied on every transition.

Scene shutdown removes keyboard/pointer handlers, blur listeners, timers, tweens, physics objects, and combat resources. React unmount destroys Phaser. Pause stops physics, simulation timers, animations, AI, and gameplay input; forms remain operable. Browser blur and hidden tabs relinquish control. Input latches preserve brief action presses across frame boundaries, while UI focus prevents typing from becoming movement/fire.

Maps combine original raster art with Tiled collision objects and typed world/interaction exports. Geometry, obstacle paths, enemy state transitions, weapon timing, and hit-stop timing are separated from the scene. Bullet objects are pooled. Training and combat share systems while keeping resource authority distinct.

## Implemented API

All mutations require an `Idempotency-Key` header. Successful mutations return `MutationResult = { state: StateSnapshot, reward?: RewardClaim }`. Reads return the indicated DTO. Routes validate strict inputs and never accept client reward amounts.

| Method and route | Contract |
| --- | --- |
| `GET /api/health` | Health response |
| `GET /api/rules` | Server reward definitions for display |
| `GET /api/state` | Revisioned tasks, receipts, player, active attempt, progression, tutorial, dialogue history, settings |
| `GET /api/tasks` | Task list |
| `POST /api/tasks` | Create title/description/difficulty/optional deadline |
| `PATCH /api/tasks/:id` | Edit supplied task fields without applying creation defaults |
| `POST /api/tasks/:id/complete` | Complete and issue the first eligible reward atomically |
| `POST /api/tasks/:id/reopen` | Reopen without resetting reward history |
| `DELETE /api/tasks/:id` | Delete task; retain earned resources and receipt |
| `GET /api/player` | Authoritative ammunition, XP, deaths, consecutive deaths |
| `POST /api/missions/start` | `{ missionId: 'first-shift', ammo }`; reserve inventory and create attempt |
| `POST /api/missions/:id/shots` | `{ count: 1 }`; commit one reserved round |
| `POST /api/missions/:id/finish` | `{ outcome: 'dead' | 'cleared' | 'abandoned', stats }`; settle/refund once |
| `GET /api/dialogue/next` | `{ next, history }` after eligibility/priority/cooldown checks |
| `POST /api/dialogue/:id/acknowledge` | Persist answered/ignored history |
| `GET /api/settings`, `PATCH /api/settings` | Read/patch audio and accessibility/effect preferences |
| `PATCH /api/tutorial` | Persist valid cursor/completed/skipped fields; completion/skip unlocks mission |
| `POST /api/game/reset` | Reset gameplay/tutorial progression/history, preserving tasks/resources/receipts/settings |

Errors use `{ error: { code, message, requestId } }`. Invalid input is 400, absent entities 404, and resource/state/idempotency conflicts 409. Unexpected failures return a safe 500 with a retry instruction and internal request-correlated logging. Unknown API paths never return the SPA HTML.

## SQLite, migrations, and transactions

The schema contains `tasks`, `reward_claims`, `player_state`, `mission_progress`, `mission_attempts`, `tutorial_progress`, `dialogue_history`, `settings`, `state_meta`, `idempotency_operations`, and `resource_ledger`. Drizzle performs domain queries and updates over better-sqlite3. A checksum-tracked versioned SQL migration initializes the database; startup rejects an altered applied migration or a schema newer than this server.

Connections enable WAL, foreign keys, a 5-second busy timeout, and FULL synchronous durability. Resource mutations use synchronous immediate SQLite transactions. Database CHECK constraints prevent negative balances and invalid reserved/spent relationships; a partial unique index permits only one active mission attempt.

Task completion updates status, inserts a unique receipt keyed by task ID, credits server-defined resources, records the ledger event, increments the snapshot revision, and stores the idempotent response in one transaction. Easy/normal/hard rewards are 3/6/12 ammunition and 50/100/200 XP. Claims survive physical task deletion and reopening. Recompletion cannot reward twice, including concurrent requests.

Idempotency keys bind a canonical payload fingerprint to method/path scope. The committed response is persisted in the same transaction. A retry returns that exact response without applying a second effect; different input/scope with the same key returns 409. Failed transactions leave no successful receipt. Receipts currently have no expiry/pruning policy.

## Ammunition reservation, shots, and settlement

Mission start checks the tutorial unlock, available balance, and absence of another active attempt. It conditionally debits selected inventory, records the reservation, and persists `reserved`, `spent = 0`, status, and timestamps. Carrying zero is valid for melee.

A shot succeeds only for an active attempt with `spent < reserved`. The transaction increments `spent` before gameplay creates the effective shot. Retries preserve their operation identity. The browser magazine/reserve are simulation projections; SQLite's committed counters determine what can be refunded. Reload never writes an inventory credit.

Finish validates authoritative shot count, bounded statistics, `hits <= shotsFired`, `meleeKills <= kills`, `kills <= hits + meleeKills`, and six kills for a clear. It atomically changes the attempt status, records statistics, credits only `reserved − spent`, and stores the retry response. Death increments death statistics; victory increments mission completions/best time and resets the death streak. Neither changes real tasks or awards combat resources.

State snapshots expose only the active attempt; finished attempts remain durable for history/dialogue. Refresh/restart leaves reservations intact. The client displays recovery, then explicitly abandons using the persisted spent count and returns to the apartment. GET never settles or refunds. If a response is lost, retry/reconcile before another effect. Outcomes are client-observed and validated against resource/counter constraints; the local MVP does not run a server-authoritative physics simulation.

## Synchronization and failures

Every mutation response has a monotonically advanced snapshot revision; the UI rejects older snapshots arriving late. Exact idempotency replays may contain an older revision and must not overwrite newer state. The API adapter retains pending operation keys through transient failures in memory/session storage, retries the same operation, and exposes persistent failures rather than inventing success.

`useSession` serializes tutorial and settings mutations and coordinates scene entry, recovery, and settlement. Failed settlement retains a retry surface and terminal access. Offline durable task queues are not implemented: input can remain available, but persistence is not reported until the backend commits.

Tutorial progression, skip/completion, settings, and acknowledged/ignored dialogue IDs persist in SQLite. Tutorial calls take priority; contextual calls have once-per-ID history and a 60-second global acknowledgement cooldown. Training starts with 36 temporary simulation-only rounds and never calls persistent shot/reward operations.

## Verification and integration

Vitest covers pure gameplay/narrative logic and API integration against temporary real SQLite databases. Playwright uses actual Chromium, real client/server routes, unique temporary profiles, and separate ports. Browser scenarios record screenshots/traces and do not gain gameplay outcomes through hidden test APIs.

The orchestrator reviews shared contracts and dependencies, assigns one writer per file, integrates changes, and runs affected checks. Passing a database test does not establish browser behavior or visual quality. Read [testing rules](../.agents/rules/testing.md), [TASKS.md](TASKS.md), and [VERIFICATION.md](VERIFICATION.md) for actual acceptance status and remaining evidence.
